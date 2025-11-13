import { create } from 'zustand'

interface CameraTarget {
  lat: number
  lng: number
  distance: number
}

interface CameraStore {
  target: CameraTarget | null
  setTarget: (target: CameraTarget | null) => void
}

export const useCameraStore = create<CameraStore>((set) => ({
  target: null,
  setTarget: (target) => set({ target }),
}))

