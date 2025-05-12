export default function Loading() {
  return (
    <div className="container">
      <h1>Search Results</h1>

      <div className="card">
        <div className="search-controls">
          <div className="search-wrapper">
            <div className="loading-input"></div>
          </div>

          <div className="action-controls">
            <div className="sort-wrapper">
              <label>Sort by:</label>
              <div className="loading-select"></div>
            </div>

            <div className="loading-button"></div>
          </div>
        </div>
      </div>

      <div className="results-summary loading-text"></div>

      <div className="results-grid">
        {[...Array(6)].map((_, i) => (
          <div className="result-card loading-card" key={i}>
            <div className="loading-title"></div>
            <div className="business-details">
              {[...Array(4)].map((_, j) => (
                <div className="detail-item" key={j}>
                  <div className="loading-label"></div>
                  <div className="loading-value"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
