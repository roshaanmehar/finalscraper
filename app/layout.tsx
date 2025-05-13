import type React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import "./styles.css"

export const metadata: Metadata = {
  title: "Veda Scraper",
  description: "A simple restaurant scraper application",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <nav className="navbar">
          <div className="nav-container">
            <div className="logo">Veda Scraper</div>
            <ul className="nav-menu">
              <li className="nav-item">
                <Link href="/" className="nav-link">
                  Scrape
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/results" className="nav-link">
                  Results
                </Link>
              </li>
            </ul>
          </div>
        </nav>
        <main className="main-content">{children}</main>
      </body>
    </html>
  )
}
