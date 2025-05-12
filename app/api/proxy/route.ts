import { type NextRequest, NextResponse } from "next/server"

// Flask API base URL
const FLASK_API_URL = "http://127.0.0.1:5000"

// This is a proxy API route that forwards requests to the Flask backend
export async function GET(request: NextRequest) {
  try {
    // Extract the path that comes after /api/proxy
    const requestPath = request.nextUrl.pathname

    // Remove the /api/proxy prefix but ensure we keep the /api/ prefix for Flask
    // If the path is just /api/proxy, we'll forward to the Flask root
    let flaskPath = requestPath.replace(/^\/api\/proxy/, "")

    // If the path doesn't already start with /api, add it
    // This ensures Flask receives requests with the /api prefix it expects
    if (!flaskPath.startsWith("/api") && flaskPath !== "") {
      flaskPath = `/api${flaskPath}`
    }

    // Get search params and convert to string
    const searchParams = request.nextUrl.searchParams.toString()
    const queryString = searchParams ? `?${searchParams}` : ""

    // Construct the full URL to the Flask backend
    const flaskUrl = `${FLASK_API_URL}${flaskPath}${queryString}`

    console.log(`[Proxy] Forwarding GET request to Flask: ${flaskUrl}`)

    // Forward the request to the Flask backend
    const response = await fetch(flaskUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        // Forward any authorization headers
        ...(request.headers.has("Authorization")
          ? { Authorization: request.headers.get("Authorization") as string }
          : {}),
      },
    })

    // Log the response status
    console.log(`[Proxy] Received response from Flask: ${response.status} ${response.statusText}`)

    // Check if response is JSON
    const contentType = response.headers.get("content-type")
    if (contentType && contentType.includes("application/json")) {
      // Get the response data as JSON
      const data = await response.json()
      console.log(`[Proxy] Received JSON response from Flask backend for ${flaskPath}`)

      // Return the response data
      return NextResponse.json(data)
    } else {
      // Get the response data as text
      const text = await response.text()
      console.log(`[Proxy] Received text response from Flask backend for ${flaskPath}: ${text}`)

      // Return the response data as text
      return new NextResponse(text, {
        status: response.status,
        headers: {
          "Content-Type": contentType || "text/plain",
        },
      })
    }
  } catch (error) {
    console.error("[Proxy] Error forwarding request to Flask backend:", error)

    return NextResponse.json(
      {
        error: "Failed to connect to Flask backend",
        details: error instanceof Error ? error.message : "Unknown error",
        path: request.nextUrl.pathname,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Extract the path that comes after /api/proxy
    const requestPath = request.nextUrl.pathname

    // Remove the /api/proxy prefix but ensure we keep the /api/ prefix for Flask
    // If the path is just /api/proxy, we'll forward to the Flask root
    let flaskPath = requestPath.replace(/^\/api\/proxy/, "")

    // If the path doesn't already start with /api, add it
    // This ensures Flask receives requests with the /api prefix it expects
    if (!flaskPath.startsWith("/api") && flaskPath !== "") {
      flaskPath = `/api${flaskPath}`
    }

    // Get search params and convert to string
    const searchParams = request.nextUrl.searchParams.toString()
    const queryString = searchParams ? `?${searchParams}` : ""

    // Construct the full URL to the Flask backend
    const flaskUrl = `${FLASK_API_URL}${flaskPath}${queryString}`

    console.log(`[Proxy] Forwarding POST request to Flask: ${flaskUrl}`)

    // Get the request body
    let body = null
    try {
      body = await request.json()
      console.log(`[Proxy] Request body:`, body)
    } catch (e) {
      // If the request doesn't have a JSON body, continue without it
      console.log(`[Proxy] No JSON body in request`)
    }

    // Forward the request to the Flask backend
    const response = await fetch(flaskUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        // Forward any authorization headers
        ...(request.headers.has("Authorization")
          ? { Authorization: request.headers.get("Authorization") as string }
          : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })

    // Log the response status
    console.log(`[Proxy] Received response from Flask: ${response.status} ${response.statusText}`)

    // Check if response is JSON
    const contentType = response.headers.get("content-type")
    if (contentType && contentType.includes("application/json")) {
      // Get the response data as JSON
      const data = await response.json()
      console.log(`[Proxy] Received JSON response from Flask backend for ${flaskPath}`)

      // Return the response data
      return NextResponse.json(data)
    } else {
      // Get the response data as text
      const text = await response.text()
      console.log(`[Proxy] Received text response from Flask backend for ${flaskPath}: ${text}`)

      // Return the response data as text
      return new NextResponse(text, {
        status: response.status,
        headers: {
          "Content-Type": contentType || "text/plain",
        },
      })
    }
  } catch (error) {
    console.error("[Proxy] Error forwarding POST request to Flask backend:", error)

    return NextResponse.json(
      {
        error: "Failed to connect to Flask backend",
        details: error instanceof Error ? error.message : "Unknown error",
        path: request.nextUrl.pathname,
      },
      { status: 500 },
    )
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400", // 24 hours
    },
  })
}
