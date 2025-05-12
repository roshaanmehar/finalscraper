"use server"

import { MongoClient } from "mongodb"
import { cache } from "react"
import type { City } from "./types"

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

// In-memory cache for city searches
const cityCache = new Map<string, { cities: City[]; timestamp: number }>()
const CACHE_TTL = 1000 * 60 * 60 // 1 hour cache TTL

// Cached function to search cities
export const searchCities = cache(async (query: string): Promise<City[]> => {
  // Normalize query for consistent caching
  const normalizedQuery = query.trim().toLowerCase()

  // Return early if query is too short
  if (normalizedQuery.length < 2) {
    return []
  }

  // Check cache first
  const cacheKey = `city:${normalizedQuery}`
  const cachedResult = cityCache.get(cacheKey)
  const now = Date.now()

  if (cachedResult && now - cachedResult.timestamp < CACHE_TTL) {
    console.log(`Cache hit for "${normalizedQuery}"`)
    return cachedResult.cities
  }

  console.log(`Cache miss for "${normalizedQuery}", fetching from MongoDB...`)

  try {
    const client = await clientPromise
    const db = client.db("Local") // Database name from the screenshot

    // Create search filter for city names
    const filter = {
      area_covered: { $regex: normalizedQuery, $options: "i" },
    }

    // Get matching cities, limit to 10 for performance
    const cities = await db.collection("Cities.cities").find(filter).limit(10).toArray()

    // Convert MongoDB documents to plain objects
    const serializedCities = cities.map((city) => ({
      ...city,
      _id: city._id.toString(),
    }))

    // Store in cache
    cityCache.set(cacheKey, {
      cities: serializedCities as City[],
      timestamp: now,
    })

    // Clean up old cache entries periodically
    if (Math.random() < 0.1) {
      // 10% chance to clean up on each request
      cleanupCache()
    }

    return serializedCities as City[]
  } catch (error) {
    console.error("Error searching cities in MongoDB:", error)
    return []
  }
})

// Helper function to clean up expired cache entries
function cleanupCache() {
  const now = Date.now()
  for (const [key, value] of cityCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      cityCache.delete(key)
    }
  }
}
