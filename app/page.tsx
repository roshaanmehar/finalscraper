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

export default function ScrapePage() {
  const router = useRouter()
  const [city, setCity] = useState("Aberdeen")
  const [keyword, setKeyword] = useState("restaurants")
  const [isSearching, setIsSearching] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [cityResults, setCityResults] = useState<City[]>([])
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")
  const [progressInfo, setProgressInfo] = useState<{
    total: number
    processed: number
    percentage: number
  } | null>(null)
  const [statusPolling, setStatusPolling] = useState<NodeJS.Timeout | null>(null)
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

  // Handle city input change
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

  // Function to start the scraping process
  const startScrape = async () => {
    setIsLoading(true)
    setStatusMessage("Starting scrape process...")

    try {
      // Call the API with the parameters - always include auto_run_gmaps=true and run_es_auto=true
      const scrapeUrl = `${FLASK_API_URL}/api/scrapePS?city=${encodeURIComponent(city)}&keyword=${encodeURIComponent(keyword)}&auto_run_gmaps=true&run_es_auto=true`
      console.log("Starting scrape with URL:", scrapeUrl)

      const response = await fetch(scrapeUrl)

      if (!response.ok) {
        throw new Error(`Scrape initiation failed with status: ${response.status}`)
      }

      const data = await response.json()
      console.log("Scrape initiation response:", data)

      // Update UI with response data
      setStatusMessage(`${data.message}`)

      // Start polling for status updates if we have a status URL
      if (data.gmaps_status_url) {
        startStatusPolling(data.gmaps_status_url)
      } else {
        setIsLoading(false)
      }
    } catch (error) {
      console.error("Error starting scrape:", error)
      setStatusMessage(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
      setIsLoading(false)
    }
  }

  // Function to poll for status updates
  const startStatusPolling = (statusUrl: string) => {
    // First get status immediately
    fetchScraperStatus(statusUrl)

    // Then set up polling
    const intervalId = setInterval(() => fetchScraperStatus(statusUrl), 5000)
    setStatusPolling(intervalId)
  }

  // Function to fetch scraper status
  const fetchScraperStatus = async (statusUrl: string) => {
    try {
      const response = await fetch(`${FLASK_API_URL}${statusUrl}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch status: ${response.status}`)
      }

      const data = await response.json()
      console.log("Status update:", data)

      // Update progress information
      if (data.total_subsectors && data.unprocessed_subsectors !== undefined) {
        const processed = data.total_subsectors - data.unprocessed_subsectors
        const percentage = Math.round((processed / data.total_subsectors) * 100)

        setProgressInfo({
          total: data.total_subsectors,
          processed,
          percentage,
        })
      }

      // Update status message based on status
      if (data.status === "running") {
        setStatusMessage(
          `Scraping in progress: ${data.unprocessed_subsectors} subsectors remaining out of ${data.total_subsectors}`,
        )
      } else if (data.status === "completed") {
        setStatusMessage("Scraping completed successfully!")
        if (statusPolling) {
          clearInterval(statusPolling)
          setStatusPolling(null)
        }
        setIsLoading(false)
      } else if (data.status === "error") {
        setStatusMessage(`Error during scraping: ${data.message || "Unknown error"}`)
        if (statusPolling) {
          clearInterval(statusPolling)
          setStatusPolling(null)
        }
        setIsLoading(false)
      }
    } catch (error) {
      console.error("Error polling status:", error)
      setStatusMessage(`Error checking status: ${error instanceof Error ? error.message : "Unknown error"}`)
      if (statusPolling) {
        clearInterval(statusPolling)
        setStatusPolling(null)
      }
      setIsLoading(false)
    }
  }

  // Function to navigate to results page
  const goToResults = () => {
    router.push("/results")
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
              disabled={isLoading}
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
            disabled={isLoading}
          />
        </div>

        <div className="button-container">
          {/* Single Start Scrape Button */}
          <button className="btn btn-primary" onClick={startScrape} disabled={isLoading}>
            {isLoading ? "Scraping in Progress..." : "Start Scrape"}
          </button>

          {/* Go to Results Button */}
          <button className="btn btn-outline" onClick={goToResults}>
            View Results
          </button>
        </div>

        {/* Progress bar */}
        {progressInfo && (
          <div className="progress-container">
            <div className="progress-label">
              Progress: {progressInfo.percentage}% ({progressInfo.processed}/{progressInfo.total} subsectors processed)
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progressInfo.percentage}%` }}></div>
            </div>
          </div>
        )}

        {/* Status message */}
        {statusMessage && (
          <div className={`status-message ${statusMessage.includes("Error") ? "status-error" : ""}`}>
            {statusMessage}
            {isLoading && <div className="status-loader"></div>}
          </div>
        )}
      </div>
    </div>
  )
}
