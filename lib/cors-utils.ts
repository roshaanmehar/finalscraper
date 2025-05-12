// Utility functions for CORS handling

/**
 * Adds CORS headers to a response object
 */
export function addCorsHeaders(headers: Headers): Headers {
  headers.set("Access-Control-Allow-Origin", "*")
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
  return headers
}

/**
 * Creates a preflight response for OPTIONS requests
 */
export function createPreflightResponse() {
  const headers = new Headers()
  addCorsHeaders(headers)
  headers.set("Access-Control-Max-Age", "86400") // 24 hours

  return new Response(null, {
    status: 204,
    headers,
  })
}

/**
 * Tests if a URL is accessible with CORS
 */
export async function testCorsAccess(url: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      mode: "cors", // Explicitly request CORS mode
    })

    if (response.ok) {
      return { success: true, message: "CORS access successful" }
    } else {
      return {
        success: false,
        message: `CORS access failed with status: ${response.status}`,
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `CORS access error: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}
