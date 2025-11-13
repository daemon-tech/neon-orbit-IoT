import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3, BufferGeometry, Float32BufferAttribute, LineBasicMaterial, Line, InstancedMesh, SphereGeometry, MeshStandardMaterial } from 'three'
import * as THREE from 'three'
import { useNetworkStore, NetworkNode, NetworkLink } from '../store/networkStore'
import { forceSimulation, forceManyBody, forceLink, forceCenter } from 'd3-force-3d'

export const NetworkGraph = () => {
  const groupRef = useRef<Group>(null)
  const { nodes, links, getAllNodes, getAllLinks, setSelectedNode } = useNetworkStore()
  const simulationRef = useRef<any>(null)
  const nodeMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map())
  const linkLinesRef = useRef<Map<string, Line>>(new Map())

  const nodeArray = useMemo(() => getAllNodes(), [nodes])
  const linkArray = useMemo(() => getAllLinks(), [links])

  useEffect(() => {
    if (nodeArray.length === 0) return

    // Initialize D3 force simulation
    const simulation = forceSimulation(nodeArray as any)
      .force('charge', forceManyBody().strength(-120))
      .force('link', forceLink(linkArray as any).id((d: any) => d.id).distance(30))
      .force('center', forceCenter(0, 0, 0))
      .alphaTarget(0.3)
      .restart()

    simulationRef.current = simulation

    // Update positions on each tick
    simulation.on('tick', () => {
      nodeArray.forEach((node) => {
        if (node.x !== undefined && node.y !== undefined && node.z !== undefined) {
          const mesh = nodeMeshesRef.current.get(node.id)
          if (mesh) {
            mesh.position.set(node.x, node.y, node.z)
          }
        }
      })

      linkArray.forEach((link) => {
        const line = linkLinesRef.current.get(link.id)
        if (line) {
          const source = nodeArray.find((n) => n.id === link.source)
          const target = nodeArray.find((n) => n.id === link.target)
          if (source && target && source.x !== undefined && target.x !== undefined) {
            const positions = line.geometry.attributes.position
            positions.setXYZ(0, source.x, source.y || 0, source.z || 0)
            positions.setXYZ(1, target.x, target.y || 0, target.z || 0)
            positions.needsUpdate = true
          }
        }
      })
    })

    return () => {
      simulation.stop()
    }
  }, [nodeArray.length, linkArray.length])

  useFrame(() => {
    if (simulationRef.current) {
      simulationRef.current.tick()
    }
  })

  // Create node meshes
  const nodeMeshes = useMemo(() => {
    return nodeArray.map((node) => {
      const size = Math.log2(node.packets + 1) * 0.01 + 0.02
      const color = node.threatScore
        ? new THREE.Color(0xef4444) // Red for threats
        : node.asn
        ? new THREE.Color(0x3b82f6) // Blue for ASNs
        : new THREE.Color(0x10b981) // Green for regular nodes

      return (
        <mesh
          key={node.id}
          ref={(ref) => {
            if (ref) nodeMeshesRef.current.set(node.id, ref)
          }}
          position={[node.x || 0, node.y || 0, node.z || 0]}
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
          <sphereGeometry args={[size, 16, 16]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={node.threatScore ? 0.8 : 0.2}
            metalness={0.5}
            roughness={0.3}
          />
        </mesh>
      )
    })
  }, [nodeArray, setSelectedNode])

  // Create link lines
  const linkLines = useMemo(() => {
    return linkArray.map((link) => {
      const source = nodeArray.find((n) => n.id === link.source)
      const target = nodeArray.find((n) => n.id === link.target)

      if (!source || !target) return null

      const geometry = new BufferGeometry()
      const positions = new Float32BufferAttribute(
        [
          source.x || 0,
          source.y || 0,
          source.z || 0,
          target.x || 0,
          target.y || 0,
          target.z || 0,
        ],
        3
      )
      geometry.setAttribute('position', positions)

      const material = new LineBasicMaterial({
        color: 0x3b82f6,
        transparent: true,
        opacity: 0.3,
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

