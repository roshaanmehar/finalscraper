import { type NextRequest, NextResponse } from "next/server"
import { runScrapeWorkflow, checkDatabaseExists } from "@/server/scrape-controller.js"

// MongoDB connection setup
if (!process.env.MONGODB_URI) {
  console.warn("MongoDB URI not found in environment variables. Using mock data for development.")
}

const uri = (process.env.MONGODB_URI as string) || "mongodb://localhost:27017"
const options = {}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const cityName = searchParams.get("city") || ""
  const postcodeArea = searchParams.get("postcode_area") || ""

  if (!cityName || !postcodeArea) {
    return NextResponse.json({ error: "City name and postcode area are required" }, { status: 400 })
  }

  try {
    // Check if database exists using the scrape controller
    const dbExists = await checkDatabaseExists(cityName)

    console.log(`API route: Database check for ${cityName}: ${dbExists ? "EXISTS" : "DOES NOT EXIST"}`)

    return NextResponse.json({
      exists: dbExists,
      message: dbExists ? `Database for ${cityName} already exists` : `Database for ${cityName} does not exist`,
      nextAction: dbExists ? "search" : "scrape",
    })
  } catch (error) {
    console.error("Error checking database:", error)
    // If there's an error, assume the database doesn't exist so we can start the scrape
    return NextResponse.json({
      exists: false,
      message: `Error checking database for ${cityName}, assuming it does not exist`,
      nextAction: "scrape",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { cityName, postcodeArea, keyword } = await request.json()

    if (!cityName || !postcodeArea) {
      return NextResponse.json({ error: "City name and postcode area are required" }, { status: 400 })
    }

    console.log(`Starting scrape workflow for ${cityName} (${postcodeArea}) with keyword ${keyword || "restaurant"}`)

    // Start the scraping workflow (non-blocking)
    // The function will run in the background and won't block the response
    runScrapeWorkflow(cityName, postcodeArea, keyword || "restaurant")
      .then((result) => console.log(`Scrape workflow completed:`, result))
      .catch((err) => console.error(`Scrape workflow error:`, err))

    return NextResponse.json({
      success: true,
      message: `Scraping process started for ${cityName}`,
      status: "running",
    })
  } catch (error) {
    console.error("Error initiating scrape:", error)
    return NextResponse.json({ error: "Failed to initiate scrape process" }, { status: 500 })
  }
}
