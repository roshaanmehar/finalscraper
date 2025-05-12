import { type NextRequest, NextResponse } from "next/server"
import { getScraperStatus } from "@/server/scrape-controller.js"

export async function GET(request: NextRequest) {
  try {
    const status = getScraperStatus()
    return NextResponse.json(status)
  } catch (error) {
    console.error("Error getting scraper status:", error)
    return NextResponse.json({ error: "Failed to get scraper status" }, { status: 500 })
  }
}
