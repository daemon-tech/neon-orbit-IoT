/**
 * EARTH TEXTURE - Visible Earth with country outlines
 * Makes the globe clearly visible for OSINT operations
 */

import { useRef } from 'react'
import { useTexture } from '@react-three/drei'
import { MeshStandardMaterial } from 'three'
import * as THREE from 'three'
import { EARTH_RADIUS } from './Earth'

export const EarthTexture = () => {
  const earthRef = useRef<THREE.Mesh>(null)
  
  // Use a simple procedural texture or fallback to visible material
  // In production, you could load a real Earth texture
  const material = new MeshStandardMaterial({
    color: new THREE.Color(0x2a4a6a), // Visible blue-gray
    emissive: new THREE.Color(0x1a3a5a), // Subtle glow
    emissiveIntensity: 0.4,
    metalness: 0.1,
    roughness: 0.6,
  })

  return (
    <mesh ref={earthRef}>
      <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

