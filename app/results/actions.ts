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

const uri = (process.env.MONGODB_URI as string) || "mongodb://localhost:27017"
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
    }

    // Calculate skip value for pagination
    const skip = (page - 1) * limit

    console.log(`Fetching restaurants with valid emails, skip=${skip}, limit=${limit}`)

    // Get all restaurants first to filter them properly
    const allRestaurants = await db.collection("restaurants").find(filter).sort({ scraped_at: -1 }).toArray()

    // Filter restaurants with valid emails
    const validEmailRestaurants = allRestaurants.filter(hasValidEmail)

    // Get total count for pagination
    const totalCount = validEmailRestaurants.length
    console.log(`Total restaurants with valid emails: ${totalCount}`)

    // Apply pagination manually
    const paginatedRestaurants = validEmailRestaurants.slice(skip, skip + limit)

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

export async function searchRestaurants(query: string, page = 1, limit = 8) {
  try {
    console.log(`Searching for "${query}" in MongoDB...`)
    const client = await clientPromise
    const db = client.db("Leeds") // Database name specified here

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
    const allMatchingRestaurants = await db.collection("restaurants").find(filter).sort({ scraped_at: -1 }).toArray()

    // Filter restaurants with valid emails
    const validEmailRestaurants = allMatchingRestaurants.filter(hasValidEmail)

    // Get total count for pagination
    const totalCount = validEmailRestaurants.length
    console.log(`Found ${totalCount} matching restaurants with valid emails`)

    // Apply pagination manually
    const skip = (page - 1) * limit
    const paginatedRestaurants = validEmailRestaurants.slice(skip, skip + limit)

    console.log(`Fetched ${paginatedRestaurants.length} restaurants from search`)

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

    // Filter restaurants with valid emails
    const validEmailRestaurants = allRestaurants.filter(hasValidEmail)

    console.log(`Found ${validEmailRestaurants.length} restaurants with valid emails for export`)

    // Convert MongoDB documents to plain objects
    const serializedRestaurants = validEmailRestaurants.map((restaurant) => ({
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
