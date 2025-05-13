import { config } from "dotenv"

// Load environment variables from .env file
config()

// Log environment variables loading status
if (process.env.MONGODB_URI) {
  console.log("Environment variables loaded successfully")
} else {
  console.warn("MONGODB_URI not found in environment variables")
}
