import { useRef, useMemo, Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, useTexture } from '@react-three/drei'
import { Mesh, Group } from 'three'
import * as THREE from 'three'
import { SensorNode } from './SensorNode'
import { useSensorStore } from '../store/sensorStore'
import { useGlobeCamera } from '../hooks/useGlobeCamera'
import { useCameraControls } from '../hooks/useGlobeCamera'

const EARTH_RADIUS = 1

const latLngToVector3 = (lat: number, lng: number, radius: number): [number, number, number] => {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)

  const x = -(radius * Math.sin(phi) * Math.cos(theta))
  const y = radius * Math.cos(phi)
  const z = radius * Math.sin(phi) * Math.sin(theta)

  return [x, y, z]
}

const EarthTexture = () => {
  // Using a NASA Blue Marble texture URL
  const texture = useTexture('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg')
  
  return (
    <>
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
        <meshStandardMaterial 
          map={texture} 
          emissive={new THREE.Color(0x000000)}
          emissiveIntensity={0}
        />
      </mesh>
      {/* Wireframe overlay for technical look */}
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS + 0.001, 32, 32]} />
        <meshBasicMaterial 
          wireframe 
          color={new THREE.Color(0x3b82f6)} 
          opacity={0.15}
          transparent
        />
      </mesh>
    </>
  )
}

export const Globe = () => {
  const globeRef = useRef<Group>(null)
  const { sensors, setSelectedSensor } = useSensorStore()
  useGlobeCamera() // This handles camera movement from store
  const { flyTo } = useCameraControls()

  const sensorArray = useMemo(() => {
    return Array.from(sensors.values())
  }, [sensors])

  useFrame(() => {
    if (globeRef.current) {
      globeRef.current.rotation.y += 0.0005
    }
  })

  const handleNodeClick = (id: string) => {
    const sensor = sensors.get(id)
    if (sensor) {
      setSelectedSensor(id)
      flyTo(sensor.lat, sensor.lng, 2.5)
    }
  }

  return (
    <group ref={globeRef}>
      <Suspense fallback={null}>
        <EarthTexture />
      </Suspense>
      
      <Stars radius={300} depth={50} count={2000} factor={2} fade speed={0.5} />
      
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} color="#ffffff" />
      <directionalLight position={[-5, -5, -5]} intensity={0.3} color="#3b82f6" />

      {sensorArray.map((sensor) => {
        const [x, y, z] = latLngToVector3(sensor.lat, sensor.lng, EARTH_RADIUS + 0.02)
        return (
          <SensorNode
            key={sensor.id}
            data={sensor}
            position={[x, y, z]}
            onClick={() => handleNodeClick(sensor.id)}
          />
        )
      })}

      <OrbitControls
        enablePan={false}
        minDistance={2}
        maxDistance={8}
        autoRotate={true}
        autoRotateSpeed={0.3}
      />
    </group>
  )
}

