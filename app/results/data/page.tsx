import { Suspense } from "react"
import Link from "next/link"
import { getCollectionData } from "../db-actions"
import DataTable from "../data-table"
import "../results.css"

export default async function DataPage({
  searchParams,
}: {
  searchParams:
    | Promise<{ [key: string]: string | string[] | undefined }>
    | { [key: string]: string | string[] | undefined }
}) {
  // Await searchParams before accessing its properties
  const params = await searchParams

  // Get database and collection parameters
  const dbParam = params.db
  const db = typeof dbParam === "string" ? dbParam : ""

  const collectionParam = params.collection
  const collection = typeof collectionParam === "string" ? collectionParam : ""

  // Get page parameter and parse it safely
  const pageParam = params.page
  const page = typeof pageParam === "string" ? Number.parseInt(pageParam, 10) || 1 : 1

  // Get limit parameter and parse it safely
  const limitParam = params.limit
  const limit = typeof limitParam === "string" ? Number.parseInt(limitParam, 10) || 20 : 20

  if (!db || !collection) {
    return (
      <div className="container">
        <h1>Database Data</h1>
        <div className="no-data">
          <p>Please specify both database and collection parameters.</p>
          <Link href="/results">
            <button className="btn">Back to Results</button>
          </Link>
        </div>
      </div>
    )
  }

  try {
    // Get data from the specified database and collection
    const { data, pagination } = await getCollectionData(db, collection, page, limit)

    return (
      <div className="container">
        <h1>
          Database: {db} / Collection: {collection}
        </h1>

        <div className="navigation">
          <Link href="/results">
            <button className="btn">Back to Results</button>
          </Link>
        </div>

        <Suspense fallback={<div>Loading data...</div>}>
          <DataTable data={data} pagination={pagination} db={db} collection={collection} />
        </Suspense>
      </div>
    )
  } catch (error) {
    console.error(`Error fetching data from ${db}.${collection}:`, error)

    return (
      <div className="container">
        <h1>Database Data</h1>
        <div className="no-data">
          <p>
            An error occurred while fetching data from {db}.{collection}.
          </p>
          <Link href="/results">
            <button className="btn">Back to Results</button>
          </Link>
        </div>
      </div>
    )
  }
}
