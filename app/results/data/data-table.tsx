"use client"

import React from "react"

import { useState } from "react"
import { getCollectionData } from "../db-actions"

interface Pagination {
  total: number
  pages: number
  currentPage: number
  limit: number
}

interface DataTableProps {
  data: any[]
  pagination: Pagination
  db: string
  collection: string
}

export default function DataTable({ data, pagination, db, collection }: DataTableProps) {
  const [currentData, setCurrentData] = useState(data)
  const [currentPagination, setCurrentPagination] = useState(pagination)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Toggle row expansion
  const toggleRowExpansion = (id: string) => {
    if (expandedRow === id) {
      setExpandedRow(null)
    } else {
      setExpandedRow(id)
    }
  }

  // Handle page change
  const handlePageChange = async (page: number) => {
    try {
      setIsLoading(true)
      const result = await getCollectionData(db, collection, page, currentPagination.limit)
      setCurrentData(result.data)
      setCurrentPagination(result.pagination)
    } catch (error) {
      console.error("Error fetching page data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Generate pagination links
  const generatePaginationLinks = () => {
    const links = []
    const currentPage = currentPagination.currentPage
    const totalPages = currentPagination.pages

    // Previous page link
    if (currentPage > 1) {
      links.push(
        <button
          key="prev"
          onClick={() => handlePageChange(currentPage - 1)}
          className="pagination-link"
          disabled={isLoading}
        >
          &laquo; Previous
        </button>,
      )
    }

    // Page number links
    const startPage = Math.max(1, currentPage - 2)
    const endPage = Math.min(totalPages, startPage + 4)

    for (let i = startPage; i <= endPage; i++) {
      links.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`pagination-link ${i === currentPage ? "active" : ""}`}
          disabled={isLoading || i === currentPage}
        >
          {i}
        </button>,
      )
    }

    // Next page link
    if (currentPage < totalPages) {
      links.push(
        <button
          key="next"
          onClick={() => handlePageChange(currentPage + 1)}
          className="pagination-link"
          disabled={isLoading}
        >
          Next &raquo;
        </button>,
      )
    }

    return links
  }

  // If no data, show a message
  if (currentData.length === 0) {
    return (
      <div className="card">
        <h2>No Data Found</h2>
        <p>No records found in this collection.</p>
      </div>
    )
  }

  // Get common fields from the first item to use as table headers
  const firstItem = currentData[0]
  const commonFields = Object.keys(firstItem)
    .filter(
      (key) =>
        // Exclude long text fields and arrays from table view
        typeof firstItem[key] !== "object" && !Array.isArray(firstItem[key]) && key !== "_id", // We'll handle _id separately
    )
    .slice(0, 5) // Limit to first 5 fields for readability

  return (
    <div className="data-table-container">
      <div className="data-summary">
        Showing {currentData.length} of {currentPagination.total} records (Page {currentPagination.currentPage} of{" "}
        {currentPagination.pages})
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              {commonFields.map((field) => (
                <th key={field}>{field}</th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((item) => (
              <React.Fragment key={item._id}>
                <tr>
                  <td>{item._id.substring(0, 8)}...</td>
                  {commonFields.map((field) => (
                    <td key={`${item._id}-${field}`}>
                      {typeof item[field] === "string" && item[field].length > 50
                        ? `${item[field].substring(0, 50)}...`
                        : String(item[field] || "")}
                    </td>
                  ))}
                  <td>
                    <button className="btn btn-sm" onClick={() => toggleRowExpansion(item._id)}>
                      {expandedRow === item._id ? "Hide Details" : "View Details"}
                    </button>
                  </td>
                </tr>
                {expandedRow === item._id && (
                  <tr className="expanded-row">
                    <td colSpan={commonFields.length + 2}>
                      <div className="expanded-content">
                        <h3>Full Record Details</h3>
                        <pre>{JSON.stringify(item, null, 2)}</pre>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {currentPagination.pages > 1 && <div className="pagination">{generatePaginationLinks()}</div>}
    </div>
  )
}
