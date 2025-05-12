"use client"

import { useState } from "react"
import Link from "next/link"

export default function CorsTestPage() {
  const [testResults, setTestResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [directTestResult, setDirectTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [flaskApiUrl, setFlaskApiUrl] = useState("http://127.0.0.1:5000")

  // Run the CORS test through the Next.js API
  const runServerTest = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/cors-test")
      const data = await response.json()
      setTestResults(data)
    } catch (error) {
      setTestResults({
        success: false,
        message: `Error running CORS test: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
    } finally {
      setLoading(false)
    }
  }

  // Run a direct browser-to-Flask test
  const runDirectTest = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${flaskApiUrl}/health`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        mode: "cors", // Explicitly request CORS mode
      })

      if (response.ok) {
        const data = await response.json()
        setDirectTestResult({
          success: true,
          message: `Direct CORS access successful: ${JSON.stringify(data)}`,
        })
      } else {
        setDirectTestResult({
          success: false,
          message: `Direct CORS access failed with status: ${response.status}`,
        })
      }
    } catch (error) {
      setDirectTestResult({
        success: false,
        message: `Direct CORS access error: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>CORS Test Utility</h1>

      <div className="card">
        <h2>Test CORS Configuration</h2>
        <p>This utility tests CORS connectivity between your Next.js app and Flask backend.</p>

        <div className="form-group">
          <label htmlFor="flaskApiUrl">Flask API URL</label>
          <input
            type="text"
            id="flaskApiUrl"
            value={flaskApiUrl}
            onChange={(e) => setFlaskApiUrl(e.target.value)}
            placeholder="Enter Flask API URL"
          />
        </div>

        <div className="button-container">
          <button className="btn btn-primary" onClick={runServerTest} disabled={loading}>
            {loading ? "Testing..." : "Run Server-Side Test"}
          </button>

          <button className="btn btn-secondary" onClick={runDirectTest} disabled={loading}>
            {loading ? "Testing..." : "Run Direct Browser Test"}
          </button>
        </div>

        {testResults && (
          <div className={`test-results ${testResults.success ? "success" : "error"}`}>
            <h3>Server-Side Test Results</h3>
            <div className="result-status">
              <strong>Status:</strong> {testResults.success ? "Success" : "Failed"}
            </div>
            <div className="result-message">
              <strong>Message:</strong> {testResults.message}
            </div>

            {testResults.directConnection && (
              <div className="connection-test">
                <h4>Direct Connection Test</h4>
                <div className="result-status">
                  <strong>Status:</strong> {testResults.directConnection.success ? "Success" : "Failed"}
                </div>
                {testResults.directConnection.data && (
                  <div className="result-data">
                    <strong>Data:</strong> <pre>{JSON.stringify(testResults.directConnection.data, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}

            {testResults.proxyConnection && (
              <div className="connection-test">
                <h4>Proxy Connection Test</h4>
                <div className="result-status">
                  <strong>Status:</strong> {testResults.proxyConnection.success ? "Success" : "Failed"}
                </div>
                {testResults.proxyConnection.data && (
                  <div className="result-data">
                    <strong>Data:</strong> <pre>{JSON.stringify(testResults.proxyConnection.data, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}

            {!testResults.success && testResults.troubleshooting && (
              <div className="troubleshooting">
                <h4>Troubleshooting</h4>
                <ul>
                  {Object.entries(testResults.troubleshooting).map(([key, value]) => (
                    <li key={key}>{value}</li>
                  ))}
                </ul>

                {testResults.flaskCorsSetup && (
                  <div className="flask-setup">
                    <h4>Flask CORS Setup</h4>
                    <pre>{testResults.flaskCorsSetup}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {directTestResult && (
          <div className={`test-results ${directTestResult.success ? "success" : "error"}`}>
            <h3>Direct Browser Test Results</h3>
            <div className="result-status">
              <strong>Status:</strong> {directTestResult.success ? "Success" : "Failed"}
            </div>
            <div className="result-message">
              <strong>Message:</strong> {directTestResult.message}
            </div>

            {!directTestResult.success && (
              <div className="troubleshooting">
                <h4>Troubleshooting</h4>
                <ul>
                  <li>Check if Flask is running at {flaskApiUrl}</li>
                  <li>Check if Flask has CORS enabled</li>
                  <li>Check browser console for detailed error messages</li>
                  <li>Try using the proxy approach instead of direct access</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h2>CORS Configuration Guide</h2>

        <div className="config-section">
          <h3>1. Flask CORS Setup</h3>
          <p>Add the following to your Flask application:</p>
          <pre className="code-block">
            {`from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # This enables CORS for all routes

# Install with: pip install flask-cors`}
          </pre>

          <p>For more specific CORS configuration:</p>
          <pre className="code-block">
            {`# Configure CORS for specific origins
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

# Configure CORS with additional options
CORS(app, 
     origins=["http://localhost:3000", "https://yourdomain.com"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"],
     supports_credentials=True)`}
          </pre>
        </div>

        <div className="config-section">
          <h3>2. Next.js CORS Setup</h3>
          <p>The Next.js application already has CORS configured in the following ways:</p>
          <ul>
            <li>Middleware that adds CORS headers to all API responses</li>
            <li>Proxy API route that forwards requests to Flask with CORS headers</li>
            <li>OPTIONS handlers for preflight requests</li>
          </ul>
          <p>These configurations should handle most CORS scenarios.</p>
        </div>

        <div className="config-section">
          <h3>3. Testing Your Setup</h3>
          <p>Use this utility to test your CORS configuration. If you encounter issues:</p>
          <ul>
            <li>Check browser console for detailed CORS error messages</li>
            <li>Verify Flask is running and accessible</li>
            <li>Ensure Flask has CORS properly configured</li>
            <li>Try using the proxy approach if direct access fails</li>
          </ul>
        </div>
      </div>

      <div className="navigation">
        <Link href="/scraper-control">
          <button className="btn btn-outline">Go to Scraper Control Panel</button>
        </Link>
      </div>
    </div>
  )
}
