import { type NextRequest, NextResponse } from "next/server"
import { MongoClient } from "mongodb"

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

// Helper function to check if a restaurant has valid emails
function hasValidEmail(restaurant: any): boolean {
  // If email doesn't exist, return false
  if (!restaurant.email) return false

  // If email is an array, check if it has at least one non-N/A value
  if (Array.isArray(restaurant.email)) {
    return restaurant.email.some(
      (email) => email && email !== "N/A" && email !== "n/a" && email.trim() !== "" && email.includes("@"),
    )
  }

  // If email is a string, check if it's not N/A and is a valid format
  return (
    restaurant.email !== "N/A" &&
    restaurant.email !== "n/a" &&
    restaurant.email.trim() !== "" &&
    restaurant.email.includes("@")
  )
}

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
      const database = client.db(db)

      // Create filter based on query
      let filter: any = {}

      if (query) {
        // Try to convert query to number for phonenumber search
        let phoneQuery = null
        if (!isNaN(Number(query))) {
          phoneQuery = Number(query)
        }

        filter = {
          $or: [
            { businessname: { $regex: query, $options: "i" } },
            // Enhanced phone number search
            {
              $or: [
                ...(phoneQuery !== null ? [{ phonenumber: phoneQuery }] : []),
                { phonenumber: { $regex: query.replace(/[^0-9]/g, ""), $options: "i" } },
              ],
            },
            { email: { $regex: query, $options: "i" } },
            { subsector: { $regex: query, $options: "i" } },
            { address: { $regex: query, $options: "i" } },
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

      // Get total count
      const totalCount = await database.collection(collection).countDocuments(filter)

      // Calculate pagination
      const skip = (page - 1) * limit
      const totalPages = Math.ceil(totalCount / limit)

      // Get paginated results
      const results = await database
        .collection(collection)
        .find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .toArray()

      // Convert MongoDB documents to plain objects
      const serializedResults = results.map((item) => ({
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

      // Return mock data for development if MongoDB connection fails
      if (process.env.NODE_ENV === "development") {
        return NextResponse.json({
          results: [],
          pagination: {
            total: 0,
            pages: 0,
            currentPage: page,
            limit,
          },
        })
      } else {
        throw error // Re-throw in production
      }
    }
  } catch (error) {
    console.error("Error fetching results:", error)
    return NextResponse.json({ error: "Failed to fetch results" }, { status: 500 })
  }
}
