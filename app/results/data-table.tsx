"use client"

import React, { useState } from "react"
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
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

  // Toggle row expansion
  const toggleRowExpansion = (id: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  // Get common fields from data
  const getCommonFields = () => {
    if (data.length === 0) return []

    // Count field occurrences across all records
    const fieldCounts: Record<string, number> = {}
    data.forEach((item) => {
      Object.keys(item).forEach((key) => {
        fieldCounts[key] = (fieldCounts[key] || 0) + 1
      })
    })

    // Get fields that appear in at least 50% of records
    const commonFields = Object.entries(fieldCounts)
      .filter(([_, count]) => count >= data.length * 0.5)
      .map(([field]) => field)

    // Prioritize important fields
    const priorityFields = ["_id", "businessname", "name", "address", "phonenumber", "email", "emailstatus"]

    // Sort fields by priority, then by name
    return [
      ...priorityFields.filter((field) => commonFields.includes(field)),
      ...commonFields.filter((field) => !priorityFields.includes(field)),
    ].slice(0, 8) // Limit to 8 columns for readability
  }

  const commonFields = getCommonFields()

  // Format field value for display
  const formatValue = (value: any) => {
    if (value === null || value === undefined) return "N/A"
    if (typeof value === "object") return JSON.stringify(value)
    return String(value)
  }

  // Generate pagination links
  const generatePaginationLinks = () => {
    const { pages, currentPage } = pagination
    const links = []

    // Previous page
    if (currentPage > 1) {
      links.push(
        <Link
          href={`/results/data?db=${db}&collection=${collection}&page=${currentPage - 1}`}
          key="prev"
          className="pagination-link"
        >
          &laquo; Previous
        </Link>,
      )
    }

    // Page numbers
    const startPage = Math.max(1, currentPage - 2)
    const endPage = Math.min(pages, startPage + 4)

    for (let i = startPage; i <= endPage; i++) {
      links.push(
        <Link
          href={`/results/data?db=${db}&collection=${collection}&page=${i}`}
          key={i}
          className={`pagination-link ${i === currentPage ? "active" : ""}`}
        >
          {i}
        </Link>,
      )
    }

    // Next page
    if (currentPage < pages) {
      links.push(
        <Link
          href={`/results/data?db=${db}&collection=${collection}&page=${currentPage + 1}`}
          key="next"
          className="pagination-link"
        >
          Next &raquo;
        </Link>,
      )
    }

    return links
  }

  if (data.length === 0) {
    return (
      <div className="no-data">
        <p>No data found in this collection.</p>
      </div>
    )
  }

  return (
    <div className="data-table-container">
      <div className="pagination-info">
        Showing {data.length} of {pagination.total} records (Page {pagination.currentPage} of {pagination.pages})
      </div>

      <table className="data-table">
        <thead>
          <tr>
            {commonFields.map((field) => (
              <th key={field}>{field}</th>
            ))}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => {
            const id = item._id.toString()
            const isExpanded = expandedRows[id]

            return (
              <React.Fragment key={id}>
                <tr className={isExpanded ? "expanded" : ""}>
                  {commonFields.map((field) => (
                    <td key={`${id}-${field}`}>{formatValue(item[field])}</td>
                  ))}
                  <td>
                    <button className="btn btn-sm btn-outline" onClick={() => toggleRowExpansion(id)}>
                      View Details
                    </button>
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="expanded-row" key={`expanded-${id}`}>
                    <td colSpan={commonFields.length + 1}>
                      <div className="expanded-content">
                        <h4>Full Record Details</h4>
                        <div className="record-details">
                          {Object.entries(item).map(([key, value]) => (
                            <div className="detail-item" key={`detail-${id}-${key}`}>
                              <span className="detail-label">{key}:</span>
                              <span className="detail-value">{formatValue(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>

      <div className="pagination">{generatePaginationLinks()}</div>
    </div>
  )
}
