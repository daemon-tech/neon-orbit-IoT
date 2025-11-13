import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { SphereGeometry, MeshStandardMaterial, MeshBasicMaterial, Color } from 'three'
import * as THREE from 'three'

export const EARTH_RADIUS = 2.5

// Convert lat/lng to 3D position on sphere
export const latLngToVector3 = (lat: number, lng: number, radius: number): [number, number, number] => {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)

  const x = -(radius * Math.sin(phi) * Math.cos(theta))
  const y = radius * Math.cos(phi)
  const z = radius * Math.sin(phi) * Math.sin(theta)

  return [x, y, z]
}

export const Earth = () => {
  const earthRef = useRef<THREE.Mesh>(null)
  const wireframeRef = useRef<THREE.Mesh>(null)
  const gridRef = useRef<THREE.Mesh>(null)

  // Dark, scientific Earth material
  const earthMaterial = useMemo(() => {
    return new MeshStandardMaterial({
      color: new Color(0x0a0e27), // Very dark blue-black
      emissive: new Color(0x050810), // Subtle dark blue glow
      emissiveIntensity: 0.1,
      metalness: 0.3,
      roughness: 0.9,
      flatShading: false,
    })
  }, [])

  // Grid overlay material (military tactical grid)
  const gridMaterial = useMemo(() => {
    return new MeshBasicMaterial({
      color: new Color(0x1a3a2e), // Dark military green
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    })
  }, [])

  // Latitude/longitude lines
  const latLngMaterial = useMemo(() => {
    return new MeshBasicMaterial({
      color: new Color(0x2d4a3e), // Dark green-gray
      wireframe: true,
      transparent: true,
      opacity: 0.2,
    })
  }, [])

  useFrame(() => {
    if (earthRef.current) {
      earthRef.current.rotation.y += 0.001 // Slow rotation
    }
    if (wireframeRef.current) {
      wireframeRef.current.rotation.y += 0.001
    }
    if (gridRef.current) {
      gridRef.current.rotation.y += 0.001
    }
  })

  return (
    <group>
      {/* Main Earth sphere - dark scientific style */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
        <primitive object={earthMaterial} attach="material" />
      </mesh>

      {/* Wireframe overlay for technical look */}
      <mesh ref={wireframeRef}>
        <sphereGeometry args={[EARTH_RADIUS + 0.002, 32, 32]} />
        <primitive object={gridMaterial} attach="material" />
      </mesh>

      {/* Latitude/longitude grid lines */}
      <mesh ref={gridRef}>
        <sphereGeometry args={[EARTH_RADIUS + 0.001, 32, 32]} />
        <primitive object={latLngMaterial} attach="material" />
      </mesh>

      {/* Subtle atmosphere glow */}
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS + 0.01, 32, 32]} />
        <meshBasicMaterial
          color={new Color(0x0a1a15)}
          transparent
          opacity={0.05}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  )
}

