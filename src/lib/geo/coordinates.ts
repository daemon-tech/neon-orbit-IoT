/**
 * GEOGRAPHIC COORDINATE UTILITIES
 * Convert between lat/lng and 3D coordinates
 * Used for network visualization positioning
 */

import { Vector3 } from 'three'

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
export const vector3ToLatLng = (position: Vector3, radius: number): { lat: number; lng: number } => {
  const x = position.x
  const y = position.y
  const z = position.z

  const lat = 90 - (Math.acos(y / radius) * 180) / Math.PI
  const lng = ((Math.atan2(-x, z) * 180) / Math.PI + 180) % 360 - 180

  return { lat, lng }
}

