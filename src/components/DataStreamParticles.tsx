import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3, CatmullRomCurve3 } from 'three'
import { useSensorStore } from '../store/sensorStore'

interface ParticleStream {
  id: string
  start: Vector3
  end: Vector3
  progress: number
  lifetime: number
  curve: CatmullRomCurve3
}

export const DataStreamParticles = () => {  
  const { getAllSensors } = useSensorStore()
  const [streams, setStreams] = useState<ParticleStream[]>([])

  const latLngToVector3 = (lat: number, lng: number, radius: number): Vector3 => {
    const phi = (90 - lat) * (Math.PI / 180)
    const theta = (lng + 180) * (Math.PI / 180)
    const x = -(radius * Math.sin(phi) * Math.cos(theta))
    const y = radius * Math.cos(phi)
    const z = radius * Math.sin(phi) * Math.sin(theta)
    return new Vector3(x, y, z)
  }

  useEffect(() => {
    const interval = setInterval(() => {
      const allSensors = getAllSensors()
      if (allSensors.length < 2) return

      // Create random data stream between two sensors
      const source = allSensors[Math.floor(Math.random() * allSensors.length)]
      const target = allSensors[Math.floor(Math.random() * allSensors.length)]
      
      if (source.id === target.id) return

      const start = latLngToVector3(source.lat, source.lng, 1.02)
      const end = latLngToVector3(target.lat, target.lng, 1.02)
      
      // Create curved path
      const mid = start.clone().lerp(end, 0.5)
      mid.multiplyScalar(1.3)
      
      const curve = new CatmullRomCurve3([start, mid, end])
      
      setStreams((prev) => [
        ...prev,
        {
          id: `${source.id}-${target.id}-${Date.now()}`,
          start,
          end,
          progress: 0,
          lifetime: 1.5,
          curve,
        },
      ])
    }, 500)

    return () => clearInterval(interval)
  }, [getAllSensors])

  useFrame((state, delta) => {
    setStreams((prevStreams) =>
      prevStreams
        .map((stream) => ({
          ...stream,
          progress: stream.progress + delta / stream.lifetime,
        }))
        .filter((stream) => stream.progress < 1)
    )
  })

  return (
    <group>
      {streams.map((stream) => {
        const points = stream.curve.getPoints(50)
        const positions = new Float32Array(points.flatMap((p) => [p.x, p.y, p.z]))
        return (
          <line key={stream.id}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={points.length}
                array={positions}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial
              color={0x3b82f6}
              transparent
              opacity={(1 - stream.progress) * 0.6}
            />
          </line>
        )
      })}
    </group>
  )
}

