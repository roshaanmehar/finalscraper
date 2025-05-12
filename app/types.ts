export type City = {
  _id: string
  postcode_area: string
  area_covered: string
  population_2011: number
  households_2011: number
  postcodes: number
  active_postcodes: number
  non_geographic_postcodes: number
  scraped_at: string
}

export type ScrapeStatus = {
  status: "idle" | "running" | "completed" | "error" | "unknown"
  message: string
  lastRun: string | null
  recentLogs?: string[]
  error?: string
}
