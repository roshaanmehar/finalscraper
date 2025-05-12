"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getDatabases, getCollections } from "./db-actions"

interface DatabaseSelectorProps {
  initialCity?: string
  initialKeyword?: string
}

export default function DatabaseSelector({ initialCity, initialKeyword }: DatabaseSelectorProps) {
  const [databases, setDatabases] = useState<string[]>([])
  const [collections, setCollections] = useState<string[]>([])
  const [selectedDb, setSelectedDb] = useState<string>("")
  const [selectedCollection, setSelectedCollection] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Load databases on component mount
  useEffect(() => {
    const loadDatabases = async () => {
      try {
        setLoading(true)
        const dbs = await getDatabases()
        setDatabases(dbs)

        // If initialCity is provided, try to select it
        if (initialCity) {
          const matchingDb = dbs.find((db) => db.toLowerCase() === initialCity.toLowerCase())
          if (matchingDb) {
            setSelectedDb(matchingDb)
            // Load collections for this database
            const cols = await getCollections(matchingDb)
            // Filter out subsector collections
            const filteredCols = cols.filter((col) => !col.includes("subsector"))
            setCollections(filteredCols)

            // If initialKeyword is provided, try to find a matching collection
            if (initialKeyword) {
              const matchingCollection = filteredCols.find((col) =>
                col.toLowerCase().includes(initialKeyword.toLowerCase()),
              )
              if (matchingCollection) {
                setSelectedCollection(matchingCollection)
              } else if (filteredCols.length > 0) {
                setSelectedCollection(filteredCols[0])
              }
            } else if (filteredCols.length > 0) {
              setSelectedCollection(filteredCols[0])
            }
          }
        }
      } catch (error) {
        console.error("Error loading databases:", error)
      } finally {
        setLoading(false)
      }
    }

    loadDatabases()
  }, [initialCity, initialKeyword])

  // Load collections when database selection changes
  const handleDbChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const db = e.target.value
    setSelectedDb(db)
    setSelectedCollection("")

    if (db) {
      try {
        setLoading(true)
        const cols = await getCollections(db)
        // Filter out subsector collections
        const filteredCols = cols.filter((col) => !col.includes("subsector"))
        setCollections(filteredCols)
      } catch (error) {
        console.error(`Error loading collections for ${db}:`, error)
      } finally {
        setLoading(false)
      }
    } else {
      setCollections([])
    }
  }

  // Handle collection selection
  const handleCollectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCollection(e.target.value)
  }

  // Handle view button click
  const handleViewClick = () => {
    if (selectedDb && selectedCollection) {
      router.push(`/results/data?db=${selectedDb}&collection=${selectedCollection}`)
    }
  }

  return (
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

      <button className="view-btn" onClick={handleViewClick} disabled={loading || !selectedDb || !selectedCollection}>
        View
      </button>
    </div>
  )
}
