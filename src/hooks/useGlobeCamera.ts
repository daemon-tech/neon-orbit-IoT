import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { gsap } from 'gsap'
import { useCameraStore } from '../store/cameraStore'

export const useGlobeCamera = () => {
  const { camera } = useThree()
  const { target, setTarget } = useCameraStore()

  useEffect(() => {
    if (!target) return

    const phi = (90 - target.lat) * (Math.PI / 180)
    const theta = (target.lng + 180) * (Math.PI / 180)

    const x = -(target.distance * Math.sin(phi) * Math.cos(theta))
    const y = target.distance * Math.cos(phi)
    const z = target.distance * Math.sin(phi) * Math.sin(theta)

    gsap.to(camera.position, {
      duration: 2,
      x,
      y,
      z,
      ease: 'power2.inOut',
      onUpdate: () => {
        camera.lookAt(0, 0, 0)
      },
      onComplete: () => {
        setTarget(null)
      },
    })
  }, [target, camera, setTarget])
}

export const useCameraControls = () => {
  const { setTarget } = useCameraStore()

  const flyTo = (lat: number, lng: number, distance: number = 3) => {
    setTarget({ lat, lng, distance })
  }

  const flyToByName = (name: string) => {
    const locations: Record<string, { lat: number; lng: number }> = {
      tokyo: { lat: 35.6762, lng: 139.6503 },
      sahara: { lat: 25.0, lng: 0.0 },
      newyork: { lat: 40.7128, lng: -74.0060 },
      london: { lat: 51.5074, lng: -0.1278 },
      sydney: { lat: -33.8688, lng: 151.2093 },
    }

    const location = locations[name.toLowerCase()]
    if (location) {
      flyTo(location.lat, location.lng)
    }
  }

  return { flyTo, flyToByName }
}

