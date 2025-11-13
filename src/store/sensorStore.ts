import { create } from 'zustand'

export interface SensorData {
  id: string
  lat: number
  lng: number
  temp: number
  humidity: number
  status: 'online' | 'warning' | 'critical'
  alert: boolean
  lastUpdate: number
}

interface SensorStore {
  sensors: Map<string, SensorData>
  selectedSensor: string | null
  globalAlert: boolean
  voidMode: boolean
  setSensor: (data: SensorData) => void
  setSelectedSensor: (id: string | null) => void
  setGlobalAlert: (alert: boolean) => void
  toggleVoidMode: () => void
  getSensor: (id: string) => SensorData | undefined
  getAllSensors: () => SensorData[]
}

export const useSensorStore = create<SensorStore>((set, get) => ({
  sensors: new Map(),
  selectedSensor: null,
  globalAlert: false,
  voidMode: false,
  
  setSensor: (data) => {
    set((state) => {
      const newSensors = new Map(state.sensors)
      newSensors.set(data.id, data)
      return { sensors: newSensors }
    })
  },
  
  setSelectedSensor: (id) => set({ selectedSensor: id }),
  
  setGlobalAlert: (alert) => set({ globalAlert: alert }),
  
  toggleVoidMode: () => set((state) => ({ voidMode: !state.voidMode })),
  
  getSensor: (id) => get().sensors.get(id),
  
  getAllSensors: () => Array.from(get().sensors.values()),
}))

