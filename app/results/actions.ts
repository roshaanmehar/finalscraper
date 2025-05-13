"use server"

import { MongoClient } from "mongodb"

export type Restaurant = {
  _id: string
  businessname: string
  phonenumber?: number | string
  address?: string
  email?: string | string[]
  website?: string
  stars?: string
  numberofreviews?: number
  subsector?: string
  scraped_at?: Date | string | null
  emailstatus?: string
  emailscraped_at?: Date | string | null
}

// MongoDB connection setup
if (!process.env.MONGODB_URI) {
  console.warn("MongoDB URI not found in environment variables. Using mock data for development.")
  // Instead of throwing an error, we'll continue with a mock setup
}

const uri =
  (process.env.MONGODB_URI as string) ||
  "mongodb+srv://roshaanatck:DOcnGUEEB37bQtcL@scraper-db-cluster.88kc14b.mongodb.net/?retryWrites=true&w=majority&appName=scraper-db-cluster"
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

// Update the hasValidEmail function to be less strict and provide better debugging
function hasValidEmail(restaurant: any): boolean {
  // If email doesn't exist, return false
  if (!restaurant.email) {
    console.log(`Restaurant ${restaurant.businessname}: No email found`)
    return false
  }

  // Function to check if an email is valid with detailed logging
  const isValidEmailFormat = (email: string) => {
    // Basic email format validation
    if (!email || email === "N/A" || email === "n/a" || email.trim() === "") {
      console.log(`Email "${email}" rejected: Empty or N/A`)
      return false
    }

    // Check for @ and . characters
    if (!email.includes("@") || !email.includes(".")) {
      console.log(`Email "${email}" rejected: Missing @ or .`)
      return false
    }

    // Check for excluded domains - less strict now
    const excludedDomains = ["sentry", "wixpress"] // Removed "wix" as it might be legitimate
    const lowerEmail = email.toLowerCase()
    if (excludedDomains.some((domain) => lowerEmail.includes(domain))) {
      console.log(`Email "${email}" rejected: Contains excluded domain`)
      return false
    }

    // Accept all emails with @ and . that aren't excluded
    return true
  }

  // If email is an array, check if it has at least one valid email
  if (Array.isArray(restaurant.email)) {
    const validEmails = restaurant.email.filter(isValidEmailFormat)
    if (validEmails.length === 0) {
      console.log(`Restaurant ${restaurant.businessname}: No valid emails in array [${restaurant.email.join(", ")}]`)
    } else {
      console.log(`Restaurant ${restaurant.businessname}: Found ${validEmails.length} valid emails`)
    }
    return validEmails.length > 0
  }

  // If email is a string, check if it's valid
  const isValid = isValidEmailFormat(restaurant.email)
  console.log(`Restaurant ${restaurant.businessname}: Email "${restaurant.email}" is ${isValid ? "valid" : "invalid"}`)
  return isValid
}

// Update the hasValidPhoneNumber function to require at least 10 digits:
function hasValidPhoneNumber(restaurant: any): boolean {
  if (!restaurant.phonenumber) {
    console.log(`Restaurant ${restaurant.businessname}: No phone number found`)
    return false
  }

  // Convert to string and remove non-digit characters
  const phoneStr = String(restaurant.phonenumber).replace(/\D/g, "")

  // Accept phone numbers with at least 10 digits (stricter validation)
  const isValid = phoneStr.length >= 10
  if (!isValid) {
    console.log(
      `Restaurant ${restaurant.businessname}: Phone number "${restaurant.phonenumber}" is too short (less than 10 digits)`,
    )
  }
  return isValid
}

