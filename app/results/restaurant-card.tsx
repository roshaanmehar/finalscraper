"use client"

import { useState } from "react"
import type { Restaurant } from "./actions"

interface RestaurantCardProps {
  restaurant: Restaurant
  isExpanded?: boolean
  onToggleExpand?: (id: string) => void
}

export default function RestaurantCard({ restaurant, isExpanded = false, onToggleExpand }: RestaurantCardProps) {
  // Local state for standalone usage (when not controlled by parent)
  const [localExpanded, setLocalExpanded] = useState(false)

  // Use either controlled or local expanded state
  const expanded = onToggleExpand ? isExpanded : localExpanded

  // List of valid top-level domains
  const validTLDs = [
    // Compound TLDs (must come before simple TLDs to avoid partial matches)
    ".co.uk",
    ".ac.uk",
    ".gov.uk",
    ".org.uk",
    ".me.uk",
    ".net.uk",
    ".sch.uk",
    ".nhs.uk",
    ".police.uk",
    ".mod.uk",
    ".co.nz",
    ".org.nz",
    ".net.nz",
    ".govt.nz",
    ".co.za",
    ".org.za",
    ".co.in",
    ".org.in",
    ".net.in",
    ".gov.in",
    ".ac.in",
    ".com.au",
    ".net.au",
    ".org.au",
    ".gov.au",
    ".edu.au",
    // Simple TLDs
    ".com",
    ".org",
    ".net",
    ".edu",
    ".gov",
    ".co",
    ".us",
    ".uk",
    ".de",
    ".ca",
    ".au",
    ".fr",
    ".in",
    ".jp",
    ".cn",
    ".io",
    ".info",
    ".biz",
    ".me",
    ".tv",
    ".ru",
    ".br",
    ".it",
    ".nl",
    ".es",
    ".ch",
    ".se",
    ".no",
    ".fi",
    ".dk",
    ".be",
    ".nz",
    ".mx",
    ".za",
    ".pl",
    ".tr",
    ".gr",
    ".kr",
    ".hk",
    ".sg",
    ".tw",
    ".ae",
    ".sa",
    ".ir",
    ".pt",
    ".cz",
    ".ar",
    ".cl",
    ".id",
    ".vn",
  ]

  // Handle card click to toggle expanded state
  const handleCardClick = () => {
    if (onToggleExpand) {
      onToggleExpand(restaurant._id)
    } else {
      setLocalExpanded(!localExpanded)
    }
  }

  // Format email for display
  const formatEmail = (email: string | string[] | undefined) => {
    if (!email) return "N/A"

    // Function to check if an email has a valid format and is not from a tracking service
    const hasValidFormat = (email: string) => {
      // Basic format check
      if (!email || email === "N/A" || email === "n/a" || email.trim() === "" || !email.includes("@")) {
        return false
      }

      // Filter out tracking service emails
      const trackingDomains = [
        "sentry.io",
        "sentry-next.wixpress.com",
        "wixpress.com",
        "sentry.wixpress.com",
        "sentry-next",
        "o2.mouseflow.com",
        "fullstory.com",
        "loggly.com",
        "rollbar.com",
        "bugsnag.com",
        "airbrake.io",
      ]

      const emailLower = email.toLowerCase()

      // Check if email is from a tracking service
      if (trackingDomains.some((domain) => emailLower.includes(domain))) {
        return false
      }

      // Check if email looks like a UUID/hash (common for tracking services)
      if (/^[0-9a-f]{32}@|^[0-9a-f]{24}@|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}@/.test(email)) {
        return false
      }

      // Check for invalid domain format (text after valid TLD)
      const domainPart = email.split("@")[1]
      if (domainPart) {
        // Sort TLDs by length (longest first) to ensure we match compound TLDs before simple ones
        const sortedTLDs = [...validTLDs].sort((a, b) => b.length - a.length)

        // Check if domain ends with a valid TLD followed by additional text
        for (const tld of sortedTLDs) {
          const tldIndex = domainPart.toLowerCase().indexOf(tld.toLowerCase())
          if (tldIndex > 0) {
            // If there's text after the TLD, it's invalid
            if (tldIndex + tld.length < domainPart.length) {
              return false
            }
            // If we found a valid TLD at the end, it's valid
            if (tldIndex + tld.length === domainPart.length) {
              return true
            }
          }
        }
      }

      return true
    }

    // Function to clean email by removing text after valid TLD
    const cleanEmail = (email: string): string => {
      const parts = email.split("@")
      if (parts.length !== 2) return email

      const [username, domainPart] = parts

      // Sort TLDs by length (longest first) to ensure we match compound TLDs before simple ones
      const sortedTLDs = [...validTLDs].sort((a, b) => b.length - a.length)

      for (const tld of sortedTLDs) {
        const tldIndex = domainPart.toLowerCase().indexOf(tld.toLowerCase())
        if (tldIndex > 0 && tldIndex + tld.length <= domainPart.length) {
          // Return cleaned email with domain truncated at the end of the TLD
          return `${username}@${domainPart.substring(0, tldIndex + tld.length)}`
        }
      }

      return email
    }

    if (Array.isArray(email)) {
      // Clean emails first, then filter valid ones
      const cleanedEmails = email.map(cleanEmail)
      const validEmails = cleanedEmails.filter(hasValidFormat)

      if (validEmails.length === 0) return "N/A"

      // If expanded, show all emails
      // If not expanded and there are more than 3 emails, show first 3 with expand indicator
      if (expanded || validEmails.length <= 3) {
        return (
          <div className="email-list">
            {validEmails.map((email, index) => (
              <span key={index} className="detail-value">
                {email}
              </span>
            ))}
          </div>
        )
      } else {
        return (
          <div className="email-list">
            {validEmails.slice(0, 3).map((email, index) => (
              <span key={index} className="detail-value">
                {email}
              </span>
            ))}
            <span
              className="expand-emails"
              onClick={(e) => {
                e.stopPropagation()
                handleCardClick()
              }}
            >
              Show {validEmails.length - 3} more email{validEmails.length - 3 > 1 ? "s" : ""}
            </span>
          </div>
        )
      }
    }

    // For single email string
    const cleanedEmail = cleanEmail(email)
    return hasValidFormat(cleanedEmail) ? cleanedEmail : "N/A"
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
    <div className={`restaurant-card ${expanded ? "expanded" : ""}`} onClick={handleCardClick}>
      <div className="card-header">
        <h3 className="business-name">{restaurant.businessname || "Unnamed Business"}</h3>
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
              onClick={(e) => e.stopPropagation()} // Prevent card expansion when clicking the link
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
