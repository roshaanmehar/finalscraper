"use client"

import { useRef, useEffect } from "react"

type TaskLogsProps = {
  logs: string[]
}

export function TaskLogs({ logs }: TaskLogsProps) {
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to the bottom when new logs are added
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs])

  return (
    <div className="logs-card">
      <div className="logs-header">
        <h3>Task Logs</h3>
        <span className="logs-count">{logs.length} entries</span>
      </div>

      <div className="logs-container">
        {logs.length > 0 ? (
          logs.map((log, index) => (
            <div key={index} className="log-entry">
              {log}
            </div>
          ))
        ) : (
          <div className="no-logs">No logs yet</div>
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  )
}
