import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSensorStore, SensorData } from '../store/sensorStore'

export const LiveDataFeed = () => {
  const { getAllSensors } = useSensorStore()
  const [recentUpdates, setRecentUpdates] = useState<SensorData[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updateFeed = () => {
      const sensors = getAllSensors()
      // Get sensors updated in the last 5 seconds
      const now = Date.now()
      const recent = sensors
        .filter((s) => now - s.lastUpdate < 5000)
        .sort((a, b) => b.lastUpdate - a.lastUpdate)
        .slice(0, 20)

      setRecentUpdates(recent)
    }

    updateFeed()
    const interval = setInterval(updateFeed, 1000) // Update every second
    return () => clearInterval(interval)
  }, [getAllSensors])

  // Auto-scroll to bottom
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [recentUpdates])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-tech-accent'
      case 'warning':
        return 'text-tech-warning'
      case 'critical':
        return 'text-tech-error'
      default:
        return 'text-tech-text-muted'
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className="fixed bottom-10 right-10 z-50 w-96">
      <div className="data-panel rounded-lg overflow-hidden">
        <div
          className="px-4 py-3 border-b border-tech-border cursor-pointer flex items-center justify-between"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-tech-error rounded-full animate-pulse" />
            <h3 className="text-sm font-semibold text-tech-text uppercase tracking-wide">
              Live Data Feed
            </h3>
            <span className="text-xs text-tech-text-muted">
              ({recentUpdates.length})
            </span>
          </div>
          <svg
            className={`w-4 h-4 text-tech-text-muted transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 400 }}
              exit={{ height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div
                ref={feedRef}
                className="h-96 overflow-y-auto p-2 space-y-1"
                style={{ scrollbarWidth: 'thin' }}
              >
                {recentUpdates.length === 0 ? (
                  <div className="text-center text-tech-text-muted text-sm py-8">
                    No recent updates
                  </div>
                ) : (
                  recentUpdates.map((sensor) => (
                    <motion.div
                      key={`${sensor.id}-${sensor.lastUpdate}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="data-panel rounded p-2 text-xs"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="font-mono font-semibold text-tech-primary">
                          {sensor.id}
                        </span>
                        <span className="text-tech-text-muted">
                          {formatTime(sensor.lastUpdate)}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-tech-text-muted">
                        <div>
                          <span className="text-tech-text-muted">Status:</span>{' '}
                          <span className={getStatusColor(sensor.status)}>
                            {sensor.status.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <span className="text-tech-text-muted">Temp:</span>{' '}
                          <span className="text-tech-text">{sensor.temp}°C</span>
                        </div>
                        <div>
                          <span className="text-tech-text-muted">Hum:</span>{' '}
                          <span className="text-tech-text">{sensor.humidity}%</span>
                        </div>
                      </div>
                      {sensor.alert && (
                        <div className="mt-1 text-tech-error text-xs font-semibold">
                          ⚠ ALERT
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

