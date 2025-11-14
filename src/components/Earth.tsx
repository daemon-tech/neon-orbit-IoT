/**
 * ORBITAL OBSERVATION — MILITARY-GRADE EARTH GLOBE
 * Redesigned for OSINT intelligence gathering
 * Clean, tactical, purpose-built for geospatial analysis
 */

import { useRef, useMemo, useState, Suspense } from 'react'
import { useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { SphereGeometry, MeshStandardMaterial, MeshBasicMaterial, Color, Vector3, RepeatWrapping } from 'three'
import * as THREE from 'three'
import { useTabStore } from '../store/tabStore'
import { OrbitalObservationTab } from './tabs/OrbitalObservationTab'
import { reverseGeocode } from '../lib/osint/geocoding'

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

// Convert 3D position to lat/lng
const vector3ToLatLng = (position: Vector3, radius: number): { lat: number; lng: number } => {
  const x = position.x
  const y = position.y
  const z = position.z

  const lat = 90 - (Math.acos(y / radius) * 180) / Math.PI
  const lng = ((Math.atan2(-x, z) * 180) / Math.PI + 180) % 360 - 180

  return { lat, lng }
}

// Earth texture component with realistic satellite imagery
const EarthTexture = () => {
  // Use NASA Blue Marble or similar high-quality Earth texture
  // Multiple texture options for realistic appearance
  const [earthMap, normalMap, specularMap] = useTexture([
    'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg', // Earth with atmosphere
    'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_normal_2048.jpg', // Normal map for depth
    'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_specular_2048.jpg', // Specular for water highlights
  ], (textures) => {
    // Configure texture wrapping on load
    textures.forEach((texture) => {
      texture.wrapS = RepeatWrapping
      texture.wrapT = RepeatWrapping
      texture.flipY = false // Ensure proper orientation (not flipped)
    })
  })

  const material = useMemo(() => {
    // Ensure texture is properly oriented (not flipped)
    earthMap.flipY = false
    normalMap.flipY = false
    specularMap.flipY = false
    
    return new MeshStandardMaterial({
      map: earthMap,
      normalMap: normalMap,
      normalScale: new THREE.Vector2(0.8, 0.8),
      specularMap: specularMap,
      specular: new Color(0x333333),
      shininess: 30,
      emissive: new Color(0x000000),
      emissiveIntensity: 0.1,
      metalness: 0.1,
      roughness: 0.7,
    })
  }, [earthMap, normalMap, specularMap])

  return <primitive object={material} attach="material" />
}

// Fallback material if texture fails to load
const EarthFallback = () => {
  const material = useMemo(() => {
    return new MeshStandardMaterial({
      color: new Color(0x3a5a7a),
      emissive: new Color(0x2a4a6a),
      emissiveIntensity: 0.6,
      metalness: 0.05,
      roughness: 0.5,
    })
  }, [])
  return <primitive object={material} attach="material" />
}

export const Earth = () => {
  const earthRef = useRef<THREE.Mesh>(null)
  const { camera } = useThree()
  const { addTab } = useTabStore()
  const clickStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const isDraggingRef = useRef(false)
  const [isPointerDown, setIsPointerDown] = useState(false)

  // Handle pointer down - track if this is a click or drag
  const handlePointerDown = (event: any) => {
    // Get screen coordinates from the event
    const rect = (event.target as HTMLElement)?.getBoundingClientRect?.() || { left: 0, top: 0 }
    const clientX = event.clientX || (event.nativeEvent?.clientX || 0) - rect.left
    const clientY = event.clientY || (event.nativeEvent?.clientY || 0) - rect.top
    
    clickStartRef.current = {
      x: clientX,
      y: clientY,
      time: Date.now(),
    }
    isDraggingRef.current = false
    setIsPointerDown(true)
  }

  // Handle pointer move - if moved, it's a drag, not a click
  const handlePointerMove = (event: any) => {
    if (clickStartRef.current && isPointerDown) {
      const rect = (event.target as HTMLElement)?.getBoundingClientRect?.() || { left: 0, top: 0 }
      const clientX = event.clientX || (event.nativeEvent?.clientX || 0) - rect.left
      const clientY = event.clientY || (event.nativeEvent?.clientY || 0) - rect.top
      const dx = Math.abs(clientX - clickStartRef.current.x)
      const dy = Math.abs(clientY - clickStartRef.current.y)
      
      // If moved more than 8 pixels, it's a drag (rotation) - ignore click
      if (dx > 8 || dy > 8) {
        isDraggingRef.current = true
      }
    }
  }

  // Handle click on Earth - only if not dragging
  const handleEarthClick = async (event: any) => {
    event.stopPropagation()

    // Check if this was a drag (rotation) or a click
    if (isDraggingRef.current || !clickStartRef.current) {
      clickStartRef.current = null
      isDraggingRef.current = false
      return
    }

    // Check time threshold - if too long, it was probably a drag
    const clickDuration = Date.now() - clickStartRef.current.time
    if (clickDuration > 200) {
      clickStartRef.current = null
      isDraggingRef.current = false
      return
    }

    if (!earthRef.current || !event.point) {
      clickStartRef.current = null
      isDraggingRef.current = false
      return
    }

    const point = event.point
    const { lat, lng } = vector3ToLatLng(point, EARTH_RADIUS)
    
    // Visual feedback with precise coordinates
    console.log(`[ORBITAL OBSERVATION] Acquiring intelligence for ${lat.toFixed(6)}°N, ${lng.toFixed(6)}°E...`)
    
    // Get precise location name via reverse geocoding (building-level accuracy)
    const location = await reverseGeocode(lat, lng)
    
    // Create descriptive title with location details
    const title = location.building 
      ? `ORBITAL: ${location.building}${location.city ? `, ${location.city}` : ''}`
      : location.address
      ? `ORBITAL: ${location.address}${location.city ? `, ${location.city}` : ''}`
      : `ORBITAL: ${location.name}`
    
    // Open OSINT tab with precise location data
    const tabId = `osint-${lat.toFixed(4)}-${lng.toFixed(4)}-${Date.now()}`
    addTab({
      id: tabId,
      title,
      type: 'osint',
      content: (
        <OrbitalObservationTab
          lat={lat}
          lng={lng}
          locationName={location.name}
          country={location.country}
        />
      ),
      data: { lat, lng, location },
    })

    clickStartRef.current = null
    isDraggingRef.current = false
    setIsPointerDown(false)
  }

  // Handle right-click for context menu (always opens OSINT, no drag check)
  const handleRightClick = (event: any) => {
    event.preventDefault()
    event.stopPropagation()
    
    if (!earthRef.current || !event.point) return

    const point = event.point
    const { lat, lng } = vector3ToLatLng(point, EARTH_RADIUS)
    
    reverseGeocode(lat, lng).then((location) => {
      // Create descriptive title with location details
      const title = location.building 
        ? `ORBITAL: ${location.building}${location.city ? `, ${location.city}` : ''}`
        : location.address
        ? `ORBITAL: ${location.address}${location.city ? `, ${location.city}` : ''}`
        : `ORBITAL: ${location.name}`
      
      const tabId = `osint-${lat.toFixed(4)}-${lng.toFixed(4)}-${Date.now()}`
      addTab({
        id: tabId,
        title,
        type: 'osint',
        content: (
          <OrbitalObservationTab
            lat={lat}
            lng={lng}
            locationName={location.name}
            country={location.country}
          />
        ),
        data: { lat, lng, location },
      })
    })
  }

  // No auto-rotation - Earth stays fixed for accurate click-to-location mapping

  return (
    <group>
      {/* Main Earth sphere - realistic satellite texture */}
      <mesh
        ref={earthRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handleEarthClick}
        onPointerLeave={() => {
          // Reset if pointer leaves while down (prevents accidental clicks)
          if (isPointerDown) {
            clickStartRef.current = null
            isDraggingRef.current = false
            setIsPointerDown(false)
          }
        }}
        onContextMenu={handleRightClick}
      >
        <sphereGeometry args={[EARTH_RADIUS, 128, 128]} />
        <Suspense fallback={<EarthFallback />}>
          <EarthTexture />
        </Suspense>
      </mesh>

      {/* Subtle atmosphere glow for realism */}
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS + 0.01, 64, 64]} />
        <meshBasicMaterial
          color={new Color(0x87ceeb)}
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  )
}

