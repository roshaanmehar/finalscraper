"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { UK_POSTCODE_AREAS } from "@/app/constants/uk-postcodes"
import { ScraperStatus } from "./scraper-status"
import { TaskLogs } from "./task-logs"

type ScraperTask = {
  taskId: string
  status: "idle" | "running" | "completed" | "failed" | "terminated"
  progress: number
  message: string
  details: any
}

type ScraperControlPanelProps = {
  initialCity: string
  initialKeyword: string
}

// Flask API base URL
const FLASK_API_URL = "http://localhost:5000"

export function ScraperControlPanel({ initialCity, initialKeyword }: ScraperControlPanelProps) {
  // State for city and keyword inputs
  const [city, setCity] = useState(initialCity)
  const [keyword, setKeyword] = useState(initialKeyword || "restaurants")
  const [cityResults, setCityResults] = useState<Array<{ code: string; name: string }>>([])
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const [selectedPostcodeArea, setSelectedPostcodeArea] = useState("")
  const [flaskConnected, setFlaskConnected] = useState<boolean | null>(null)

  // State for scraper tasks
  const [gmapsTask, setGmapsTask] = useState<ScraperTask>({
    taskId: "",
    status: "idle",
    progress: 0,
    message: "",
    details: null,
  })

  const [emailTask, setEmailTask] = useState<ScraperTask>({
    taskId: "",
    status: "idle",
    progress: 0,
    message: "",
    details: null,
  })

  // State for logs
  const [logs, setLogs] = useState<string[]>([])

  // Refs for polling intervals
  const gmapsStatusIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const emailStatusIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Check Flask connection on component mount
  useEffect(() => {
    checkFlaskConnection()
  }, [])

  // Function to check Flask connection
  const checkFlaskConnection = async () => {
    try {
      addLog("Checking connection to Flask backend...")

      // Direct call to Flask API
      const response = await fetch(`${FLASK_API_URL}/api/dataPS?city=test&keyword=test`)

      if (response.ok || response.status === 404) {
        // Even a 404 means we're connecting to the Flask server
        setFlaskConnected(true)
        addLog("✅ Connected to Flask backend successfully")
      } else {
        setFlaskConnected(false)
        addLog("❌ Failed to connect to Flask backend")
      }
    } catch (error) {
      console.error("Error checking Flask connection:", error)
      setFlaskConnected(false)
      addLog(`❌ Error connecting to Flask backend: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  // Function to add a log entry
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 99)])
  }, [])

  // Function to search cities
  const handleCitySearch = useCallback((value: string) => {
    if (value.trim().length < 2) {
      setCityResults([])
      setShowCityDropdown(false)
      return
    }

    const normalizedQuery = value.trim().toLowerCase()
    const matchingCities: Array<{ code: string; name: string }> = []

    // Search by city name
    Object.entries(UK_POSTCODE_AREAS).forEach(([code, cityName]) => {
      if (cityName.toLowerCase().includes(normalizedQuery)) {
        matchingCities.push({ code, name: cityName })
      }
    })

    // Also search by postcode area
    Object.entries(UK_POSTCODE_AREAS).forEach(([code, cityName]) => {
      if (code.toLowerCase().includes(normalizedQuery) && !matchingCities.some((city) => city.code === code)) {
        matchingCities.push({ code, name: cityName })
      }
    })

    setCityResults(matchingCities)
    setShowCityDropdown(matchingCities.length > 0)
  }, [])

  // Handle city input change
  const handleCityInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setCity(value)
      handleCitySearch(value)
    },
    [handleCitySearch],
  )

  // Handle city selection from dropdown
  const handleCitySelect = useCallback((code: string, name: string) => {
    setCity(name)
    setSelectedPostcodeArea(code)
    setShowCityDropdown(false)
  }, [])

  // Function to check postcode data existence
  const checkPostcodeData = useCallback(async () => {
    if (!flaskConnected) {
      addLog("❌ Cannot check postcode data: Flask backend not connected")
      throw new Error("Flask backend not connected")
    }

    try {
      addLog(`Checking if postcode data exists for ${city} with keyword ${keyword}...`)

      // Direct call to Flask API
      const url = `${FLASK_API_URL}/api/dataPS?city=${encodeURIComponent(city)}&keyword=${encodeURIComponent(keyword)}`
      console.log(`Sending request to: ${url}`)

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Failed to check postcode data: ${response.status}`)
      }

      const data = await response.json()
      addLog(`Postcode data check result: ${data.exists ? "Exists" : "Does not exist"}`)

      return data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      addLog(`Error checking postcode data: ${errorMessage}`)
      throw error
    }
  }, [city, keyword, flaskConnected, addLog])

  // Function to start postcode scraping
  const startPostcodeScraping = useCallback(async () => {
    if (!flaskConnected) {
      addLog("❌ Cannot start scraping: Flask backend not connected")
      throw new Error("Flask backend not connected")
    }

    try {
      addLog(`Starting postcode scraping for ${city} with keyword ${keyword}...`)

      // Direct call to Flask API
      const url = `${FLASK_API_URL}/api/scrapePS?city=${encodeURIComponent(city)}&keyword=${encodeURIComponent(keyword)}&auto_run_gmaps=true`
      console.log(`Sending request to: ${url}`)

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Failed to start postcode scraping: ${response.status}`)
      }

      const data = await response.json()
      console.log("Received response:", data)

      if (data.status === "gmaps_started") {
        // If Google Maps scraping was automatically started
        addLog(`Postcode data already exists. Google Maps scraping started with task ID: ${data.gmaps_task_id}`)
        setGmapsTask({
          taskId: data.gmaps_task_id,
          status: "running",
          progress: 0,
          message: "Google Maps scraping started",
          details: data,
        })

        // Start polling for Google Maps task status using the status URL from the response
        startGmapsStatusPolling(data.gmaps_task_id, data.gmaps_status_url)
      } else {
        // If postcode scraping was started
        addLog(`Postcode scraping started with task ID: ${data.task_id}`)
        setGmapsTask({
          taskId: data.task_id,
          status: "running",
          progress: 0,
          message: "Postcode scraping started",
          details: data,
        })

        // Start polling for postcode task status using the status URL from the response
        startPostcodeStatusPolling(data.task_id, data.status_url || `/api/statusPS/${data.task_id}`)
      }

      return data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      addLog(`Error starting postcode scraping: ${errorMessage}`)
      throw error
    }
  }, [city, keyword, flaskConnected, addLog])

  // Function to start Google Maps scraping directly
  const startGmapsScraping = useCallback(
    async (dbName: string, queueCollection: string) => {
      if (!flaskConnected) {
        addLog("❌ Cannot start Google Maps scraping: Flask backend not connected")
        throw new Error("Flask backend not connected")
      }

      try {
        addLog(`Starting Google Maps scraping for ${dbName}.${queueCollection}...`)

        // Direct call to Flask API
        const url = `${FLASK_API_URL}/api/scrapeGM?db_name=${encodeURIComponent(dbName)}&queue_collection=${encodeURIComponent(queueCollection)}`
        console.log(`Sending request to: ${url}`)

        const response = await fetch(url)

        if (!response.ok) {
          throw new Error(`Failed to start Google Maps scraping: ${response.status}`)
        }

        const data = await response.json()
        console.log("Received response:", data)
        addLog(`Google Maps scraping started with task ID: ${data.task_id}`)

        setGmapsTask({
          taskId: data.task_id,
          status: "running",
          progress: 0,
          message: "Google Maps scraping started",
          details: data,
        })

        // Start polling for Google Maps task status using the status URL from the response
        startGmapsStatusPolling(data.task_id, data.status_url || `/api/statusGM/${data.task_id}`)

        return data
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        addLog(`Error starting Google Maps scraping: ${errorMessage}`)
        throw error
      }
    },
    [flaskConnected, addLog],
  )

  // Function to start email scraping
  const startEmailScraping = useCallback(async () => {
    if (!flaskConnected) {
      addLog("❌ Cannot start email scraping: Flask backend not connected")
      throw new Error("Flask backend not connected")
    }

    try {
      // Default collection name based on keyword
      const collection = keyword.replace(/\s+/g, "_").toLowerCase()

      addLog(`Starting email scraping for ${city}.${collection}...`)

      // Direct call to Flask API
      const url = `${FLASK_API_URL}/api/scrapeES?db_name=${encodeURIComponent(city)}&collection=${encodeURIComponent(collection)}`
      console.log(`Sending request to: ${url}`)

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Failed to start email scraping: ${response.status}`)
      }

      const data = await response.json()
      console.log("Received response:", data)
      addLog(`Email scraping started with task ID: ${data.task_id}`)

      setEmailTask({
        taskId: data.task_id,
        status: "running",
        progress: 0,
        message: "Email scraping started",
        details: data,
      })

      // Start polling for email task status using the status URL from the response
      startEmailStatusPolling(data.task_id, data.status_url || `/api/statusES/${data.task_id}`)

      return data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      addLog(`Error starting email scraping: ${errorMessage}`)
      throw error
    }
  }, [city, keyword, flaskConnected, addLog])

  // Function to stop Google Maps scraping
  const stopGmapsScraping = useCallback(async () => {
    if (!flaskConnected) {
      addLog("❌ Cannot stop scraping: Flask backend not connected")
      throw new Error("Flask backend not connected")
    }

    if (!gmapsTask.taskId) {
      addLog("No active Google Maps scraping task to stop")
      return
    }

    try {
      addLog(`Stopping Google Maps scraping task: ${gmapsTask.taskId}...`)

      // Determine the correct endpoint based on the task ID prefix
      // Direct call to Flask API
      const endpoint = gmapsTask.taskId.startsWith("PS_")
        ? `${FLASK_API_URL}/api/terminatePS/${gmapsTask.taskId}`
        : `${FLASK_API_URL}/api/terminateGM/${gmapsTask.taskId}`

      console.log(`Sending request to: ${endpoint}`)

      const response = await fetch(endpoint, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error(`Failed to stop scraping: ${response.status}`)
      }

      const data = await response.json()
      console.log("Received response:", data)
      addLog(`Scraping task stopped: ${data.message}`)

      setGmapsTask((prev) => ({
        ...prev,
        status: "terminated",
        message: "Scraping stopped by user",
      }))

      // Stop polling for status
      if (gmapsStatusIntervalRef.current) {
        clearInterval(gmapsStatusIntervalRef.current)
        gmapsStatusIntervalRef.current = null
      }

      return data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      addLog(`Error stopping scraping task: ${errorMessage}`)
      throw error
    }
  }, [gmapsTask.taskId, flaskConnected, addLog])

  // Function to stop email scraping
  const stopEmailScraping = useCallback(async () => {
    if (!flaskConnected) {
      addLog("❌ Cannot stop email scraping: Flask backend not connected")
      throw new Error("Flask backend not connected")
    }

    if (!emailTask.taskId) {
      addLog("No active email scraping task to stop")
      return
    }

    try {
      addLog(`Stopping email scraping task: ${emailTask.taskId}...`)

      // Direct call to Flask API
      const url = `${FLASK_API_URL}/api/terminateES/${emailTask.taskId}`
      console.log(`Sending request to: ${url}`)

      const response = await fetch(url, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error(`Failed to stop email scraping: ${response.status}`)
      }

      const data = await response.json()
      console.log("Received response:", data)
      addLog(`Email scraping task stopped: ${data.message}`)

      setEmailTask((prev) => ({
        ...prev,
        status: "terminated",
        message: "Email scraping stopped by user",
      }))

      // Stop polling for status
      if (emailStatusIntervalRef.current) {
        clearInterval(emailStatusIntervalRef.current)
        emailStatusIntervalRef.current = null
      }

      return data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      addLog(`Error stopping email scraping task: ${errorMessage}`)
      throw error
    }
  }, [emailTask.taskId, flaskConnected, addLog])

  // Function to poll for postcode task status
  const startPostcodeStatusPolling = useCallback(
    (taskId: string, statusUrl: string) => {
      // Clear any existing interval
      if (gmapsStatusIntervalRef.current) {
        clearInterval(gmapsStatusIntervalRef.current)
      }

      // Set up new polling interval
      gmapsStatusIntervalRef.current = setInterval(async () => {
        try {
          // Direct call to Flask API using the status URL from the response
          const url = `${FLASK_API_URL}${statusUrl}`
          const response = await fetch(url)

          if (!response.ok) {
            throw new Error(`Failed to get task status: ${response.status}`)
          }

          const data = await response.json()

          // Update task status
          setGmapsTask((prev) => ({
            ...prev,
            status: data.status,
            progress: data.progress || 0,
            message: `Postcode scraping: ${data.status}`,
            details: data,
          }))

          // Log status updates
          if (data.status !== "running") {
            addLog(`Postcode scraping status: ${data.status}`)
          }

          // If task is completed, check if Google Maps scraping was started
          if (data.status === "completed" && data.gmaps_task_id) {
            addLog(`Postcode scraping completed. Google Maps scraping started with task ID: ${data.gmaps_task_id}`)

            // Update task to Google Maps task
            setGmapsTask((prev) => ({
              ...prev,
              taskId: data.gmaps_task_id,
              status: "running",
              progress: 0,
              message: "Google Maps scraping started",
              details: data,
            }))

            // Start polling for Google Maps task status
            clearInterval(gmapsStatusIntervalRef.current!)
            startGmapsStatusPolling(data.gmaps_task_id, data.gmaps_status_url || `/api/statusGM/${data.gmaps_task_id}`)
          }

          // If task is completed or failed, stop polling
          if (["completed", "failed", "terminated"].includes(data.status) && !data.gmaps_task_id) {
            addLog(`Postcode scraping ${data.status}. Stopping status polling.`)
            clearInterval(gmapsStatusIntervalRef.current!)
            gmapsStatusIntervalRef.current = null
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error"
          addLog(`Error polling task status: ${errorMessage}`)
        }
      }, 5000) // Poll every 5 seconds
    },
    [addLog],
  )

  // Function to poll for Google Maps task status
  const startGmapsStatusPolling = useCallback(
    (taskId: string, statusUrl: string) => {
      // Clear any existing interval
      if (gmapsStatusIntervalRef.current) {
        clearInterval(gmapsStatusIntervalRef.current)
      }

      // Set up new polling interval
      gmapsStatusIntervalRef.current = setInterval(async () => {
        try {
          // Direct call to Flask API using the status URL from the response
          const url = `${FLASK_API_URL}${statusUrl}`
          const response = await fetch(url)

          if (!response.ok) {
            throw new Error(`Failed to get task status: ${response.status}`)
          }

          const data = await response.json()

          // Calculate progress percentage
          let progress = 0
          if (data.total_subsectors && data.total_subsectors > 0) {
            const processed = data.total_subsectors - (data.unprocessed_subsectors || 0)
            progress = Math.round((processed / data.total_subsectors) * 100)
          }

          // Update task status
          setGmapsTask((prev) => ({
            ...prev,
            status: data.status,
            progress: progress,
            message: `Google Maps scraping: ${data.status}`,
            details: data,
          }))

          // Log status updates
          if (data.status !== "running") {
            addLog(`Google Maps scraping status: ${data.status}`)
          }

          // If task is completed or failed, stop polling
          if (["completed", "failed", "terminated"].includes(data.status)) {
            addLog(`Google Maps scraping ${data.status}. Stopping status polling.`)
            clearInterval(gmapsStatusIntervalRef.current!)
            gmapsStatusIntervalRef.current = null
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error"
          addLog(`Error polling task status: ${errorMessage}`)
        }
      }, 5000) // Poll every 5 seconds
    },
    [addLog],
  )

  // Function to poll for email task status
  const startEmailStatusPolling = useCallback(
    (taskId: string, statusUrl: string) => {
      // Clear any existing interval
      if (emailStatusIntervalRef.current) {
        clearInterval(emailStatusIntervalRef.current)
      }

      // Set up new polling interval
      emailStatusIntervalRef.current = setInterval(async () => {
        try {
          // Direct call to Flask API using the status URL from the response
          const url = `${FLASK_API_URL}${statusUrl}`
          const response = await fetch(url)

          if (!response.ok) {
            throw new Error(`Failed to get email task status: ${response.status}`)
          }

          const data = await response.json()

          // Update task status
          setEmailTask((prev) => ({
            ...prev,
            status: data.status,
            progress: data.progress || 0,
            message: `Email scraping: ${data.status}`,
            details: data,
          }))

          // Log status updates
          if (data.status !== "running") {
            addLog(`Email scraping status: ${data.status}`)
          }

          // If task is completed or failed, stop polling
          if (["completed", "failed", "terminated"].includes(data.status)) {
            addLog(`Email scraping ${data.status}. Stopping status polling.`)
            clearInterval(emailStatusIntervalRef.current!)
            emailStatusIntervalRef.current = null
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error"
          addLog(`Error polling email task status: ${errorMessage}`)
        }
      }, 5000) // Poll every 5 seconds
    },
    [addLog],
  )

  // Handle Start Scraping button click
  const handleStartScraping = useCallback(async () => {
    if (!city) {
      alert("Please select a city first")
      return
    }

    if (!flaskConnected) {
      addLog("❌ Cannot start scraping: Flask backend not connected")
      alert("Cannot start scraping: Flask backend not connected. Please check if the Flask server is running.")
      return
    }

    try {
      // First check if postcode data exists
      const postcodeData = await checkPostcodeData()

      if (!postcodeData.exists) {
        // If postcode data doesn't exist, start postcode scraping
        await startPostcodeScraping()
      } else {
        // If postcode data exists, start Google Maps scraping directly
        const queueCollection =
          postcodeData.collection?.name || `${keyword.replace(/\s+/g, "_").toLowerCase()}_subsector_queue`
        await startGmapsScraping(city, queueCollection)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      addLog(`Error in scraping workflow: ${errorMessage}`)
    }
  }, [city, keyword, flaskConnected, checkPostcodeData, startPostcodeScraping, startGmapsScraping, addLog])

  // Handle Stop Scraping button click
  const handleStopScraping = useCallback(async () => {
    try {
      await stopGmapsScraping()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      addLog(`Error stopping scraping: ${errorMessage}`)
    }
  }, [stopGmapsScraping, addLog])

  // Handle Start Email Scraping button click
  const handleStartEmailScraping = useCallback(async () => {
    if (!city) {
      alert("Please select a city first")
      return
    }

    if (!flaskConnected) {
      addLog("❌ Cannot start email scraping: Flask backend not connected")
      alert("Cannot start email scraping: Flask backend not connected. Please check if the Flask server is running.")
      return
    }

    try {
      await startEmailScraping()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      addLog(`Error in email scraping: ${errorMessage}`)
    }
  }, [city, flaskConnected, startEmailScraping, addLog])

  // Handle Stop Email Scraping button click
  const handleStopEmailScraping = useCallback(async () => {
    try {
      await stopEmailScraping()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      addLog(`Error stopping email scraping: ${errorMessage}`)
    }
  }, [stopEmailScraping, addLog])

  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      if (gmapsStatusIntervalRef.current) {
        clearInterval(gmapsStatusIntervalRef.current)
      }
      if (emailStatusIntervalRef.current) {
        clearInterval(emailStatusIntervalRef.current)
      }
    }
  }, [])

  return (
    <div className="scraper-control-panel">
      {/* Flask connection status */}
      <div
        className={`flask-connection-status ${flaskConnected === null ? "checking" : flaskConnected ? "connected" : "disconnected"}`}
      >
        <div className="status-indicator"></div>
        <div className="status-message">
          {flaskConnected === null
            ? "Checking connection to Flask backend..."
            : flaskConnected
              ? "Connected to Flask backend"
              : "Failed to connect to Flask backend. Make sure the Flask server is running on http://localhost:5000"}
        </div>
        {flaskConnected === false && (
          <button className="retry-button" onClick={checkFlaskConnection}>
            Retry Connection
          </button>
        )}
      </div>

      <div className="config-card">
        <h2>Scraper Configuration</h2>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="city">City</label>
            <div className="city-search-container">
              <input
                type="text"
                id="city"
                name="city"
                placeholder="Enter city name"
                value={city}
                onChange={handleCityInputChange}
                autoComplete="off"
                disabled={gmapsTask.status === "running" || emailTask.status === "running"}
              />

              {showCityDropdown && (
                <div className="city-dropdown">
                  {cityResults.length > 0 ? (
                    cityResults.map((city) => (
                      <div
                        key={city.code}
                        className="city-option"
                        onClick={() => handleCitySelect(city.code, city.name)}
                      >
                        <div className="city-name">{city.name}</div>
                        <div className="postcode-area">{city.code}</div>
                      </div>
                    ))
                  ) : (
                    <div className="no-results">City not in database</div>
                  )}
                </div>
              )}
            </div>

            {selectedPostcodeArea && (
              <div className="selected-city-info">
                <div className="info-item">
                  <span className="info-label">Postcode Area:</span>
                  <span className="info-value">{selectedPostcodeArea}</span>
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="keyword">Keyword</label>
            <input
              type="text"
              id="keyword"
              name="keyword"
              placeholder="Enter keyword (e.g. restaurants, cafes)"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              disabled={gmapsTask.status === "running" || emailTask.status === "running"}
            />
          </div>
        </div>

        <div className="button-container">
          {gmapsTask.status !== "running" ? (
            <button
              className="action-button start-button"
              onClick={handleStartScraping}
              disabled={!city || emailTask.status === "running" || flaskConnected === false}
            >
              Start Scraping
            </button>
          ) : (
            <button
              className="action-button stop-button"
              onClick={handleStopScraping}
              disabled={!gmapsTask.taskId || flaskConnected === false}
            >
              Stop Scraping
            </button>
          )}

          {emailTask.status !== "running" ? (
            <button
              className="action-button email-button"
              onClick={handleStartEmailScraping}
              disabled={!city || gmapsTask.status === "running" || flaskConnected === false}
            >
              Start Email Scraping
            </button>
          ) : (
            <button
              className="action-button stop-button"
              onClick={handleStopEmailScraping}
              disabled={!emailTask.taskId || flaskConnected === false}
            >
              Stop Email Scraping
            </button>
          )}
        </div>

        {/* Display active task IDs */}
        {gmapsTask.taskId && (
          <div className="task-info">
            <span className="task-label">Google Maps Task ID:</span>
            <span className="task-value">{gmapsTask.taskId}</span>
          </div>
        )}

        {emailTask.taskId && (
          <div className="task-info">
            <span className="task-label">Email Scraping Task ID:</span>
            <span className="task-value">{emailTask.taskId}</span>
          </div>
        )}
      </div>

      <div className="status-grid">
        <ScraperStatus title="Google Maps Scraping Status" task={gmapsTask} />
        <ScraperStatus title="Email Scraping Status" task={emailTask} />
      </div>

      <TaskLogs logs={logs} />
    </div>
  )
}
