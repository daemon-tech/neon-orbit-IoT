import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { NetworkGraph } from './components/NetworkGraph'
import { NodeInspector } from './components/NodeInspector'
import { LiveStats } from './components/LiveStats'
import { ThreatMap } from './components/ThreatMap'
import { usePacketCapture } from './hooks/usePacketCapture'
import { useBGPStream } from './hooks/useBGPStream'
import { useDNSFeed } from './hooks/useDNSFeed'
import { useNetworkSeed } from './hooks/useNetworkSeed'
import { useNetworkStore } from './store/networkStore'

function Scene() {
  return (
    <>
      <Stars radius={500} depth={50} count={1000} factor={1} fade speed={0.3} />
      
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 10]} intensity={0.8} color="#ffffff" />
      <directionalLight position={[-10, -10, -10]} intensity={0.3} color="#3b82f6" />

      <NetworkGraph />
      
      <EffectComposer>
        <Bloom intensity={0.3} luminanceThreshold={0.95} />
      </EffectComposer>

      <OrbitControls
        enablePan={true}
        minDistance={5}
        maxDistance={50}
        autoRotate={false}
      />
    </>
  )
}

function App() {
  // Initialize network
  useNetworkSeed()

  // Start data feeds
  usePacketCapture(true)
  useBGPStream(true)
  useDNSFeed(true)

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-tech-bg">
      <Canvas
        camera={{ position: [0, 0, 20], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>

      <ThreatMap />
      <NodeInspector />
      <LiveStats />

      {/* Top Bar - Network Info */}
      <div className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-tech-border">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-tech-accent rounded-full animate-pulse" />
              <span className="text-xs text-tech-text-muted uppercase tracking-wide">
                Network Active
              </span>
            </div>
            <div className="text-xs text-tech-text-muted">
              {new Date().toLocaleTimeString('en-US', { hour12: false })}
            </div>
          </div>
          <div className="text-xs text-tech-text-muted font-mono">
            Protocol: TCP/UDP/ICMP | BGP | DNS
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
