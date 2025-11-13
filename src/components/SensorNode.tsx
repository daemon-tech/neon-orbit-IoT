import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh, MeshStandardMaterial } from 'three'
import * as THREE from 'three'
import { SensorData } from '../store/sensorStore'

interface SensorNodeProps {
  data: SensorData
  position: [number, number, number]
  onClick: () => void
}

export const SensorNode = ({ data, position, onClick }: SensorNodeProps) => {
  const meshRef = useRef<Mesh>(null)
  const materialRef = useRef<MeshStandardMaterial>(null)

  const color = useMemo(() => {
    if (data.alert) return new THREE.Color(0xef4444) // red
    if (data.status === 'critical') return new THREE.Color(0xef4444) // red
    if (data.status === 'warning') return new THREE.Color(0xf59e0b) // amber
    return new THREE.Color(0x10b981) // green
  }, [data.status, data.alert])

  const size = useMemo(() => {
    return data.alert ? 0.015 : 0.01
  }, [data.alert])

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'crosshair'
      }}
    >
      <octahedronGeometry args={[size, 0]} />
      <meshStandardMaterial
        ref={materialRef as any}
        attach="material"
        color={color}
        emissive={color}
        emissiveIntensity={data.alert ? 0.8 : 0.3}
        metalness={0.5}
        roughness={0.3}
      />
    </mesh>
  )
}

