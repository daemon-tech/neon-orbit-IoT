import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSensorStore } from '../store/sensorStore'

export const HolographicPanel = () => {
  const { selectedSensor, getSensor, setSelectedSensor } = useSensorStore()
  const sensor = selectedSensor ? getSensor(selectedSensor) : null

  if (!sensor) return null

  const statusColor = {
    online: '#10b981',
    warning: '#f59e0b',
    critical: '#ef4444',
  }[sensor.status]

  // Mock chart data (24h)
  const chartData = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    temp: sensor.temp + (Math.random() - 0.5) * 5,
  }))

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed top-20 right-10 w-96 glass-panel rounded-lg p-5 z-50"
        style={{
          borderColor: statusColor + '40',
        }}
      >
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-tech-border">
          <div>
            <h2 className="text-lg font-semibold text-tech-text font-mono">
              {sensor.id}
            </h2>
            {sensor.alert && (
              <div className="text-xs text-tech-error font-semibold mt-1">
                ⚠ ALERT ACTIVE
              </div>
            )}
          </div>
          <button
            onClick={() => setSelectedSensor(null)}
            className="text-tech-text-muted hover:text-tech-text transition-colors text-xl font-bold w-7 h-7 flex items-center justify-center rounded hover:bg-tech-border"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-xs text-tech-text-muted mb-1 uppercase tracking-wide">Status</div>
            <div className="text-sm font-semibold" style={{ color: statusColor }}>
              {sensor.status.toUpperCase()}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-tech-text-muted mb-1 uppercase tracking-wide">Temperature</div>
              <div className="font-mono text-lg text-tech-text">
                {sensor.temp}°C
              </div>
            </div>
            <div>
              <div className="text-xs text-tech-text-muted mb-1 uppercase tracking-wide">Humidity</div>
              <div className="font-mono text-lg text-tech-text">
                {sensor.humidity}%
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs text-tech-text-muted mb-2 uppercase tracking-wide">24h Temperature Trend</div>
            <div className="h-32 relative bg-tech-panel rounded p-2">
              <svg className="w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="none">
                <polyline
                  points={chartData
                    .map((d, i) => `${(i / 23) * 200},${100 - ((d.temp - 10) / 30) * 100}`)
                    .join(' ')}
                  fill="none"
                  stroke={statusColor}
                  strokeWidth="1.5"
                />
                <defs>
                  <linearGradient id={`tempGradient-${sensor.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={statusColor} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={statusColor} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polygon
                  points={`0,100 ${chartData
                    .map((d, i) => `${(i / 23) * 200},${100 - ((d.temp - 10) / 30) * 100}`)
                    .join(' ')} 200,100`}
                  fill={`url(#tempGradient-${sensor.id})`}
                />
              </svg>
            </div>
          </div>

          <div>
            <div className="text-xs text-tech-text-muted mb-1 uppercase tracking-wide">Coordinates</div>
            <div className="font-mono text-sm text-tech-text">
              {sensor.lat.toFixed(4)}, {sensor.lng.toFixed(4)}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