// Update the getRestaurants function to filter by valid phone numbers
export async function getRestaurants(page = 1, limit = 8) {
  try {
    console.log("Connecting to MongoDB...")
    const client = await clientPromise
    console.log("Connected to MongoDB")

    const db = client.db("Leeds") // Database name specified here

    // Create a more comprehensive filter for valid emails
    const filter = {
      email: {
        $exists: true,
        $ne: null,
        $ne: [],
        $ne: "N/A",
        $ne: "n/a",
      },
      phonenumber: { $exists: true },
    }

    // Calculate skip value for pagination
    const skip = (page - 1) * limit

    console.log(`Fetching restaurants with valid emails, skip=${skip}, limit=${limit}`)

    // Get all restaurants first to filter them properly
    const allRestaurants = await db.collection("restaurants").find(filter).sort({ scraped_at: -1 }).toArray()

    // Filter restaurants with valid emails, valid phone numbers, and exclude unwanted domains
    const validRestaurants = allRestaurants.filter(
      (restaurant) =>
        hasValidEmail(restaurant) && hasValidPhoneNumber(restaurant) && !isExcludedDomain(restaurant.website),
    )

    // Get total count for pagination
    const totalCount = validRestaurants.length
    console.log(`Total restaurants with valid emails and phone numbers: ${totalCount}`)

    // Apply pagination manually
    const paginatedRestaurants = validRestaurants.slice(skip, skip + limit)

    console.log(`Fetched ${paginatedRestaurants.length} restaurants from MongoDB`)

    // Convert MongoDB documents to plain objects
    const serializedRestaurants = paginatedRestaurants.map((restaurant) => ({
      ...restaurant,
      _id: restaurant._id.toString(),
      scraped_at: restaurant.scraped_at ? new Date(restaurant.scraped_at).toISOString() : null,
      emailscraped_at: restaurant.emailscraped_at ? new Date(restaurant.emailscraped_at).toISOString() : null,
    }))

    return {
      restaurants: serializedRestaurants as Restaurant[],
      pagination: {
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        currentPage: page,
        limit,
      },
    }
  } catch (error) {
    console.error("Error fetching restaurants from MongoDB:", error)
    return {
      restaurants: [],
      pagination: {
        total: 0,
        pages: 0,
        currentPage: page,
        limit,
      },
    }
  }
}

// Update the searchRestaurants function to filter by valid phone numbers
export async function searchRestaurants(query: string, page = 1, limit = 8) {
  try {
    console.log(`Searching for "${query}" in MongoDB...`)
    const client = await clientPromise

    // Check if we can connect to MongoDB
    if (!client) {
      console.error("Failed to connect to MongoDB client")
      return {
        restaurants: [],
        pagination: {
          total: 0,
          pages: 0,
          currentPage: page,
          limit,
        },
      }
    }

    const db = client.db("Leeds") // Database name specified here

    // Check if the database exists
    try {
      await db.command({ ping: 1 })
      console.log("Successfully connected to the Leeds database")
    } catch (dbError) {
      console.error("Error connecting to Leeds database:", dbError)
      return {
        restaurants: [],
        pagination: {
          total: 0,
          pages: 0,
          currentPage: page,
          limit,
        },
      }
    }

    // Check if the restaurants collection exists
    const collections = await db.listCollections({ name: "restaurants" }).toArray()
    if (collections.length === 0) {
      console.error("Restaurants collection not found in Leeds database")
      return {
        restaurants: [],
        pagination: {
          total: 0,
          pages: 0,
          currentPage: page,
          limit,
        },
      }
    }

    console.log("Restaurants collection found in Leeds database")

    // Try to convert query to number for phonenumber search
    let phoneQuery = null
    if (!isNaN(Number(query))) {
      phoneQuery = Number(query)
    }

    // Create search filter with improved phone number search
    // Only include restaurants that have emails
    const filter = {
      $and: [
        {
          email: {
            $exists: true,
            $ne: null,
            $ne: [],
            $ne: "N/A",
            $ne: "n/a",
          },
          phonenumber: { $exists: true },
        },
        {
          $or: [
            { businessname: { $regex: query, $options: "i" } },
            // Enhanced phone number search to handle both number and string types
            // and partial matches
            {
              $or: [
                // Try exact match if query is a valid number
                ...(phoneQuery !== null ? [{ phonenumber: phoneQuery }] : []),
                // Try string match (for phone numbers stored as strings)
                { phonenumber: { $regex: query.replace(/[^0-9]/g, ""), $options: "i" } },
                // Try partial match (for when user enters part of phone number)
                {
                  phonenumber: {
                    $regex: query
                      .replace(/[^0-9]/g, "")
                      .split("")
                      .join(".*"),
                    $options: "i",
                  },
                },
              ],
            },
            { email: { $regex: query, $options: "i" } },
            { subsector: { $regex: query, $options: "i" } },
          ],
        },
      ],
    }

    console.log("Search filter:", JSON.stringify(filter))

    // Get all matching restaurants first to filter them properly
    let allMatchingRestaurants = []
    try {
      allMatchingRestaurants = await db.collection("restaurants").find(filter).sort({ scraped_at: -1 }).toArray()
      console.log(`Found ${allMatchingRestaurants.length} matching restaurants in initial query`)
    } catch (queryError) {
      console.error("Error querying restaurants:", queryError)
      return {
        restaurants: [],
        pagination: {
          total: 0,
          pages: 0,
          currentPage: page,
          limit,
        },
      }
    }

    // Log a sample of the raw results for debugging
    if (allMatchingRestaurants.length > 0) {
      console.log("Sample raw restaurant data:", {
        _id: allMatchingRestaurants[0]._id.toString(),
        businessname: allMatchingRestaurants[0].businessname,
        email: allMatchingRestaurants[0].email,
        phonenumber: allMatchingRestaurants[0].phonenumber,
      })
    }

    // Filter restaurants with valid emails, valid phone numbers, and exclude unwanted domains
    const validRestaurants = allMatchingRestaurants.filter(
      (restaurant) =>
        hasValidEmail(restaurant) && hasValidPhoneNumber(restaurant) && !isExcludedDomain(restaurant.website),
    )

    console.log(`After filtering, ${validRestaurants.length} restaurants have valid emails and phone numbers`)

    // Get total count for pagination
    const totalCount = validRestaurants.length

    // Apply pagination manually
    const skip = (page - 1) * limit
    const paginatedRestaurants = validRestaurants.slice(skip, skip + limit)

    console.log(`Returning ${paginatedRestaurants.length} restaurants for page ${page}`)

    // Convert MongoDB documents to plain objects
    const serializedRestaurants = paginatedRestaurants.map((restaurant) => ({
      ...restaurant,
      _id: restaurant._id.toString(),
      scraped_at: restaurant.scraped_at ? new Date(restaurant.scraped_at).toISOString() : null,
      emailscraped_at: restaurant.emailscraped_at ? new Date(restaurant.emailscraped_at).toISOString() : null,
    }))

    return {
      restaurants: serializedRestaurants as Restaurant[],
      pagination: {
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        currentPage: page,
        limit,
      },
    }
  } catch (error) {
    console.error("Error searching restaurants in MongoDB:", error)
    return {
      restaurants: [],
      pagination: {
        total: 0,
        pages: 0,
        currentPage: page,
        limit,
      },
    }
  }
}

