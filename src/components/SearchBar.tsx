import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useCameraControls } from '../hooks/useGlobeCamera'
import { useSensorStore } from '../store/sensorStore'

export const SearchBar = () => {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { flyTo, flyToByName } = useCameraControls()
  const { getAllSensors, setSelectedSensor } = useSensorStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFocused) {
        setIsFocused(false)
        inputRef.current?.blur()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFocused])

  const handleSearch = (value: string) => {
    setQuery(value)

    // Try location name first
    const lowerValue = value.toLowerCase()
    if (['tokyo', 'sahara', 'newyork', 'london', 'sydney'].includes(lowerValue)) {
      flyToByName(lowerValue)
      return
    }

    // Try sensor ID
    const sensors = getAllSensors()
    const sensor = sensors.find((s) => s.id.toLowerCase().includes(value.toLowerCase()))
    if (sensor) {
      setSelectedSensor(sensor.id)
      flyTo(sensor.lat, sensor.lng, 2.5)
    }
  }

  return (
    <motion.div
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50"
    >
      <div className="relative">
        <svg
          className="absolute left-4 top-1/2 transform -translate-y-1/2 text-tech-text-muted"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Search location or sensor ID..."
          className="glass-panel pl-11 pr-4 py-2.5 w-80 rounded-md text-tech-text bg-transparent border-tech-border focus:outline-none focus:ring-2 focus:ring-tech-primary focus:border-tech-primary text-sm placeholder-tech-text-muted"
        />
        {isFocused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-full mt-2 left-0 right-0 glass-panel rounded-md p-2 max-h-64 overflow-y-auto"
          >
            <div className="text-xs text-tech-text-muted p-2">
              Search by location (Tokyo, Sahara) or sensor ID (STN-000001)
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
