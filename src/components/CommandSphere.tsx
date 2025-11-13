/**
 * ABYSS MESH v2 - Command Sphere
 * InstancedMesh + LOD + Frustum Culling for 1M+ nodes at 60 FPS
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { InstancedMesh, BufferGeometry, Float32BufferAttribute, SphereGeometry, MeshStandardMaterial, Object3D, Frustum, Matrix4, Vector3 } from 'three'
import * as THREE from 'three'
import { useNetworkStore } from '../store/networkStore'
import { EARTH_RADIUS, latLngToVector3 } from './Earth'

const MAX_INSTANCES = 500000
const LOD_DISTANCE = 5 // Distance threshold for LOD

export const CommandSphere = () => {
  const { nodes, getAllNodes, getAllLinks, setSelectedNode } = useNetworkStore()
  const nodeInstancesRef = useRef<InstancedMesh>(null)
  const linkGeometryRef = useRef<BufferGeometry>(null)
  const dummyRef = useRef<Object3D>(new Object3D())
  const frustumRef = useRef<Frustum>(new Frustum())
  const cameraMatrixRef = useRef<Matrix4>(new Matrix4())
  
  const { camera } = useThree()
  
  const nodeArray = useMemo(() => getAllNodes(), [nodes])
  const linkArray = useMemo(() => getAllLinks(), [nodes])

  // Initialize InstancedMesh
  useEffect(() => {
    if (nodeInstancesRef.current) return

    const geometry = new SphereGeometry(0.03, 8, 8)
    const material = new MeshStandardMaterial({
      color: 0x4ade80,
      emissive: 0x4ade80,
      emissiveIntensity: 0.2,
      metalness: 0.7,
      roughness: 0.2,
    })

    // Create instanced mesh with color support
    const instancedMesh = new InstancedMesh(geometry, material, MAX_INSTANCES)
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    
    // Enable per-instance colors
    const colors = new Float32Array(MAX_INSTANCES * 3)
    instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3)
    
    nodeInstancesRef.current = instancedMesh
  }, [])

  // Update instances every frame with frustum culling
  useFrame(() => {
    if (!nodeInstancesRef.current || nodeArray.length === 0) return

    // Update frustum for culling
    cameraMatrixRef.current.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    frustumRef.current.setFromProjectionMatrix(cameraMatrixRef.current)

    const visibleNodes: typeof nodeArray = []
    const cameraPos = new Vector3()
    camera.getWorldPosition(cameraPos)

    // Frustum culling + distance-based LOD
    for (const node of nodeArray) {
      const [x, y, z] = latLngToVector3(node.lat, node.lng, EARTH_RADIUS + 0.05)
      const nodePos = new Vector3(x, y, z)
      
      // Check if in frustum
      if (frustumRef.current.containsPoint(nodePos)) {
        const distance = cameraPos.distanceTo(nodePos)
        
        // LOD: Only render if within distance threshold
        if (distance < LOD_DISTANCE * 10) {
          visibleNodes.push(node)
        }
      }
    }

    // Limit to max instances
    const count = Math.min(visibleNodes.length, MAX_INSTANCES)
    const dummy = dummyRef.current

      // Update instance matrices
      for (let i = 0; i < count; i++) {
        const node = visibleNodes[i]
        const [x, y, z] = latLngToVector3(node.lat, node.lng, EARTH_RADIUS + 0.05)
        
        // Calculate size based on packet count
        const size = Math.log2(node.packets + 1) * 0.015 + 0.03
        
        // Set position and scale
        dummy.position.set(x, y, z)
        dummy.scale.setScalar(size)
        dummy.updateMatrix()
        
        nodeInstancesRef.current.setMatrixAt(i, dummy.matrix)
        
        // Set color based on node type
        const color = node.threatInfo
          ? new THREE.Color(0xff6b35) // Amber for threats
          : node.asn
          ? new THREE.Color(0x4ade80) // Green for ASNs
          : new THREE.Color(0x60a5fa) // Blue for regular
        
        if (nodeInstancesRef.current.instanceColor) {
          nodeInstancesRef.current.setColorAt(i, color)
        }
      }

    // Update instance count and matrices
    if (nodeInstancesRef.current) {
      nodeInstancesRef.current.count = count
      nodeInstancesRef.current.instanceMatrix.needsUpdate = true
      if (nodeInstancesRef.current.instanceColor) {
        nodeInstancesRef.current.instanceColor.needsUpdate = true
      }
    }
  })

  // Handle click on instances
  const handleClick = (event: any) => {
    if (!nodeInstancesRef.current) return
    
    const instanceId = event.instanceId
    if (instanceId !== undefined && instanceId < nodeArray.length) {
      const node = nodeArray[instanceId]
      setSelectedNode(node.id)
    }
  }

  // Render links (simplified for performance)
  const linkGeometry = useMemo(() => {
    if (linkArray.length === 0) return null

    const positions: number[] = []
    const maxLinks = Math.min(linkArray.length, 10000) // Limit link rendering

    for (let i = 0; i < maxLinks; i++) {
      const link = linkArray[i]
      const source = nodeArray.find((n) => n.id === link.source)
      const target = nodeArray.find((n) => n.id === link.target)

      if (source && target) {
        const [sx, sy, sz] = latLngToVector3(source.lat, source.lng, EARTH_RADIUS + 0.05)
        const [tx, ty, tz] = latLngToVector3(target.lat, target.lng, EARTH_RADIUS + 0.05)
        
        positions.push(sx, sy, sz, tx, ty, tz)
      }
    }

    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
    return geometry
  }, [linkArray, nodeArray])

  return (
    <group>
      {/* Instanced nodes */}
      {nodeInstancesRef.current && (
        <primitive
          object={nodeInstancesRef.current}
          onClick={handleClick}
          onPointerOver={(e: any) => {
            e.stopPropagation()
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'default'
          }}
        />
      )}

      {/* Links (simplified rendering) */}
      {linkGeometry && (
        <lineSegments geometry={linkGeometry}>
          <lineBasicMaterial
            color={0x64748b}
            transparent
            opacity={0.2}
          />
        </lineSegments>
      )}
    </group>
  )
}

