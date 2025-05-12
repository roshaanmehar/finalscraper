import { getCollectionData } from "../db-actions"
import DataTable from "./data-table"
import Link from "next/link"

// Define the page component
export default async function DataPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  // Get database and collection parameters
  const dbParam = searchParams.db
  const db = typeof dbParam === "string" ? dbParam : ""

  const collectionParam = searchParams.collection
  const collection = typeof collectionParam === "string" ? collectionParam : ""

  // Get page parameter and parse it safely
  const pageParam = searchParams.page
  const page = typeof pageParam === "string" ? Number.parseInt(pageParam, 10) || 1 : 1

  // Get limit parameter and parse it safely
  const limitParam = searchParams.limit
  const limit = typeof limitParam === "string" ? Number.parseInt(limitParam, 10) || 20 : 20

  if (!db || !collection) {
    return (
      <div className="container">
        <h1>No Database or Collection Selected</h1>
        <p>Please select a database and collection to view data.</p>
        <Link href="/results" className="back-button">
          Back to Results
        </Link>
      </div>
    )
  }

  try {
    console.log(`Fetching data from ${db}.${collection}, page=${page}, limit=${limit}`)
    const { data, totalCount } = await getCollectionData(db, collection, page, limit)
    console.log(`Fetched ${data.length} documents from ${db}.${collection}`)

    const totalPages = Math.ceil(totalCount / limit)

    return (
      <div className="container">
        <h1>
          Database: {db} / Collection: {collection}
        </h1>

        <div className="action-buttons">
          <Link href="/results" className="back-button">
            Back to Results
          </Link>

          <div className="email-scraper-container">
            <Link href={`/results/email-scraper?db=${db}&collection=${collection}`} className="email-scraper-button">
              Start Email Scraper
            </Link>
          </div>
        </div>

        <div className="pagination-info">
          Showing {data.length} of {totalCount} records (Page {page} of {totalPages})
        </div>

        <DataTable data={data} />

        <div className="pagination">
          {page > 1 && (
            <Link
              href={`/results/data?db=${db}&collection=${collection}&page=${page - 1}&limit=${limit}`}
              className="pagination-button"
            >
              Previous
            </Link>
          )}

          <span className="pagination-info">
            Page {page} of {totalPages}
          </span>

          {page < totalPages && (
            <Link
              href={`/results/data?db=${db}&collection=${collection}&page=${page + 1}&limit=${limit}`}
              className="pagination-button"
            >
              Next
            </Link>
          )}
        </div>
      </div>
    )
  } catch (error) {
    console.error(`Error fetching data:`, error)
    return (
      <div className="container">
        <h1>Error Loading Data</h1>
        <p>
          There was an error loading data from {db}.{collection}.
        </p>
        <Link href="/results" className="back-button">
          Back to Results
        </Link>
      </div>
    )
  }
}
