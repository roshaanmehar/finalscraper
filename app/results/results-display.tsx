"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { getDatabases, getCollections } from "./db-actions"
import type { Restaurant } from "./actions"
import RestaurantCard from "./restaurant-card"
import { useRouter } from "next/navigation"

interface ResultsDisplayProps {
  initialCity?: string
  initialKeyword?: string
}

export default function ResultsDisplay({ initialCity = "Leeds", initialKeyword = "restaurants" }: ResultsDisplayProps) {
  const [databases, setDatabases] = useState<string[]>([])
  const [collections, setCollections] = useState<string[]>([])
  const [selectedDb, setSelectedDb] = useState<string>(initialCity)
  const [selectedCollection, setSelectedCollection] = useState<string>(initialKeyword)
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState<Restaurant[]>([])
  const [totalResults, setTotalResults] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [sortBy, setSortBy] = useState<string>("recent")
  const [searchQuery, setSearchQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const resultsPerPage = 20
  const router = useRouter()

  // Load databases on component mount
  useEffect(() => {
    const loadDatabases = async () => {
      try {
        setLoading(true)
        setError(null)
        const dbs = await getDatabases()
        setDatabases(dbs)

        // Set default database to initialCity or the first available
        const defaultDb =
          initialCity && dbs.find((db) => db.toLowerCase() === initialCity.toLowerCase())
            ? initialCity
            : dbs.length > 0
              ? dbs[0]
              : ""

        if (defaultDb) {
          setSelectedDb(defaultDb)

          // Load collections for the default database
          const cols = await getCollections(defaultDb)
          const filteredCols = cols.filter((col) => !col.includes("subsector"))
          setCollections(filteredCols)

          // Set default collection to initialKeyword or the first available
          const defaultCollection =
            (initialKeyword && filteredCols.find((col) => col.toLowerCase().includes(initialKeyword.toLowerCase()))) ||
            (filteredCols.length > 0 ? filteredCols[0] : "")

          setSelectedCollection(defaultCollection)

          // Load initial results
          if (defaultCollection) {
            await fetchResults(defaultDb, defaultCollection, 1, sortBy, searchQuery)
          }
        }
      } catch (error) {
        console.error("Error loading databases:", error)
        setError("Failed to load databases. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    loadDatabases()
  }, [initialCity, initialKeyword])

  // Handle database selection change
  const handleDbChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const db = e.target.value
    setSelectedDb(db)
    setSelectedCollection("")
    setResults([])
    setError(null)

    if (db) {
      try {
        setLoading(true)
        const cols = await getCollections(db)
        const filteredCols = cols.filter((col) => !col.includes("subsector"))
        setCollections(filteredCols)

        if (filteredCols.length > 0) {
          setSelectedCollection(filteredCols[0])
          await fetchResults(db, filteredCols[0], 1, sortBy, searchQuery)
        }
      } catch (error) {
        console.error(`Error loading collections for ${db}:`, error)
        setError(`Failed to load collections for ${db}. Please try again later.`)
      } finally {
        setLoading(false)
      }
    }
  }

  // Handle collection selection change
  const handleCollectionChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const collection = e.target.value
    setSelectedCollection(collection)
    setError(null)

    if (selectedDb && collection) {
      await fetchResults(selectedDb, collection, 1, sortBy, searchQuery)
    }
  }

  // Handle sort change
  const handleSortChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSortBy = e.target.value
    setSortBy(newSortBy)
    setError(null)

    if (selectedDb && selectedCollection) {
      await fetchResults(selectedDb, selectedCollection, 1, newSortBy, searchQuery)
    }
  }

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  // Handle search submission
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (selectedDb && selectedCollection) {
      await fetchResults(selectedDb, selectedCollection, 1, sortBy, searchQuery)
    }
  }

  // Handle page change
  const handlePageChange = async (page: number) => {
    if (page < 1 || page > totalPages) return

    setCurrentPage(page)
    await fetchResults(selectedDb, selectedCollection, page, sortBy, searchQuery)
  }

  // Fetch results from the API
  const fetchResults = async (db: string, collection: string, page: number, sort: string, query = "") => {
    try {
      setLoading(true)
      setError(null)

      // Build the API URL
      let url = `/api/results?db=${encodeURIComponent(db)}&collection=${encodeURIComponent(collection)}&page=${page}&limit=${resultsPerPage}&sort=${sort}`

      if (query) {
        url += `&query=${encodeURIComponent(query)}`
      }

      console.log(`Fetching results from: ${url}`)
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Error fetching results: ${response.statusText}`)
      }

      const data = await response.json()

      setResults(data.results || [])
      setTotalResults(data.pagination?.total || 0)
      setTotalPages(data.pagination?.pages || 1)
      setCurrentPage(data.pagination?.currentPage || 1)
    } catch (error) {
      console.error("Error fetching results:", error)
      setError("Failed to fetch results. Please try again later.")
      setResults([])
      setTotalResults(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  // Handle export button click
  const handleExport = () => {
    if (selectedDb && selectedCollection) {
      const queryParam = searchQuery ? `&query=${encodeURIComponent(searchQuery)}` : ""
      window.open(
        `/api/search/export?db=${selectedDb}&collection=${selectedCollection}&sort=${sortBy}${queryParam}`,
        "_blank",
      )
    }
  }

  // Generate pagination links
  const renderPagination = () => {
    if (totalPages <= 1) return null

    const pages = []
    const maxVisiblePages = 5

    // Previous button
    pages.push(
      <button
        key="prev"
        className="pagination-btn"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        &laquo; Prev
      </button>,
    )

    // Calculate range of page numbers to show
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    // Adjust if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    // Page number buttons
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          className={`pagination-btn ${i === currentPage ? "active" : ""}`}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </button>,
      )
    }

    // Next button
    pages.push(
      <button
        key="next"
        className="pagination-btn"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next &raquo;
      </button>,
    )

    return <div className="pagination">{pages}</div>
  }

  return (
    <div className="results-container">
      <div className="search-controls">
        <form onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            className="search-input"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </form>

        <div className="filter-controls">
          <div className="database-selector">
            <div className="selector-group">
              <label htmlFor="database">Database:</label>
              <select id="database" value={selectedDb} onChange={handleDbChange} disabled={loading}>
                <option value="">Select city</option>
                {databases.map((db) => (
                  <option key={db} value={db}>
                    {db}
                  </option>
                ))}
              </select>
            </div>

            <div className="selector-group">
              <label htmlFor="collection">Collection:</label>
              <select
                id="collection"
                value={selectedCollection}
                onChange={handleCollectionChange}
                disabled={loading || !selectedDb}
              >
                <option value="">Select collection</option>
                {collections.map((collection) => (
                  <option key={collection} value={collection}>
                    {collection}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="sort-control">
            <label htmlFor="sort">Sort by:</label>
            <select id="sort" className="sort-select" value={sortBy} onChange={handleSortChange}>
              <option value="recent">Most Recent</option>
              <option value="name">Name</option>
              <option value="reviews">Number of Reviews</option>
            </select>
          </div>

          <button className="export-btn" onClick={handleExport} disabled={!selectedDb || !selectedCollection}>
            Export
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading results...</p>
        </div>
      ) : results.length > 0 ? (
        <>
          <div className="results-summary">
            Showing {results.length} of {totalResults} results (Page {currentPage} of {totalPages})
          </div>

          <div className="results-grid">
            {results.map((restaurant) => (
              <RestaurantCard key={restaurant._id} restaurant={restaurant} />
            ))}
          </div>

          {renderPagination()}
        </>
      ) : (
        <div className="no-results">
          <p>No results found. Please try a different search or select another database/collection.</p>
        </div>
      )}
    </div>
  )
}
