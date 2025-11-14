/**
 * NETWORK TRAFFIC GLOBE VISUALIZATION
 * Displays all network nodes and connections on the Earth surface
 * Real-time traffic visualization with animated connections
 */

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useNetworkStore, NetworkNode, NetworkLink } from '../store/networkStore'
import { latLngToVector3, EARTH_RADIUS } from '../lib/geo/coordinates'
import { Color, Vector3, BufferGeometry, LineBasicMaterial, PointsMaterial, BufferAttribute } from 'three'
import * as THREE from 'three'

// Connection arc component - draws curved lines between nodes
const ConnectionArc = ({ 
  start, 
  end, 
  intensity 
}: { 
  start: Vector3
  end: Vector3
  intensity: number 
}) => {
  const points = useMemo(() => {
    const points: Vector3[] = []
    const segments = 32
    
    // Create arc that curves above the Earth surface
    const startNorm = start.clone().normalize()
    const endNorm = end.clone().normalize()
    const midPoint = new Vector3()
      .addVectors(startNorm, endNorm)
      .normalize()
      .multiplyScalar(EARTH_RADIUS + 0.1 + intensity * 0.05) // Curve height based on traffic
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      // Quadratic bezier curve
      const p1 = startNorm.clone().multiplyScalar(1 - t)
      const p2 = midPoint.clone().multiplyScalar(2 * t * (1 - t))
      const p3 = endNorm.clone().multiplyScalar(t)
      const point = new Vector3()
        .addVectors(p1, p2)
        .add(p3)
        .normalize()
        .multiplyScalar(EARTH_RADIUS + 0.05 + intensity * 0.03)
      points.push(point)
    }
    
    return points
  }, [start, end, intensity])
  
  const geometry = useMemo(() => {
    const geom = new BufferGeometry()
    const positions = new Float32Array(points.length * 3)
    points.forEach((point, i) => {
      positions[i * 3] = point.x
      positions[i * 3 + 1] = point.y
      positions[i * 3 + 2] = point.z
    })
    geom.setAttribute('position', new BufferAttribute(positions, 3))
    return geom
  }, [points])
  
  const material = useMemo(() => {
    // Color based on traffic intensity
    const color = intensity > 0.7 
      ? new Color(0xff4444) // High traffic - red
      : intensity > 0.4
      ? new Color(0xffaa00) // Medium traffic - orange
      : new Color(0x00ff88) // Low traffic - green
    
    return new LineBasicMaterial({
      color,
      transparent: true,
      opacity: Math.min(0.6, intensity * 0.8),
      linewidth: 1,
    })
  }, [intensity])
  
  return <line geometry={geometry} material={material} />
}

// Network node point component
const NetworkNodePoint = ({ 
  position, 
  size, 
  isThreat 
}: { 
  position: Vector3
  size: number
  isThreat: boolean 
}) => {
  const material = useMemo(() => {
    return new PointsMaterial({
      color: isThreat ? new Color(0xff0000) : new Color(0x00aaff),
      size: size,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    })
  }, [isThreat, size])
  
  const geometry = useMemo(() => {
    const geom = new BufferGeometry()
    const positions = new Float32Array([position.x, position.y, position.z])
    geom.setAttribute('position', new BufferAttribute(positions, 3))
    return geom
  }, [position])
  
  return <points geometry={geometry} material={material} />
}

export const NetworkTrafficGlobe = () => {
  const nodes = useNetworkStore((state) => state.getAllNodes())
  const links = useNetworkStore((state) => state.getAllLinks())
  const nodeMap = useMemo(() => {
    const map = new Map<string, NetworkNode>()
    nodes.forEach(node => map.set(node.id, node))
    return map
  }, [nodes])
  
  // Create node positions on Earth surface
  const nodePositions = useMemo(() => {
    return nodes.map(node => {
      const [x, y, z] = latLngToVector3(node.lat, node.lng, EARTH_RADIUS + 0.02)
      return {
        id: node.id,
        position: new Vector3(x, y, z),
        size: Math.min(0.08, Math.max(0.03, Math.log10((node.packets || 1) + 1) * 0.01)),
        isThreat: !!node.threatInfo,
        packets: node.packets || 0,
      }
    })
  }, [nodes])
  
  // Create connection arcs
  const connections = useMemo(() => {
    return links
      .filter(link => {
        const sourceNode = nodeMap.get(link.source)
        const targetNode = nodeMap.get(link.target)
        return sourceNode && targetNode
      })
      .map(link => {
        const sourceNode = nodeMap.get(link.source)!
        const targetNode = nodeMap.get(link.target)!
        
        const [sx, sy, sz] = latLngToVector3(sourceNode.lat, sourceNode.lng, EARTH_RADIUS + 0.02)
        const [tx, ty, tz] = latLngToVector3(targetNode.lat, targetNode.lng, EARTH_RADIUS + 0.02)
        
        const start = new Vector3(sx, sy, sz)
        const end = new Vector3(tx, ty, tz)
        
        // Calculate traffic intensity (normalized 0-1)
        const totalBytes = Number(link.bytes || 0)
        const intensity = Math.min(1, Math.log10(totalBytes + 1) / 10)
        
        return { start, end, intensity, link }
      })
      .slice(0, 500) // Limit to 500 connections for performance
  }, [links, nodeMap])
  
  // Animated pulse effect for active connections
  const pulseRef = useRef(0)
  useFrame((state, delta) => {
    pulseRef.current += delta * 2
  })
  
  return (
    <group>
      {/* Network nodes as points on Earth */}
      {nodePositions.map((node) => (
        <NetworkNodePoint
          key={node.id}
          position={node.position}
          size={node.size}
          isThreat={node.isThreat}
        />
      ))}
      
      {/* Connection arcs between nodes */}
      {connections.map((conn, idx) => (
        <ConnectionArc
          key={`${conn.link.source}-${conn.link.target}-${idx}`}
          start={conn.start}
          end={conn.end}
          intensity={conn.intensity}
        />
      ))}
    </group>
  )
}

