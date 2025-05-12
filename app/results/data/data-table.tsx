"use client"

import { useState } from "react"
import Link from "next/link"

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
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  // Toggle row expansion
  const toggleRowExpansion = (id: string) => {
    if (expandedRow === id) {
      setExpandedRow(null)
    } else {
      setExpandedRow(id)
    }
  }

  // Generate pagination links
  const generatePaginationLinks = () => {
    // Ensure pagination object exists and has required properties
    if (!pagination || typeof pagination.pages !== "number" || typeof pagination.currentPage !== "number") {
      return null
    }

    const links = []
    const currentPage = pagination.currentPage
    const totalPages = pagination.pages

    // Previous page link
    if (currentPage > 1) {
      links.push(
        <Link
          key="prev"
          href={`/results/data?db=${encodeURIComponent(db)}&collection=${encodeURIComponent(collection)}&page=${currentPage - 1}&limit=${pagination.limit || 20}`}
          className="pagination-link"
        >
          &laquo; Previous
        </Link>,
      )
    }

    // Page number links
    const startPage = Math.max(1, currentPage - 2)
    const endPage = Math.min(totalPages, startPage + 4)

    for (let i = startPage; i <= endPage; i++) {
      links.push(
        <Link
          key={i}
          href={`/results/data?db=${encodeURIComponent(db)}&collection=${encodeURIComponent(collection)}&page=${i}&limit=${pagination.limit || 20}`}
          className={`pagination-link ${i === currentPage ? "active" : ""}`}
        >
          {i}
        </Link>,
      )
    }

    // Next page link
    if (currentPage < totalPages) {
      links.push(
        <Link
          key="next"
          href={`/results/data?db=${encodeURIComponent(db)}&collection=${encodeURIComponent(collection)}&page=${currentPage + 1}&limit=${pagination.limit || 20}`}
          className="pagination-link"
        >
          Next &raquo;
        </Link>,
      )
    }

    return links
  }

  // If no data, show a message
  if (data.length === 0) {
    return (
      <div className="card">
        <h2>No Data Found</h2>
        <p>No records found in this collection.</p>
      </div>
    )
  }

  // Get common fields from the first item to use as table headers
  const firstItem = data[0]
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
        {pagination && typeof pagination.total === "number"
          ? `Showing ${data.length} of ${pagination.total} records (Page ${pagination.currentPage} of ${pagination.pages})`
          : `Showing ${data.length} records`}
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
            {data.map((item) => (
              <>
                <tr key={item._id}>
                  <td>{item._id.substring(0, 8)}...</td>
                  {commonFields.map((field) => (
                    <td key={field}>
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
              </>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.pages > 1 && <div className="pagination">{generatePaginationLinks()}</div>}
    </div>
  )
}
