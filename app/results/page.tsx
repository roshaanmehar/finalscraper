import { Suspense } from "react"
import ResultsDisplay from "./results-display"
import "./results.css"

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  // Use Promise.resolve to properly handle searchParams
  const params = await Promise.resolve(searchParams)

  // Get city and keyword from search params, with defaults
  const cityParam = params.city
  const city = typeof cityParam === "string" ? cityParam : "Leeds"

  const keywordParam = params.keyword
  const keyword = typeof keywordParam === "string" ? keywordParam : "restaurants"

  return (
    <div className="container">
      <h1>Veda Scraper Results</h1>

      <Suspense fallback={<div className="loading-container">Loading results...</div>}>
        <ResultsDisplay initialCity={city} initialKeyword={keyword} />
      </Suspense>
    </div>
  )
}
