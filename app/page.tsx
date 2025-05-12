"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import type { City } from "./types"

// Add the UK postcode areas dictionary at the top of the component
const UK_POSTCODE_AREAS = {
  AB: "Aberdeen",
  AL: "St Albans",
  B: "Birmingham",
  BA: "Bath",
  BB: "Blackburn",
  BD: "Bradford",
  BF: "British Forces",
  BH: "Bournemouth",
  BL: "Bolton",
  BN: "Brighton",
  BR: "Bromley",
  BS: "Bristol",
  BT: "Northern Ireland",
  CA: "Carlisle",
  CB: "Cambridge",
  CF: "Cardiff",
  CH: "Chester",
  CM: "Chelmsford",
  CO: "Colchester",
  CR: "Croydon",
  CT: "Canterbury",
  CV: "Coventry",
  CW: "Crewe",
  DA: "Dartford",
  DD: "Dundee",
  DE: "Derby",
  DG: "Dumfries and Galloway",
  DH: "Durham",
  DL: "Darlington",
  DN: "Doncaster",
  DT: "Dorchester",
  DY: "Dudley",
  E: "East London",
  EC: "Central London",
  EH: "Edinburgh",
  EN: "Enfield",
  EX: "Exeter",
  FK: "Falkirk and Stirling",
  FY: "Blackpool",
  G: "Glasgow",
  GL: "Gloucester",
  GU: "Guildford",
  HA: "Harrow",
  HD: "Huddersfield",
  HG: "Harrogate",
  HP: "Hemel Hempstead",
  HR: "Hereford",
  HS: "Outer Hebrides",
  HU: "Hull",
  HX: "Halifax",
  IG: "Ilford",
  IP: "Ipswich",
  IV: "Inverness",
  KA: "Kilmarnock",
  KT: "Kingston upon Thames",
  KW: "Kirkwall",
  KY: "Kirkcaldy",
  L: "Liverpool",
  LA: "Lancaster",
  LD: "Llandrindod Wells",
  LE: "Leicester",
  LL: "Llandudno",
  LN: "Lincoln",
  LS: "Leeds",
  LU: "Luton",
  M: "Manchester",
  ME: "Rochester",
  MK: "Milton Keynes",
  ML: "Motherwell",
  N: "North London",
  NE: "Newcastle upon Tyne",
  NG: "Nottingham",
  NN: "Northampton",
  NP: "Newport",
  NR: "Norwich",
  NW: "North West London",
  OL: "Oldham",
  OX: "Oxford",
  PA: "Paisley",
  PE: "Peterborough",
  PH: "Perth",
  PL: "Plymouth",
  PO: "Portsmouth",
  PR: "Preston",
  RG: "Reading",
  RH: "Redhill",
  RM: "Romford",
  S: "Sheffield",
  SA: "Swansea",
  SE: "South East London",
  SG: "Stevenage",
  SK: "Stockport",
  SL: "Slough",
  SM: "Sutton",
  SN: "Swindon",
  SO: "Southampton",
  SP: "Salisbury",
  SR: "Sunderland",
  SS: "Southend-on-Sea",
  ST: "Stoke-on-Trent",
  SW: "South West London",
  SY: "Shrewsbury",
  TA: "Taunton",
  TD: "Galashiels",
  TF: "Telford",
  TN: "Tonbridge",
  TQ: "Torquay",
  TR: "Truro",
  TS: "Cleveland",
  TW: "Twickenham",
  UB: "Southall",
  W: "West London",
  WA: "Warrington",
  WC: "Central London",
  WD: "Watford",
  WF: "Wakefield",
  WN: "Wigan",
  WR: "Worcester",
  WS: "Walsall",
  WV: "Wolverhampton",
  YO: "York",
  ZE: "Lerwick",
}

// Flask API base URL - changed to the specified IP address
const FLASK_API_URL = "http://34.89.71.45:5000"

