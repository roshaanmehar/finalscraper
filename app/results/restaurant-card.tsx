import type { Restaurant } from "./actions"

interface RestaurantCardProps {
  restaurant: Restaurant
}

export default function RestaurantCard({ restaurant }: RestaurantCardProps) {
  // Format email for display
  const formatEmail = (email: string | string[] | undefined) => {
    if (!email) return "N/A"
    if (Array.isArray(email)) {
      return email.filter((e) => e && e !== "N/A" && e !== "n/a").join(", ") || "N/A"
    }
    return email
  }

  // Format phone number for display
  const formatPhone = (phone: string | number | undefined) => {
    if (!phone) return "N/A"
    return String(phone)
  }

  // Format date for display
  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "N/A"
    try {
      return new Date(date).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    } catch (e) {
      return "Invalid date"
    }
  }

  return (
    <div className="restaurant-card">
      <div className="card-header">
        <h3 className="restaurant-name">{restaurant.businessname || "Unnamed Business"}</h3>
        {restaurant.stars && (
          <div className="restaurant-rating">
            <span className="stars">{restaurant.stars}</span>
            {restaurant.numberofreviews && (
              <span className="reviews-count">({restaurant.numberofreviews} reviews)</span>
            )}
          </div>
        )}
      </div>

      <div className="card-body">
        {restaurant.address && (
          <div className="restaurant-address">
            <strong>Address:</strong> {restaurant.address}
          </div>
        )}

        <div className="restaurant-contact">
          <div className="contact-item">
            <strong>Phone:</strong> {formatPhone(restaurant.phonenumber)}
          </div>
          <div className="contact-item">
            <strong>Email:</strong> {formatEmail(restaurant.email)}
          </div>
        </div>

        {restaurant.website && (
          <div className="restaurant-website">
            <strong>Website:</strong>{" "}
            <a
              href={restaurant.website.startsWith("http") ? restaurant.website : `https://${restaurant.website}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {restaurant.website}
            </a>
          </div>
        )}

        {restaurant.subsector && (
          <div className="restaurant-category">
            <strong>Category:</strong> {restaurant.subsector}
          </div>
        )}
      </div>

      <div className="card-footer">
        <div className="scrape-info">
          <div>Scraped: {formatDate(restaurant.scraped_at)}</div>
          {restaurant.emailscraped_at && <div>Email scraped: {formatDate(restaurant.emailscraped_at)}</div>}
        </div>
        {restaurant.emailstatus && (
          <div className={`email-status ${restaurant.emailstatus.toLowerCase()}`}>Email: {restaurant.emailstatus}</div>
        )}
      </div>
    </div>
  )
}
