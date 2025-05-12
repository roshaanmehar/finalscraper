"use client"
import { useRouter, useSearchParams } from "next/navigation"
import { ScraperControlPanel } from "./scraper-control-panel"
import "./flask-connector.css"

export default function ScraperControlPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get city and keyword from URL parameters
  const cityParam = searchParams.get("city") || ""
  const keywordParam = searchParams.get("keyword") || "restaurants"

  return (
    <div className="container">
      <h1>Scraper Control Panel</h1>
      <ScraperControlPanel initialCity={cityParam} initialKeyword={keywordParam} />

      <div className="navigation-buttons">
        <button onClick={() => router.push("/")} className="back-button">
          Back to Home
        </button>
      </div>
    </div>
  )
}
