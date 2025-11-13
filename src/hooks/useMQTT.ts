import { useEffect, useRef } from 'react'
import { useSensorStore } from '../store/sensorStore'

// Mock MQTT implementation for demo
// In production, replace with actual mqtt.js client

const generateMockSensor = (id: string): any => {
  const lat = (Math.random() - 0.5) * 180
  const lng = (Math.random() - 0.5) * 360
  const temp = 15 + Math.random() * 20
  const humidity = 30 + Math.random() * 70
  const statuses: ('online' | 'warning' | 'critical')[] = ['online', 'warning', 'critical']
  const status = statuses[Math.floor(Math.random() * statuses.length)]
  const alert = Math.random() < 0.01 // 1% chance

  return {
    id,
    lat,
    lng,
    temp: Math.round(temp * 10) / 10,
    humidity: Math.round(humidity * 10) / 10,
    status,
    alert,
  }
}

export const useMQTT = () => {
  const { setSensor, setGlobalAlert } = useSensorStore()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const sensorCountRef = useRef(1000)

  useEffect(() => {
    // Initialize 1000 sensors
    const initialSensors: string[] = []
    for (let i = 0; i < 1000; i++) {
      const id = `STN-${String(i + 1).padStart(6, '0')}`
      initialSensors.push(id)
      const data = generateMockSensor(id)
      setSensor({
        ...data,
        lastUpdate: Date.now(),
      })
    }

    // Update sensors every 2 seconds
    intervalRef.current = setInterval(() => {
      let hasAlert = false
      
      // Update random subset of sensors
      const updateCount = Math.floor(sensorCountRef.current * 0.1) // 10% per cycle
      for (let i = 0; i < updateCount; i++) {
        const randomIndex = Math.floor(Math.random() * sensorCountRef.current)
        const id = `STN-${String(randomIndex + 1).padStart(6, '0')}`
        const data = generateMockSensor(id)
        
        if (data.alert) {
          hasAlert = true
        }
        
        setSensor({
          ...data,
          lastUpdate: Date.now(),
        })
      }

      if (hasAlert) {
        setGlobalAlert(true)
        setTimeout(() => setGlobalAlert(false), 2000)
      }
    }, 2000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [setSensor, setGlobalAlert])

  return { connected: true }
}

