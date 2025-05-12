// This file contains helper functions for interacting with the Flask API

const FLASK_API_URL = "http://127.0.0.1:5000"

// Check if the Flask API is running
async function checkFlaskHealth() {
  try {
    const response = await fetch(`${FLASK_API_URL}/health`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    })

    return response.ok
  } catch (error) {
    console.error("Error checking Flask health:", error)
    return false
  }
}

// Export the functions
module.exports = {
  FLASK_API_URL,
  checkFlaskHealth,
}