// Task state interface
interface TaskState {
  taskId: string
  statusUrl: string
  status: string
  progress: number
  message: string
  totalSubsectors?: number
  unprocessedSubsectors?: number
  totalRecords?: number
  pendingRecords?: number
  emailsFound?: number
  failedScrape?: number
}

// Scraper type enum
enum ScraperType {
  GMAPS = "gmaps",
  EMAIL = "email",
}

export default function ScrapePage() {
  const router = useRouter()
  const [city, setCity] = useState("")
  const [keyword, setKeyword] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [cityResults, setCityResults] = useState<City[]>([])
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")
  const [isScraping, setIsScraping] = useState(false)
  const [taskState, setTaskState] = useState<TaskState | null>(null)
  const [statusPolling, setStatusPolling] = useState<NodeJS.Timeout | null>(null)
  const [activeScraperType, setActiveScraperType] = useState<ScraperType | null>(null)
  const [emailScraperStats, setEmailScraperStats] = useState<{
    totalRecords: number
    pendingRecords: number
    emailsFound: number
    failedScrape: number
  } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (statusPolling) {
        clearInterval(statusPolling)
      }
    }
  }, [statusPolling])

  // Start searching immediately when component mounts
  useEffect(() => {
    if (city.trim().length >= 2) {
      handleCitySearch(city)
    }
  }, [])

  // Replace the handleCitySearch function with this new implementation
  const handleCitySearch = (value: string) => {
    if (value.trim().length < 2) {
      setCityResults([])
      setShowDropdown(false)
      setSelectedCity(null)
      return
    }

    setIsSearching(true)
    setShowDropdown(true)

    try {
      // Search through the UK_POSTCODE_AREAS dictionary
      const normalizedQuery = value.trim().toLowerCase()
      const matchingCities: City[] = []

      // Search by city name
      Object.entries(UK_POSTCODE_AREAS).forEach(([code, cityName]) => {
        if (cityName.toLowerCase().includes(normalizedQuery)) {
          matchingCities.push({
            _id: code,
            postcode_area: code,
            area_covered: cityName,
            population_2011: 0,
            households_2011: 0,
            postcodes: 0,
            active_postcodes: 0,
            non_geographic_postcodes: 0,
            scraped_at: new Date().toISOString(),
          })
        }
      })

      // Also search by postcode area
      Object.entries(UK_POSTCODE_AREAS).forEach(([code, cityName]) => {
        if (
          code.toLowerCase().includes(normalizedQuery) &&
          !matchingCities.some((city) => city.postcode_area === code)
        ) {
          matchingCities.push({
            _id: code,
            postcode_area: code,
            area_covered: cityName,
            population_2011: 0,
            households_2011: 0,
            postcodes: 0,
            active_postcodes: 0,
            non_geographic_postcodes: 0,
            scraped_at: new Date().toISOString(),
          })
        }
      })

      setCityResults(matchingCities)
    } catch (error) {
      console.error("Error searching cities:", error)
      setCityResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Debounce function to prevent too many requests while typing
  const debounce = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout
    return (...args: any[]) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        func(...args)
      }, delay)
    }
  }

  // Debounced search function
  const debouncedSearch = debounce(handleCitySearch, 300)

  // Replace the debouncedSearch function call with the direct function call
  // since we're not making API calls anymore
  const handleCityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setCity(value)
    handleCitySearch(value)
  }

  // Handle city selection from dropdown
  const handleCitySelect = (city: City) => {
    setSelectedCity(city)
    setCity(city.area_covered)
    setShowDropdown(false)
  }

  // Poll for scraper status
  const startStatusPolling = (statusUrl: string, scraperType: ScraperType) => {
    // First get status immediately
    fetchScraperStatus(statusUrl, scraperType)

    // Then set up polling
    const intervalId = setInterval(() => fetchScraperStatus(statusUrl, scraperType), 5000)
    setStatusPolling(intervalId)
  }

  // Stop status polling
  const stopStatusPolling = () => {
    if (statusPolling) {
      clearInterval(statusPolling)
      setStatusPolling(null)
    }
  }

  // Reset the UI state after termination or completion
  const resetUIState = () => {
    setIsScraping(false)
    setIsProcessing(false)
    setTaskState(null)
    setActiveScraperType(null)
    stopStatusPolling()
  }

  // Calculate progress percentage for GMaps scraper
  const calculateGMapsProgress = (total?: number, unprocessed?: number): number => {
    if (!total || total <= 0 || !unprocessed) return 0
    const processed = total - unprocessed
    return Math.round((processed / total) * 100)
  }

  // Calculate progress percentage for Email scraper
  const calculateEmailProgress = (total?: number, pending?: number): number => {
    if (!total || total <= 0 || pending === undefined) return 0
    const processed = total - pending
    return Math.round((processed / total) * 100)
  }

  // Fetch current scraper status
  const fetchScraperStatus = async (statusUrl: string, scraperType: ScraperType) => {
    try {
      // Direct call to Flask API using the status URL from the response
      const response = await fetch(`${FLASK_API_URL}${statusUrl}`)
      if (!response.ok) throw new Error("Failed to fetch status")

      const data = await response.json()
      console.log(`${scraperType.toUpperCase()} Status response:`, data)

      if (scraperType === ScraperType.GMAPS) {
        // Update task state based on GMaps response
        setTaskState((prevState) => ({
          ...prevState!,
          status: data.status,
          totalSubsectors: data.total_subsectors,
          unprocessedSubsectors: data.unprocessed_subsectors,
          progress: calculateGMapsProgress(data.total_subsectors, data.unprocessed_subsectors),
          message: data.message || prevState?.message || "",
        }))

        // Update UI status message based on GMaps scraper status
        if (data.status === "completed") {
          setStatusMessage(`GMaps scrape completed: ${data.message || "Process finished successfully"}`)
          resetUIState()
        } else if (data.status === "error") {
          setStatusMessage(`GMaps scrape error: ${data.message || "An error occurred"}`)
          resetUIState()
        } else if (data.status === "terminated") {
          setStatusMessage(`GMaps scrape terminated: ${data.message || "Process was terminated"}`)
          resetUIState()
        } else if (data.status === "running") {
          const progress = calculateGMapsProgress(data.total_subsectors, data.unprocessed_subsectors)
          setStatusMessage(
            `GMaps scrape in progress: ${progress}% complete (${data.total_subsectors - data.unprocessed_subsectors}/${data.total_subsectors} subsectors processed)`,
          )
          setIsScraping(true)
        }
      } else if (scraperType === ScraperType.EMAIL) {
        // Update task state based on Email scraper response
        setTaskState((prevState) => ({
          ...prevState!,
          status: data.status,
          totalRecords: data.total_records,
          pendingRecords: data.pending_records,
          emailsFound: data.emails_found,
          failedScrape: data.failed_scrape,
          progress: calculateEmailProgress(data.total_records, data.pending_records),
          message: data.message || prevState?.message || "",
        }))

        // Update UI status message based on Email scraper status
        if (data.status === "completed") {
          setStatusMessage(`Email scrape completed: ${data.message || "Process finished successfully"}`)
          resetUIState()
        } else if (data.status === "error") {
          setStatusMessage(`Email scrape error: ${data.message || "An error occurred"}`)
          resetUIState()
        } else if (data.status === "terminated") {
          setStatusMessage(`Email scrape terminated: ${data.message || "Process was terminated"}`)
          resetUIState()
        } else if (data.status === "running") {
          const progress = calculateEmailProgress(data.total_records, data.pending_records)
          setStatusMessage(
            `Email scrape in progress: ${progress}% complete (${data.emails_found} emails found, ${data.pending_records} pending, ${data.failed_scrape} failed)`,
          )
          setIsScraping(true)
        }
      }
    } catch (error) {
      console.error(`Error fetching ${scraperType} status:`, error)
      setStatusMessage(`Error fetching status: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  // Terminate the scraping process
  const terminateScraping = async () => {
    if (!taskState || !taskState.taskId || !activeScraperType) {
      alert("No active task to terminate")
      return
    }

    try {
      setStatusMessage(`Terminating ${activeScraperType} scraping process...`)

      // Direct call to Flask API using the task ID
      const terminateEndpoint = activeScraperType === ScraperType.GMAPS ? "terminateGM" : "terminateES"
      const terminateUrl = `${FLASK_API_URL}/api/${terminateEndpoint}/${taskState.taskId}`
      console.log(`Terminating ${activeScraperType} scrape with URL:`, terminateUrl)

      const response = await fetch(terminateUrl, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error(`Failed to terminate scraping: ${response.status}`)
      }

      const data = await response.json()
      console.log("Termination response:", data)

      if (data.status === "terminated") {
        setStatusMessage(
          `${activeScraperType.charAt(0).toUpperCase() + activeScraperType.slice(1)} scraping terminated: ${data.message}`,
        )
        // Reset UI state immediately after successful termination
        resetUIState()
      } else {
        setStatusMessage(`Termination status: ${data.message || "Unknown status"}`)
      }
    } catch (error) {
      console.error(`Error terminating ${activeScraperType} scrape:`, error)
      setStatusMessage(`Error terminating scrape: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  // Navigate to results page with current city and keyword
  const goToResults = () => {
    if (selectedCity) {
      router.push(
        `/results?city=${encodeURIComponent(selectedCity.postcode_area)}&keyword=${encodeURIComponent(keyword || "restaurant")}`,
      )
    }
  }

  // Check email scraper status
  const checkEmailScraperStatus = async () => {
    if (!selectedCity) {
      alert("Please select a valid city first")
      return
    }

    try {
      setStatusMessage("Checking email scraper status...")
      setIsProcessing(true)

      // Direct call to Flask API to check email scraper status
      const dataUrl = `${FLASK_API_URL}/api/dataES?db_name=${encodeURIComponent(selectedCity.area_covered)}&collection=${encodeURIComponent(keyword || "restaurants")}`
      console.log("Checking email scraper status with URL:", dataUrl)

      const response = await fetch(dataUrl)

      if (!response.ok) {
        throw new Error(`Email scraper status check failed with status: ${response.status}`)
      }

      const data = await response.json()
      console.log("Email scraper status response:", data)

      // Store email scraper stats
      setEmailScraperStats({
        totalRecords: data.total_records,
        pendingRecords: data.pending_scrape,
        emailsFound: data.emails_found,
        failedScrape: data.failed_scrape,
      })

      // Update status message with email scraper stats
      setStatusMessage(
        `Email scraper status: ${data.pending_scrape} pending, ${data.emails_found} emails found, ${data.failed_scrape} failed out of ${data.total_records} total records`,
      )
      setIsProcessing(false)
    } catch (error) {
      console.error("Error checking email scraper status:", error)
      setStatusMessage(
        `Error checking email scraper status: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
      setIsProcessing(false)
    }
  }

  // Start email scraping
  const startEmailScraping = async () => {
    if (!selectedCity) {
      alert("Please select a valid city first")
      return
    }

    try {
      setStatusMessage("Starting email scraping...")
      setIsProcessing(true)

      // Direct call to Flask API to start email scraping
      const scrapeUrl = `${FLASK_API_URL}/api/scrapeES?db_name=${encodeURIComponent(selectedCity.area_covered)}&collection=${encodeURIComponent(keyword || "restaurants")}`
      console.log("Starting email scrape with URL:", scrapeUrl)

      const response = await fetch(scrapeUrl)

      if (!response.ok) {
        throw new Error(`Email scrape initiation failed with status: ${response.status}`)
      }

      const data = await response.json()
      console.log("Email scrape initiation response:", data)

      // Store task state and start polling
      setTaskState({
        taskId: data.task_id,
        statusUrl: data.status_url,
        status: "running",
        progress: 0,
        message: data.message || "Email scraping started",
        totalRecords: data.pending_records,
        pendingRecords: data.pending_records,
        emailsFound: 0,
        failedScrape: 0,
      })

      setStatusMessage(`Email scrape initiated: ${data.message}`)
      setIsScraping(true)
      setActiveScraperType(ScraperType.EMAIL)

      // Start polling using the status URL from the response
      startStatusPolling(data.status_url, ScraperType.EMAIL)
    } catch (error) {
      console.error("Error initiating email scrape:", error)
      setStatusMessage(`Error initiating email scrape: ${error instanceof Error ? error.message : "Unknown error"}`)
      setIsScraping(false)
      setIsProcessing(false)
    }
  }

  // Update the handleStartClick function to always start the scraping process
  const handleStartClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()

    if (!selectedCity) {
      alert("Please select a valid city from the dropdown")
      return
    }

    setIsProcessing(true)
    setStatusMessage("Checking database status...")

    try {
      // Direct call to Flask API with auto_run_gmaps=true to start scraping immediately
      const scrapeUrl = `${FLASK_API_URL}/api/scrapePS?city=${encodeURIComponent(selectedCity.area_covered)}&keyword=${encodeURIComponent(keyword || "restaurant")}&auto_run_gmaps=true`
      console.log("Starting scrape with URL:", scrapeUrl)

      const scrapeResponse = await fetch(scrapeUrl)

      if (!scrapeResponse.ok) {
        throw new Error(`Scrape initiation failed with status: ${scrapeResponse.status}`)
      }

      const scrapeData = await scrapeResponse.json()
      console.log("Scrape initiation response:", scrapeData)

      // Handle different response statuses
      if (scrapeData.status === "gmaps_started") {
        // Google Maps scraping started
        setTaskState({
          taskId: scrapeData.gmaps_task_id,
          statusUrl: scrapeData.gmaps_status_url,
          status: "running",
          progress: 0,
          message: scrapeData.message || "Google Maps scraping started",
        })

        setStatusMessage(`Scrape initiated: ${scrapeData.message}`)
        setIsScraping(true)
        setActiveScraperType(ScraperType.GMAPS)

        // Start polling using the status URL from the response
        startStatusPolling(scrapeData.gmaps_status_url, ScraperType.GMAPS)
      } else if (scrapeData.status === "exists") {
        // Data exists but no scraping started
        setStatusMessage(`${scrapeData.message}. Use auto_run_gmaps=true to start scraping.`)
        setIsProcessing(false)
      } else if (scrapeData.task_id) {
        // Postcode scraping started
        setTaskState({
          taskId: scrapeData.task_id,
          statusUrl: scrapeData.status_url || `/api/statusPS/${scrapeData.task_id}`,
          status: "running",
          progress: 0,
          message: scrapeData.message || "Postcode scraping started",
        })

        setStatusMessage(`Scrape initiated: ${scrapeData.message}`)
        setIsScraping(true)
        setActiveScraperType(ScraperType.GMAPS)

        // Start polling using the status URL from the response
        startStatusPolling(scrapeData.status_url || `/api/statusPS/${scrapeData.task_id}`, ScraperType.GMAPS)
      } else {
        // Unknown status
        setStatusMessage(`Scrape response: ${scrapeData.message || "Unknown status"}`)
        setIsProcessing(false)
      }
    } catch (error) {
      console.error("Error initiating scrape:", error)
      setStatusMessage(`Error initiating scrape: ${error instanceof Error ? error.message : "Unknown error"}`)
      setIsScraping(false)
      setIsProcessing(false)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  return (
    <div className="container">
      <h1>Restaurant Scraper</h1>
      <div className="card">
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
              ref={inputRef}
              autoComplete="off"
              disabled={isProcessing}
            />
            {isSearching && <div className="search-loader"></div>}

            {showDropdown && (
              <div className="city-dropdown" ref={dropdownRef}>
                {cityResults.length > 0 ? (
                  cityResults.map((city) => (
                    <div key={city._id} className="city-option" onClick={() => handleCitySelect(city)}>
                      <div className="city-name">{city.area_covered}</div>
                      <div className="postcode-area">{city.postcode_area}</div>
                    </div>
                  ))
                ) : (
                  <div className="no-results">
                    {city.trim().length >= 2 && !isSearching ? (
                      <div className="not-in-db">City not in database</div>
                    ) : (
                      <div>Enter at least 2 characters</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {showDropdown && cityResults.length === 0 && !isSearching && city.trim().length >= 2 && (
              <div className="city-dropdown" ref={dropdownRef}>
                <div className="no-results">No cities found</div>
              </div>
            )}
          </div>

          {selectedCity && (
            <div className="selected-city-info">
              <div className="info-item">
                <span className="info-label">Postcode Area:</span>
                <span className="info-value">{selectedCity.postcode_area}</span>
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
            placeholder="Enter keyword to search (e.g. restaurant, cafe)"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            disabled={isProcessing}
          />
        </div>

        <div className="button-container">
          {!isScraping ? (
            <>
              <button className="btn btn-primary" disabled={!selectedCity || isProcessing} onClick={handleStartClick}>
                {isProcessing ? "Processing..." : "Start GMaps Scraper"}
              </button>
              <button
                className="btn btn-secondary"
                disabled={!selectedCity || isProcessing}
                onClick={startEmailScraping}
              >
                Start Email Scraper
              </button>
              <button
                className="btn btn-outline"
                disabled={!selectedCity || isProcessing}
                onClick={checkEmailScraperStatus}
              >
                Check Email Status
              </button>
            </>
          ) : (
            <button className="btn btn-danger" onClick={terminateScraping} disabled={!taskState?.taskId}>
              Terminate {activeScraperType === ScraperType.GMAPS ? "GMaps" : "Email"} Scraping
            </button>
          )}

          {/* Only show this button when a scrape has been initiated or completed */}
          {(isScraping || taskState?.status === "completed") && (
            <button className="btn btn-outline" onClick={goToResults}>
              Go to Results
            </button>
          )}
        </div>

        {taskState?.taskId && (
          <div className="task-info">
            <span className="task-label">Active Task ID:</span>
            <span className="task-value">{taskState.taskId}</span>
          </div>
        )}

        {/* Show GMaps progress bar */}
        {activeScraperType === ScraperType.GMAPS && taskState?.status === "running" && taskState.totalSubsectors && (
          <div className="progress-container">
            <div className="progress-label">
              GMaps Progress: {taskState.progress}% (
              {taskState.totalSubsectors - (taskState.unprocessedSubsectors || 0)}/{taskState.totalSubsectors}{" "}
              subsectors)
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${taskState.progress}%` }}></div>
            </div>
          </div>
        )}

        {/* Show Email progress bar */}
        {activeScraperType === ScraperType.EMAIL && taskState?.status === "running" && taskState.totalRecords && (
          <div className="progress-container">
            <div className="progress-label">
              Email Progress: {taskState.progress}% ({taskState.emailsFound} emails found, {taskState.pendingRecords}{" "}
              pending, {taskState.failedScrape} failed)
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${taskState.progress}%` }}></div>
            </div>
          </div>
        )}

        {/* Show email scraper stats when available */}
        {emailScraperStats && !isScraping && (
          <div className="email-stats">
            <h3>Email Scraper Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Total Records:</span>
                <span className="stat-value">{emailScraperStats.totalRecords}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Pending Records:</span>
                <span className="stat-value">{emailScraperStats.pendingRecords}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Emails Found:</span>
                <span className="stat-value">{emailScraperStats.emailsFound}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Failed Scrapes:</span>
                <span className="stat-value">{emailScraperStats.failedScrape}</span>
              </div>
            </div>
          </div>
        )}

        {statusMessage && (
          <div className={`status-message ${statusMessage.includes("Error") ? "status-error" : ""}`}>
            {statusMessage}
            {isScraping && <div className="status-loader"></div>}
          </div>
        )}
      </div>
    </div>
  )
}
