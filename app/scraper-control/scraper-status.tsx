"use client"

import { useState } from "react"

type ScraperStatusProps = {
  title: string
  task: {
    taskId: string
    status: "idle" | "running" | "completed" | "failed" | "terminated"
    progress: number
    message: string
    details: any
  }
}

export function ScraperStatus({ title, task }: ScraperStatusProps) {
  const [showDetails, setShowDetails] = useState(false)

  // Get status color
  const getStatusColor = () => {
    switch (task.status) {
      case "running":
        return "status-running"
      case "completed":
        return "status-completed"
      case "failed":
        return "status-failed"
      case "terminated":
        return "status-terminated"
      default:
        return "status-idle"
    }
  }

  return (
    <div className="status-card">
      <h3>{title}</h3>

      <div className="progress-container">
        <div className="progress-header">
          <span className="status-label">Status: {task.status}</span>
          <span className="progress-value">{task.progress}%</span>
        </div>
        <div className="progress-bar">
          <div className={`progress-fill ${getStatusColor()}`} style={{ width: `${task.progress}%` }}></div>
        </div>
      </div>

      {task.taskId && (
        <div className="task-info">
          <div className="info-label">Task ID:</div>
          <div className="task-id">{task.taskId}</div>
        </div>
      )}

      {task.message && (
        <div className="task-info">
          <div className="info-label">Message:</div>
          <div className="task-message">{task.message}</div>
        </div>
      )}

      {task.details && (
        <div className="task-details">
          <button className="details-toggle" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? "Hide Details" : "Show Details"}
            <span className={`arrow ${showDetails ? "up" : "down"}`}></span>
          </button>

          {showDetails && (
            <div className="details-content">
              <pre>{JSON.stringify(task.details, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
