"use client"

import { useState, useEffect } from "react"
import { FLASK_API_URL } from "@/app/constants/api-config"

type FlaskConnectionStatus = "checking" | "connected" | "disconnected"

// Flask API base URL - changed to the specified IP address
// const FLASK_API_URL = "http://34.89.71.45:5000"

export function FlaskConnector() {
  const [status, setStatus] = useState<FlaskConnectionStatus>("checking")
  const [message, setMessage] = useState("Checking connection to Flask backend...")

  useEffect(() => {
    checkFlaskConnection()
  }, [])

  const checkFlaskConnection = async () => {
    try {
      // Direct call to Flask API
      const response = await fetch(`${FLASK_API_URL}/api/dataPS?city=test&keyword=test`)

      // Even a 404 means we're connecting to the Flask server
      if (response.ok || response.status === 404) {
        setStatus("connected")
        setMessage("Connected to Flask backend")
      } else {
        setStatus("disconnected")
        setMessage("Failed to connect to Flask backend")
      }
    } catch (error) {
      console.error("Error checking Flask connection:", error)
      setStatus("disconnected")
      setMessage(`Error connecting to Flask backend. Make sure the Flask server is running on ${FLASK_API_URL}`)
    }
  }

  return (
    <div className={`flask-connection-status ${status}`}>
      <div className="status-indicator"></div>
      <div className="status-message">{message}</div>
      {status === "disconnected" && (
        <button className="retry-button" onClick={checkFlaskConnection}>
          Retry Connection
        </button>
      )}
    </div>
  )
}
