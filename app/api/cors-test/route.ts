import { type NextRequest, NextResponse } from "next/server"

// Flask API base URL
const FLASK_API_URL = "http://127.0.0.1:5000"

// This endpoint tests CORS connectivity with the Flask backend
export async function GET(request: NextRequest) {
  try {
    // Test direct connection to Flask
    console.log("[CORS Test] Testing direct connection to Flask backend...")

    const directResponse = await fetch(`${FLASK_API_URL}/health`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    })

    if (!directResponse.ok) {
      throw new Error(`Direct connection failed with status: ${directResponse.status}`)
    }

    const directData = await directResponse.json()

    // Test proxy connection to Flask
    console.log("[CORS Test] Testing proxy connection to Flask backend...")

    const proxyResponse = await fetch(`${request.nextUrl.origin}/api/proxy/health`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    })

    if (!proxyResponse.ok) {
      throw new Error(`Proxy connection failed with status: ${proxyResponse.status}`)
    }

    const proxyData = await proxyResponse.json()

    return NextResponse.json(
      {
        success: true,
        message: "CORS test successful",
        directConnection: {
          success: true,
          data: directData,
        },
        proxyConnection: {
          success: true,
          data: proxyData,
        },
        corsConfig: {
          nextJsMiddleware: "Enabled",
          proxyHeaders: "Enabled",
        },
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      },
    )
  } catch (error) {
    console.error("[CORS Test] Error testing CORS connectivity:", error)

    return NextResponse.json(
      {
        success: false,
        message: "CORS test failed",
        error: error instanceof Error ? error.message : "Unknown error",
        corsConfig: {
          nextJsMiddleware: "Enabled",
          proxyHeaders: "Enabled",
        },
        troubleshooting: {
          checkFlaskRunning: "Ensure Flask is running on http://127.0.0.1:5000",
          checkFlaskCors: "Ensure Flask has CORS enabled (see documentation below)",
          checkNetworkTab: "Check browser Network tab for CORS errors",
        },
        flaskCorsSetup: `
# Add this to your Flask app:
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # This enables CORS for all routes

# Install with: pip install flask-cors
      `,
      },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      },
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
