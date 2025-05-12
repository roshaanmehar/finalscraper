import { Suspense } from "react"
import DatabaseSelector from "./database-selector"
import Link from "next/link"
import "./results.css"

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  // Get city and keyword from search params
  const cityParam = searchParams.city
  const city = typeof cityParam === "string" ? cityParam : undefined

  const keywordParam = searchParams.keyword
  const keyword = typeof keywordParam === "string" ? keywordParam : undefined

  return (
    <div className="container">
      <h1>Search Results</h1>

      <div className="search-controls">
        <input type="text" placeholder="Search by name, email, or phone..." className="search-input" />

        <div className="filter-controls">
          <Suspense fallback={<div>Loading...</div>}>
            <DatabaseSelector initialCity={city} initialKeyword={keyword} />
          </Suspense>

          <div className="sort-control">
            <label htmlFor="sort">Sort by:</label>
            <select id="sort" className="sort-select">
              <option value="recent">Most Recent</option>
              <option value="name">Name</option>
              <option value="email">Email</option>
            </select>
          </div>

          <button className="export-btn">Export</button>
        </div>
      </div>

      <div className="results-container">
        {/* Results will be loaded here when a database and collection are selected */}
        {!city && !keyword && (
          <div className="instructions">
            <p>Select a database and collection to view results.</p>
            <p>
              Or go to the <Link href="/">Scrape page</Link> to collect new data.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
