"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

export default function MongoDBTestPage() {
  const [testResult, setTestResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testConnection = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/mongodb-test")
      const data = await response.json()

      setTestResult(data)
    } catch (err) {
      setError(`Error testing MongoDB connection: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  // Test connection on page load
  useEffect(() => {
    testConnection()
  }, [])

  return (
    <div className="container">
      <h1>MongoDB Connection Test</h1>

      <div className="card">
        <h2>Connection Status</h2>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Testing MongoDB connection...</p>
          </div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : testResult ? (
          <div className={`test-result ${testResult.success ? "success" : "error"}`}>
            <div className="result-status">
              <strong>Status:</strong> {testResult.success ? "Connected" : "Failed"}
            </div>
            <div className="result-message">
              <strong>Message:</strong> {testResult.message}
            </div>

            {testResult.success && testResult.databases && (
              <div className="databases">
                <h3>Available Databases</h3>
                <ul>
                  {testResult.databases.map((db: string) => (
                    <li key={db}>{db}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="environment-status">
              <h3>Environment Variables</h3>
              <div className="env-item">
                <strong>MONGODB_URI:</strong> {testResult.environmentStatus.mongodbUriExists ? "Set" : "Not set"}
              </div>
              <div className="env-item">
                <strong>NODE_ENV:</strong> {testResult.environmentStatus.nodeEnv}
              </div>
            </div>

            {!testResult.success && testResult.error && (
              <div className="error-details">
                <h3>Error Details</h3>
                <pre>{testResult.error}</pre>
              </div>
            )}
          </div>
        ) : (
          <p>No test results available.</p>
        )}

        <div className="button-container">
          <button className="btn btn-primary" onClick={testConnection} disabled={loading}>
            {loading ? "Testing..." : "Test Connection Again"}
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Environment Setup Guide</h2>

        <div className="setup-guide">
          <h3>1. Create a .env file</h3>
          <p>
            Create a file named <code>.env</code> in the root directory of your project with the following content:
          </p>
          <pre className="code-block">
            MONGODB_URI=mongodb+srv://roshaanatck:DOcnGUEEB37bQtcL@scraper-db-cluster.88kc14b.mongodb.net/?retryWrites=true&w=majority&appName=scraper-db-cluster
          </pre>

          <h3>2. Restart your development server</h3>
          <p>After creating or modifying the .env file, restart your Next.js development server:</p>
          <pre className="code-block">npm run dev</pre>

          <h3>3. Verify connection</h3>
          <p>Use this page to verify that your MongoDB connection is working correctly.</p>
        </div>
      </div>

      <div className="navigation">
        <Link href="/results">
          <button className="btn btn-outline">Back to Results</button>
        </Link>
      </div>
    </div>
  )
}
