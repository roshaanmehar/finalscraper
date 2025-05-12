"use client"

import type React from "react"

import { useState, useCallback, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import type { Restaurant } from "./actions"

type PaginationProps = {
  total: number
  pages: number
  currentPage: number
  limit: number
}

type SearchResultsProps = {
  initialRestaurants: Restaurant[]
  initialPagination: PaginationProps
  initialQuery: string
}

// Common search terms for auto-suggestions
const COMMON_SEARCH_TERMS = [
  "restaurant",
  "cafe",
  "coffee",
  "italian",
  "chinese",
  "indian",
  "thai",
  "pizza",
  "burger",
  "vegan",
  "vegetarian",
  "bakery",
  "pub",
  "bar",
  "bistro",
]

export default function SearchComponent({ initialRestaurants, initialPagination, initialQuery }: SearchResultsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(initialQuery)
  const [restaurants, setRestaurants] = useState(initialRestaurants)
  const [pagination, setPagination] = useState(initialPagination)
  const [isLoading, setIsLoading] = useState(false)
  const [sortOption, setSortOption] = useState("recent")
  const isInitialMount = useRef(true)
  const [showExportOptions, setShowExportOptions] = useState(false)
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchError, setSearchError] = useState("")
  const searchInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Load search history from localStorage on component mount
  useEffect(() => {
    const storedHistory = localStorage.getItem("searchHistory")
    if (storedHistory) {
      try {
        const parsedHistory = JSON.parse(storedHistory)
        if (Array.isArray(parsedHistory)) {
          setSearchHistory(parsedHistory.slice(0, 10)) // Keep only the 10 most recent searches
        }
      } catch (e) {
        console.error("Error parsing search history:", e)
      }
    }
  }, [])

  // Save search history to localStorage when it changes
  useEffect(() => {
    if (searchHistory.length > 0) {
      localStorage.setItem("searchHistory", JSON.stringify(searchHistory))
    }
  }, [searchHistory])

  // Handle clicks outside the suggestions dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Clean up any pending requests on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Escape special regex characters to prevent errors in search
  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  }

  // Generate search suggestions based on input and history
  const generateSuggestions = (input: string) => {
    if (!input.trim()) {
      // If input is empty, show recent searches
      setSuggestions(searchHistory.slice(0, 5))
      return
    }

    const escapedInput = escapeRegExp(input.toLowerCase())
    const inputRegex = new RegExp(escapedInput, "i")

    // First, check history matches
    const historyMatches = searchHistory.filter((term) => inputRegex.test(term)).slice(0, 3)

    // Then, check common terms
    const commonMatches = COMMON_SEARCH_TERMS.filter((term) => inputRegex.test(term)).slice(0, 3)

    // Combine unique matches
    const allSuggestions = [...new Set([...historyMatches, ...commonMatches])].slice(0, 5)
    setSuggestions(allSuggestions)
  }

  // Function to fetch search results
  const fetchSearchResults = useCallback(
    async (searchQuery: string, page = 1) => {
      // Don't refresh or redirect if search is empty, just use the current data
      if (!searchQuery.trim() && isInitialMount.current) {
        isInitialMount.current = false
        return
      }

      // Cancel any previous ongoing fetch
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Create a new AbortController for this fetch
      abortControllerRef.current = new AbortController()
      const signal = abortControllerRef.current.signal

      setIsLoading(true)
      setSearchError("")

      try {
        // Update URL without full page reload only if we have a query
        if (searchQuery.trim()) {
          const params = new URLSearchParams()
          params.set("query", searchQuery)
          if (page > 1) params.set("page", page.toString())

          // Update the URL to reflect the search
          router.push(`/results/search?${params.toString()}`, { scroll: false })

          // Add to search history if not already present
          if (!searchHistory.includes(searchQuery.trim())) {
            const newHistory = [searchQuery.trim(), ...searchHistory].slice(0, 10)
            setSearchHistory(newHistory)
          }
        } else {
          // If search is empty but not initial mount, stay on current page with current data
          if (!isInitialMount.current) {
            return
          }
        }

        // Fetch results from API
        const response = await fetch(`/api/search?query=${encodeURIComponent(searchQuery)}&page=${page}`, {
          signal,
        })

        if (!response.ok) {
          throw new Error(`Search failed with status: ${response.status}`)
        }

        const data = await response.json()

        setRestaurants(data.restaurants)
        setPagination(data.pagination)
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Error fetching search results:", error)
          setSearchError(`Search failed: ${error.message}`)
        }
      } finally {
        setIsLoading(false)
        isInitialMount.current = false
      }
    },
    [router, searchHistory],
  )

  // Debounced search function
  const debouncedSearch = useCallback(
    (value: string) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }

      searchTimeoutRef.current = setTimeout(() => {
        fetchSearchResults(value)
      }, 300)
    },
    [fetchSearchResults],
  )

  // Handle input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    generateSuggestions(value)
    setShowSuggestions(true)
    debouncedSearch(value)
  }

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion)
    setShowSuggestions(false)
    fetchSearchResults(suggestion)
  }

  // Handle search input focus
  const handleSearchFocus = () => {
    generateSuggestions(query)
    setShowSuggestions(true)
  }

  // Handle search form submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowSuggestions(false)
    fetchSearchResults(query)
  }

  // Handle sort change
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setSortOption(value)

    // Only resort the current results for display
    // For export, the sorting will be handled server-side
    const sortedRestaurants = [...restaurants]

    switch (value) {
      case "name":
        sortedRestaurants.sort((a, b) => a.businessname.localeCompare(b.businessname))
        break
      case "reviews":
        sortedRestaurants.sort((a, b) => (b.numberofreviews || 0) - (a.numberofreviews || 0))
        break
      case "recent":
      default:
        // For recent, we should re-sort by scraped_at
        sortedRestaurants.sort((a, b) => {
          const dateA = a.scraped_at ? new Date(a.scraped_at).getTime() : 0
          const dateB = b.scraped_at ? new Date(b.scraped_at).getTime() : 0
          return dateB - dateA
        })
        break
    }

    setRestaurants(sortedRestaurants)
  }

  // Generate pagination numbers
  const paginationNumbers = []
  const maxVisiblePages = 5

  if (pagination.pages <= maxVisiblePages) {
    for (let i = 1; i <= pagination.pages; i++) {
      paginationNumbers.push(i)
    }
  } else {
    paginationNumbers.push(1)

    let startPage = Math.max(2, pagination.currentPage - 1)
    let endPage = Math.min(pagination.pages - 1, pagination.currentPage + 1)

    if (pagination.currentPage <= 3) {
      endPage = 4
    }

    if (pagination.currentPage >= pagination.pages - 2) {
      startPage = pagination.pages - 3
    }

    if (startPage > 2) {
      paginationNumbers.push("...")
    }

    for (let i = startPage; i <= endPage; i++) {
      paginationNumbers.push(i)
    }

    if (endPage < pagination.pages - 1) {
      paginationNumbers.push("...")
    }

    paginationNumbers.push(pagination.pages)
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    fetchSearchResults(query, page)
  }

  // Function to export data as CSV
  const exportToCSV = async (exportAll = false) => {
    setIsLoading(true)

    let restaurantsToExport = []

    if (exportAll) {
      // Fetch all restaurants with valid emails
      try {
        const response = await fetch(`/api/search/export?query=${encodeURIComponent(query)}&sort=${sortOption}`)
        if (!response.ok) throw new Error("Failed to fetch all restaurants")
        const data = await response.json()
        restaurantsToExport = data.restaurants
      } catch (error) {
        console.error("Error fetching all restaurants:", error)
        alert("Failed to export all records. Please try again.")
        setIsLoading(false)
        return
      }
    } else {
      // Use current page restaurants
      restaurantsToExport = restaurants.filter((restaurant) => {
        if (!restaurant.email) return false

        if (Array.isArray(restaurant.email)) {
          return restaurant.email.some(
            (email) => email && email !== "N/A" && email !== "n/a" && email.trim() !== "" && email.includes("@"),
          )
        }

        return (
          restaurant.email !== "N/A" &&
          restaurant.email !== "n/a" &&
          restaurant.email.trim() !== "" &&
          restaurant.email.includes("@")
        )
      })
    }

    // If no restaurants to export, show alert
    if (restaurantsToExport.length === 0) {
      alert("No restaurants with valid emails to export")
      setIsLoading(false)
      return
    }

    // Create CSV header
    const headers = ["Business Name", "Email", "Phone", "Website", "Reviews"]

    // Create CSV rows
    const csvRows = [headers.join(",")]

    restaurantsToExport.forEach((restaurant) => {
      // Format emails
      let emails = ""
      if (Array.isArray(restaurant.email)) {
        emails = restaurant.email
          .filter((email) => email && email !== "N/A" && email !== "n/a" && email.trim() !== "")
          .join("; ")
      } else if (restaurant.email) {
        emails = restaurant.email
      }

      // Format phone
      const phone = restaurant.phonenumber || ""

      // Format website
      const website = restaurant.website || ""

      // Format reviews
      const reviews = restaurant.numberofreviews || 0

      // Escape fields for CSV
      const escapeCsvField = (field: string | number) => {
        const stringField = String(field)
        // If field contains comma, quote, or newline, wrap in quotes and escape quotes
        if (stringField.includes(",") || stringField.includes('"') || stringField.includes("\n")) {
          return `"${stringField.replace(/"/g, '""')}"`
        }
        return stringField
      }

      // Create row
      const row = [
        escapeCsvField(restaurant.businessname),
        escapeCsvField(emails),
        escapeCsvField(phone),
        escapeCsvField(website),
        escapeCsvField(reviews),
      ].join(",")

      csvRows.push(row)
    })

    // Create CSV content
    const csvContent = csvRows.join("\n")

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)

    // Create download link and click it
    const link = document.createElement("a")
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const exportType = exportAll ? "all" : "page"
    link.setAttribute("href", url)
    link.setAttribute("download", `restaurants-export-${exportType}-${timestamp}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setIsLoading(false)
  }

  // Clear search input and reset results
  const handleClearSearch = () => {
    setQuery("")
    setShowSuggestions(false)

    // Cancel any pending search requests
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    if (initialQuery === "") {
      // If we're on the main results page, just reset to initial data
      setRestaurants(initialRestaurants)
      setPagination(initialPagination)

      // Update URL to remove query parameters
      router.push("/results", { scroll: false })
    } else {
      // If we're on a search page, navigate back to main results
      router.push("/results")
    }

    // Focus the search input after clearing
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }

  // Highlight matching text in search results
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim() || !text) return text

    try {
      const escapedQuery = escapeRegExp(query)
      const parts = text.split(new RegExp(`(${escapedQuery})`, "gi"))

      return parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={i} className="highlight">
            {part}
          </span>
        ) : (
          part
        ),
      )
    } catch (e) {
      // If regex fails, return the original text
      return text
    }
  }

  // Better highlight phone numbers that might be formatted differently
  const highlightPhoneMatch = (phoneText: string | number, query: string) => {
    if (!query.trim() || !phoneText) return phoneText

    const phoneStr = String(phoneText)
    const queryDigits = query.replace(/[^0-9]/g, "")

    if (!queryDigits) {
      return phoneStr
    }

    try {
      // If query digits found in phone, highlight them
      const phoneDigits = phoneStr.replace(/[^0-9]/g, "")
      const phoneDigitsIndex = phoneDigits.indexOf(queryDigits)

      if (phoneDigitsIndex >= 0) {
        // Create parts array with highlighted digits
        let currentPos = 0
        let displayPhone = ""
        let isHighlighting = false

        for (let i = 0; i < phoneStr.length; i++) {
          const char = phoneStr[i]
          const isDigit = /[0-9]/.test(char)

          if (isDigit) {
            // If we're at the position where match starts
            if (currentPos === phoneDigitsIndex && !isHighlighting) {
              displayPhone += '<span class="highlight">'
              isHighlighting = true
            }

            // If we're at the position where match ends
            if (currentPos === phoneDigitsIndex + queryDigits.length && isHighlighting) {
              displayPhone += "</span>"
              isHighlighting = false
            }

            currentPos++
          }

          displayPhone += char
        }

        // Close highlight span if still open
        if (isHighlighting) {
          displayPhone += "</span>"
        }

        return <span dangerouslySetInnerHTML={{ __html: displayPhone }} />
      }
    } catch (e) {
      // In case of regex errors, return the original
      return phoneStr
    }

    return phoneStr
  }

  return (
    <>
      <div className="card">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <div className="search-controls">
            <div className="search-wrapper">
              <div className="search-input-container">
                <input
                  type="text"
                  name="query"
                  placeholder="Search by name, email, or phone..."
                  className="search-input"
                  value={query}
                  onChange={handleSearchChange}
                  onFocus={handleSearchFocus}
                  ref={searchInputRef}
                  aria-label="Search restaurants"
                  autoComplete="off"
                />
                {query && (
                  <button type="button" className="clear-search" onClick={handleClearSearch} aria-label="Clear search">
                    ×
                  </button>
                )}
                {isLoading && <div className="search-loader"></div>}
              </div>

              {showSuggestions && suggestions.length > 0 && (
                <div className="search-suggestions" ref={suggestionsRef}>
                  {suggestions.map((suggestion, index) => (
                    <div key={index} className="suggestion-item" onClick={() => handleSuggestionClick(suggestion)}>
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="action-controls">
              <div className="sort-wrapper">
                <label htmlFor="sort">Sort by:</label>
                <select id="sort" className="sort-select" value={sortOption} onChange={handleSortChange}>
                  <option value="recent">Most Recent</option>
                  <option value="name">Business Name (A-Z)</option>
                  <option value="reviews">Most Reviews</option>
                </select>
              </div>

              <div className="export-container">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowExportOptions(!showExportOptions)}
                  disabled={isLoading}
                >
                  Export
                </button>
                {showExportOptions && (
                  <div className="export-dropdown">
                    <button
                      type="button"
                      onClick={() => {
                        exportToCSV(false)
                        setShowExportOptions(false)
                      }}
                    >
                      Export Current Page
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        exportToCSV(true)
                        setShowExportOptions(false)
                      }}
                    >
                      Export All Records
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>

      {searchError && (
        <div className="search-error">
          <p>{searchError}</p>
          <button onClick={() => setSearchError("")} className="close-error">
            ×
          </button>
        </div>
      )}

      <div className="results-summary">
        {query ? (
          <span>
            Found {pagination.total} restaurants matching "{query}" with valid emails
          </span>
        ) : (
          <span>Found {pagination.total} restaurants with valid emails</span>
        )}
      </div>

      <div className={`results-grid ${isLoading ? "loading-fade" : ""}`}>
        {restaurants.length > 0 ? (
          restaurants.map((restaurant) => (
            <div className="result-card" key={restaurant._id}>
              <h3 className="business-name">
                {query ? highlightMatch(restaurant.businessname, query) : restaurant.businessname}
              </h3>
              <div className="business-details">
                <div className="detail-item">
                  <span className="detail-label">Email:</span>
                  <div className="email-list">
                    {Array.isArray(restaurant.email) ? (
                      restaurant.email
                        .filter((email) => email && email !== "N/A" && email !== "n/a" && email.trim() !== "")
                        .map((email, index) => (
                          <span key={index} className="detail-value">
                            {query && email.includes("@") ? highlightMatch(email, query) : email}
                          </span>
                        ))
                    ) : (
                      <span className="detail-value">
                        {query && restaurant.email && restaurant.email.includes("@")
                          ? highlightMatch(restaurant.email, query)
                          : restaurant.email}
                      </span>
                    )}
                  </div>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Phone:</span>
                  <span className="detail-value">
                    {restaurant.phonenumber
                      ? query
                        ? highlightPhoneMatch(restaurant.phonenumber, query)
                        : restaurant.phonenumber
                      : "No phone available"}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Website:</span>
                  {restaurant.website ? (
                    <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="website-link">
                      Visit Website
                    </a>
                  ) : (
                    <span className="detail-value no-data">No website available</span>
                  )}
                </div>
                {restaurant.numberofreviews && (
                  <div className="detail-item">
                    <span className="detail-label">Reviews:</span>
                    <span className="detail-value">{restaurant.numberofreviews} reviews</span>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="no-results">
            {isLoading ? (
              <div className="results-loading">
                <div className="results-loader"></div>
                <p>Searching...</p>
              </div>
            ) : (
              <>
                <p>No restaurants found matching "{query}" with valid emails</p>
                <button onClick={handleClearSearch} className="btn btn-outline btn-sm">
                  Clear Search
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {pagination.pages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            disabled={pagination.currentPage === 1 || isLoading}
            onClick={() => handlePageChange(Math.max(1, pagination.currentPage - 1))}
          >
            Previous
          </button>
          <div className="pagination-numbers">
            {paginationNumbers.map((num, index) =>
              typeof num === "number" ? (
                <button
                  key={index}
                  className={`pagination-number ${pagination.currentPage === num ? "active" : ""}`}
                  onClick={() => handlePageChange(num)}
                  disabled={isLoading}
                >
                  {num}
                </button>
              ) : (
                <span key={index} className="pagination-ellipsis">
                  {num}
                </span>
              ),
            )}
          </div>
          <button
            className="pagination-btn"
            disabled={pagination.currentPage === pagination.pages || isLoading}
            onClick={() => handlePageChange(Math.min(pagination.pages, pagination.currentPage + 1))}
          >
            Next
          </button>
        </div>
      )}

      <div className="navigation">
        <Link href="/">
          <button className="btn btn-outline">Back to Search</button>
        </Link>
      </div>
      {/* Add the click outside handler to close the dropdown */}
      {showExportOptions && <div className="overlay" onClick={() => setShowExportOptions(false)}></div>}
    </>
  )
}
