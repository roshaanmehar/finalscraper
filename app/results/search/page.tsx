import { searchRestaurants } from "../actions"
import SearchComponent from "../search-component"

export default async function SearchResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // Await searchParams before accessing its properties
  const params = await searchParams

  // Get search parameters and parse them safely
  const queryParam = params.query
  const pageParam = params.page

  const query = typeof queryParam === "string" ? queryParam : ""
  const page = typeof pageParam === "string" ? Number.parseInt(pageParam, 10) : 1

  console.log(`Searching for "${query}" on page ${page}...`)

  // Get data from MongoDB
  const { restaurants, pagination } = await searchRestaurants(query, page)

  console.log(`Found ${restaurants.length} restaurants matching "${query}"`)

  return (
    <div className="container">
      <h1>Search Results</h1>

      <SearchComponent initialRestaurants={restaurants} initialPagination={pagination} initialQuery={query} />
    </div>
  )
}