// Update the getAllRestaurants function to filter by valid phone numbers
export async function getAllRestaurants(query = "", sortBy = "recent") {
  try {
    console.log(`Fetching all restaurants matching "${query}" for export...`)
    const client = await clientPromise
    const db = client.db("Leeds") // Database name specified here

    // Try to convert query to number for phonenumber search
    let phoneQuery = null
    if (!isNaN(Number(query))) {
      phoneQuery = Number(query)
    }

    // Create search filter with improved phone number search
    // Only include restaurants that have emails
    const filter = query
      ? {
          $and: [
            {
              email: {
                $exists: true,
                $ne: null,
                $ne: [],
                $ne: "N/A",
                $ne: "n/a",
              },
              phonenumber: { $exists: true },
            },
            {
              $or: [
                { businessname: { $regex: query, $options: "i" } },
                // Enhanced phone number search to handle both number and string types
                // and partial matches
                {
                  $or: [
                    // Try exact match if query is a valid number
                    ...(phoneQuery !== null ? [{ phonenumber: phoneQuery }] : []),
                    // Try string match (for phone numbers stored as strings)
                    { phonenumber: { $regex: query.replace(/[^0-9]/g, ""), $options: "i" } },
                    // Try partial match (for when user enters part of phone number)
                    {
                      phonenumber: {
                        $regex: query
                          .replace(/[^0-9]/g, "")
                          .split("")
                          .join(".*"),
                        $options: "i",
                      },
                    },
                  ],
                },
                { email: { $regex: query, $options: "i" } },
                { subsector: { $regex: query, $options: "i" } },
              ],
            },
          ],
        }
      : {
          email: {
            $exists: true,
            $ne: null,
            $ne: [],
            $ne: "N/A",
            $ne: "n/a",
          },
          phonenumber: { $exists: true },
        }

    // Determine sort order
    let sortOptions = {}
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

    // Get all restaurants that match the filter
    const allRestaurants = await db.collection("restaurants").find(filter).sort(sortOptions).toArray()

    // Filter restaurants with valid emails, valid phone numbers, and exclude unwanted domains
    const validRestaurants = allRestaurants.filter(
      (restaurant) =>
        hasValidEmail(restaurant) && hasValidPhoneNumber(restaurant) && !isExcludedDomain(restaurant.website),
    )

    console.log(`Found ${validRestaurants.length} restaurants with valid emails and phone numbers for export`)

    // Convert MongoDB documents to plain objects
    const serializedRestaurants = validRestaurants.map((restaurant) => ({
      ...restaurant,
      _id: restaurant._id.toString(),
      scraped_at: restaurant.scraped_at ? new Date(restaurant.scraped_at).toISOString() : null,
      emailscraped_at: restaurant.emailscraped_at ? new Date(restaurant.emailscraped_at).toISOString() : null,
    }))

    return serializedRestaurants as Restaurant[]
  } catch (error) {
    console.error("Error fetching all restaurants for export:", error)
    return []
  }
}
