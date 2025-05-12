import { type NextRequest, NextResponse } from "next/server"
import { getAllRestaurants } from "@/app/results/actions"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("query") || ""
  const sortBy = searchParams.get("sort") || "recent"

  try {
    const restaurants = await getAllRestaurants(query, sortBy)
    return NextResponse.json({ restaurants })
  } catch (error) {
    console.error("Error in export API:", error)
    return NextResponse.json({ error: "Failed to export restaurants" }, { status: 500 })
  }
}
