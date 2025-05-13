import { type NextRequest, NextResponse } from "next/server"
import { MongoClient } from "mongodb"

// Helper function to check if a website domain should be excluded
function isExcludedDomain(website: string | undefined): boolean {
  if (!website) return false

  const excludedDomains = [
    "wix.com",
    "sentry.com",
    "squarespace.com",
    "weebly.com",
    "wordpress.com",
    "shopify.com",
    "godaddy.com",
    "webflow.com",
    "jimdo.com",
    "strikingly.com",
  ]

  const websiteLower = website.toLowerCase()
  return excludedDomains.some((domain) => websiteLower.includes(domain))
}

// MongoDB connection setup
if (!process.env.MONGODB_URI) {
  console.warn("MongoDB URI not found in environment variables. Using mock data for development.")
}

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017"
const options = {}

let client
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options)
    globalWithMongo._mongoClientPromise = client.connect()
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

// Replace the entire GET function with this improved version
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const db = searchParams.get("db")
    const collection = searchParams.get("collection")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const sortBy = searchParams.get("sort") || "recent"
    const query = searchParams.get("query") || ""

    if (!db || !collection) {
      return NextResponse.json({ error: "Database and collection parameters are required" }, { status: 400 })
    }

    console.log(`Fetching from ${db}.${collection}, page=${page}, limit=${limit}, sort=${sortBy}, query=${query}`)

    try {
      const client = await clientPromise
      console.log(`MongoDB client connected successfully`)

      const database = client.db(db)

      // Check if collection exists
      const collections = await database.listCollections({ name: collection }).toArray()
      if (collections.length === 0) {
        console.error(`Collection ${collection} not found in database ${db}`)
        return NextResponse.json(
          {
            error: `Collection ${collection} not found in database ${db}`,
            results: [],
            pagination: { total: 0, pages: 0, currentPage: page, limit },
          },
          { status: 404 },
        )
      }

      console.log(`Collection ${collection} found in database ${db}`)

      // Create a base filter that ensures we only get documents with valid emails
      // This is the key improvement - handle both string and array emails
      const baseFilter = {
        $or: [
          // Case 1: Email is a string that's not N/A
          {
            email: {
              $type: "string",
              $ne: null,
              $ne: "N/A",
              $ne: "n/a",
              $ne: "",
              $regex: "@", // Must contain @ symbol
            },
          },
          // Case 2: Email is an array with at least one element
          {
            email: {
              $type: "array",
              $ne: [],
            },
          },
        ],
      }

      // Add search query if provided
      let filter = baseFilter
      if (query) {
        // Try to convert query to number for phonenumber search
        let phoneQuery = null
        if (!isNaN(Number(query))) {
          phoneQuery = Number(query)
        }

        filter = {
          $and: [
            baseFilter,
            {
              $or: [
                { businessname: { $regex: query, $options: "i" } },
                // Enhanced phone number search
                {
                  $or: [
                    ...(phoneQuery !== null ? [{ phonenumber: phoneQuery }] : []),
                    { phonenumber: { $regex: query.replace(/[^0-9]/g, ""), $options: "i" } },
                  ],
                },
                // Search in both string emails and array emails
                { email: { $regex: query, $options: "i" } },
                { "email.0": { $regex: query, $options: "i" } }, // Search in first element of email array
                { subsector: { $regex: query, $options: "i" } },
                { address: { $regex: query, $options: "i" } },
              ],
            },
          ],
        }
      }

      // Determine sort options
      let sortOptions: any = {}
      switch (sortBy) {
        case "name":
          sortOptions = { businessname: 1 }
          break
        case "reviews":
          sortOptions = { numberofreviews: -1 }
          break
        case "recent":
        default:
          sortOptions = { scraped_at: -1 }
          break
      }

      // Get total count of documents matching our filter
      let totalCount = 0
      try {
        totalCount = await database.collection(collection).countDocuments(filter)
        console.log(`Found ${totalCount} total documents with valid emails matching filter in ${db}.${collection}`)
      } catch (countError) {
        console.error(`Error counting documents in ${db}.${collection}:`, countError)
        totalCount = 0
      }

      // Calculate pagination
      const skip = (page - 1) * limit
      const totalPages = Math.ceil(totalCount / limit)

      // Get paginated results with more detailed error handling
      let results = []
      try {
        results = await database.collection(collection).find(filter).sort(sortOptions).skip(skip).limit(limit).toArray()
        console.log(`Retrieved ${results.length} documents with valid emails from ${db}.${collection}`)
      } catch (queryError) {
        console.error(`Error querying documents from ${db}.${collection}:`, queryError)
        results = []
      }

      // Log the raw results for debugging
      if (results.length > 0) {
        console.log(
          `Raw results from ${db}.${collection} (first 2):`,
          results.slice(0, 2).map((r) => ({
            _id: r._id.toString(),
            businessname: r.businessname,
            email: r.email,
          })),
        )
      } else {
        console.log(`No results found with valid emails in ${db}.${collection}`)
      }

      // Post-process results to ensure emails are valid
      const filteredResults = results.filter((item) => {
        // For array emails, ensure at least one has an @ symbol
        if (Array.isArray(item.email)) {
          return item.email.some((email) => email && typeof email === "string" && email.includes("@"))
        }

        // For string emails, ensure it has an @ symbol
        return item.email && typeof item.email === "string" && item.email.includes("@")
      })

      console.log(`After filtering, ${filteredResults.length} valid results remain`)

      // Convert MongoDB documents to plain objects
      const serializedResults = filteredResults.map((item) => ({
        ...item,
        _id: item._id.toString(),
        scraped_at: item.scraped_at ? new Date(item.scraped_at).toISOString() : null,
        emailscraped_at: item.emailscraped_at ? new Date(item.emailscraped_at).toISOString() : null,
      }))

      return NextResponse.json({
        results: serializedResults,
        pagination: {
          total: totalCount,
          pages: totalPages,
          currentPage: page,
          limit,
        },
      })
    } catch (error) {
      console.error("Error connecting to MongoDB:", error)

      // Return more detailed error information
      return NextResponse.json(
        {
          error: "Failed to connect to MongoDB",
          details: error instanceof Error ? error.message : "Unknown error",
          results: [],
          pagination: {
            total: 0,
            pages: 0,
            currentPage: page,
            limit,
          },
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error fetching results:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch results",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
