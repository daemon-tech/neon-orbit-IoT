import { useRef, useEffect, useMemo } from 'react'
import { Group, BufferGeometry, LineBasicMaterial, Line, SphereGeometry, MeshStandardMaterial, QuadraticBezierCurve3 } from 'three'
import * as THREE from 'three'
import { useNetworkStore } from '../store/networkStore'
import { EARTH_RADIUS, latLngToVector3 } from '../lib/geo/coordinates'

export const NetworkGraph = () => {
  const groupRef = useRef<Group>(null)
  const { nodes, links, getAllNodes, getAllLinks, setSelectedNode } = useNetworkStore()
  const nodeMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map())
  const linkLinesRef = useRef<Map<string, Line>>(new Map())

  const nodeArray = useMemo(() => getAllNodes(), [nodes])
  const linkArray = useMemo(() => getAllLinks(), [links])

  // Update node positions on Earth surface when nodes change
  useEffect(() => {
    nodeArray.forEach((node) => {
      const mesh = nodeMeshesRef.current.get(node.id)
      if (mesh) {
        const [x, y, z] = latLngToVector3(node.lat, node.lng, EARTH_RADIUS + 0.05)
        mesh.position.set(x, y, z)
      }
    })
  }, [nodeArray])

  // Create node meshes positioned on Earth surface
  const nodeMeshes = useMemo(() => {
    return nodeArray.map((node) => {
      const size = Math.log2(node.packets + 1) * 0.015 + 0.03
      
      // Military-grade color scheme
      const color = node.threatInfo
        ? new THREE.Color(0xff6b35) // Amber/red for threats (military warning)
        : node.asn
        ? new THREE.Color(0x4ade80) // Tactical green for ASNs
        : new THREE.Color(0x60a5fa) // Blue-gray for regular nodes

      // Position on Earth surface based on lat/lng
      const [x, y, z] = latLngToVector3(node.lat, node.lng, EARTH_RADIUS + 0.05)

      return (
        <mesh
          key={node.id}
          ref={(ref) => {
            if (ref) nodeMeshesRef.current.set(node.id, ref)
          }}
          position={[x, y, z]}
          onClick={(e) => {
            e.stopPropagation()
            setSelectedNode(node.id)
          }}
          onPointerOver={(e) => {
            e.stopPropagation()
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'default'
          }}
        >
          <sphereGeometry args={[size, 12, 12]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={node.threatInfo ? 0.6 : 0.15}
            metalness={0.7}
            roughness={0.2}
          />
        </mesh>
      )
    })
  }, [nodeArray, setSelectedNode])

  // Create link lines (curved arcs on Earth surface)
  const linkLines = useMemo(() => {
    return linkArray.map((link) => {
      const source = nodeArray.find((n) => n.id === link.source)
      const target = nodeArray.find((n) => n.id === link.target)

      if (!source || !target) return null

      // Get positions on Earth surface
      const [sx, sy, sz] = latLngToVector3(source.lat, source.lng, EARTH_RADIUS + 0.05)
      const [tx, ty, tz] = latLngToVector3(target.lat, target.lng, EARTH_RADIUS + 0.05)

      // Create curved arc for better visualization
      const midPoint = new THREE.Vector3(
        (sx + tx) / 2,
        (sy + ty) / 2,
        (sz + tz) / 2
      )
      const arcHeight = 0.3
      midPoint.normalize().multiplyScalar(EARTH_RADIUS + 0.05 + arcHeight)

      // Create curve with multiple points
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(sx, sy, sz),
        new THREE.Vector3(midPoint.x, midPoint.y, midPoint.z),
        new THREE.Vector3(tx, ty, tz)
      )

      const points = curve.getPoints(20)
      const geometry = new BufferGeometry().setFromPoints(points)

      // Military-grade link colors
      const linkColor = link.protocol === 'bgp'
        ? 0x4ade80 // Green for BGP
        : link.protocol === 'dns'
        ? 0x60a5fa // Blue for DNS
        : 0x64748b // Gray for regular links

      const material = new LineBasicMaterial({
        color: linkColor,
        transparent: true,
        opacity: 0.4,
        linewidth: 1,
      })

      return (
        <line
          key={link.id}
          ref={(ref) => {
            if (ref) linkLinesRef.current.set(link.id, ref)
          }}
          geometry={geometry}
          material={material}
        />
      )
    })
  }, [linkArray, nodeArray])

  return (
    <group ref={groupRef}>
      {linkLines}
      {nodeMeshes}
    </group>
  )
}
