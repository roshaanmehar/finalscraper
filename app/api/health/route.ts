import { NextResponse } from "next/server"

// This is a simple health check endpoint for the Next.js API
export async function GET() {
  return NextResponse.json({ status: "ok", message: "Next.js API is running" })
}
