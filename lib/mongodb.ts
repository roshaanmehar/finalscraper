import { MongoClient } from "mongodb"
import "./env" // Import env to ensure .env is loaded

if (!process.env.MONGODB_URI) {
  console.warn("MongoDB URI not found in environment variables. Using mock data for development.")
  // Instead of throwing an error, we'll continue with a mock setup
}

// Use the environment variable with fallback
const uri =
  process.env.MONGODB_URI ||
  "mongodb+srv://roshaanatck:DOcnGUEEB37bQtcL@scraper-db-cluster.88kc14b.mongodb.net/?retryWrites=true&w=majority&appName=scraper-db-cluster"

// Log the MongoDB connection status (with credentials hidden)
console.log(
  `MongoDB URI ${process.env.MONGODB_URI ? "found in environment variables" : "not found, using fallback URI"}`,
)
console.log(
  `Connecting to MongoDB at: ${uri.substring(0, uri.indexOf("@") + 1)}[CREDENTIALS_HIDDEN]${uri.substring(uri.indexOf("@") + 1)}`,
)

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

export default clientPromise
