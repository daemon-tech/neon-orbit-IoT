import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { CommandSphere } from './components/CommandSphere'
import { Earth } from './components/Earth'
import { NodeInspector } from './components/NodeInspector'
import { LiveStats } from './components/LiveStats'
import { ThreatMap } from './components/ThreatMap'
import { ThreatFeed } from './components/ThreatFeed'
import { DataFeed } from './components/DataFeed'
import { ASViewToggle } from './components/ASViewToggle'
import { CommandPanel } from './components/CommandPanel'
import { TabSystem } from './components/TabSystem'
import { useTabStore } from './store/tabStore'
import { usePacketCapture } from './hooks/usePacketCapture'
import { useBGPStream } from './hooks/useBGPStream'
import { useDNSFeed } from './hooks/useDNSFeed'
import { useNetworkSeed } from './hooks/useNetworkSeed'
import { useAbyssMesh } from './hooks/useAbyssMesh'

function Scene() {
  return (
    <>
      <Stars radius={1000} depth={100} count={2000} factor={2} fade speed={0.2} />
      
      {/* Military-grade lighting - dark and tactical */}
      <ambientLight intensity={0.15} color="#0a1a15" />
      <directionalLight position={[10, 10, 10]} intensity={0.4} color="#2d4a3e" />
      <directionalLight position={[-10, -10, -10]} intensity={0.2} color="#1a3a2e" />
      <pointLight position={[0, 0, 10]} intensity={0.3} color="#4ade80" distance={20} />

      {/* Earth with network visualization - ABYSS MESH v2 */}
      <Earth />
      <CommandSphere />
      
      <EffectComposer>
        <Bloom intensity={0.2} luminanceThreshold={0.98} />
      </EffectComposer>

      <OrbitControls
        enablePan={true}
        minDistance={4} // Closer zoom
        maxDistance={8} // Closer max distance
        autoRotate={false}
        enableDamping={true}
        dampingFactor={0.05}
      />
    </>
  )
}

function App() {
  // Initialize network
  useNetworkSeed()

  // ABYSS MESH v2 - High-performance telemetry processing
  useAbyssMesh(true)

  // Start data feeds (legacy - can be migrated to useAbyssMesh)
  usePacketCapture(true)
  useBGPStream(true)
  useDNSFeed(true)

  // Tab store
  const { tabs, activeTabId, setActiveTab, closeTab } = useTabStore()

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-tech-bg">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 75 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>

      <CommandPanel />
      <ThreatMap />
      <ThreatFeed />
      <DataFeed />
      <NodeInspector />
      <LiveStats />
      
      {/* Tab System */}
      <TabSystem
        tabs={tabs}
        activeTabId={activeTabId}
        onTabChange={setActiveTab}
        onTabClose={closeTab}
      />

      {/* Top Bar - Military Command Interface */}
      <div className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-tech-border">
        <div className="px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-tech-primary rounded-full animate-pulse" />
              <span className="text-xs text-tech-text uppercase tracking-widest font-mono">
                NETWORK ABYSS
              </span>
            </div>
            <div className="h-4 w-px bg-tech-border" />
            <div className="text-xs text-tech-text-muted font-mono">
              {new Date().toLocaleTimeString('en-US', { hour12: false })}
            </div>
            <div className="h-4 w-px bg-tech-border" />
            <div className="text-xs text-tech-text-muted font-mono">
              STATUS: <span className="text-tech-primary">OPERATIONAL</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ASViewToggle />
            <div className="h-4 w-px bg-tech-border" />
            <div className="text-xs text-tech-text-muted font-mono">
              PROTOCOL: TCP/UDP/ICMP | BGP | DNS
            </div>
            <div className="h-4 w-px bg-tech-border" />
            <div className="text-xs text-tech-text-muted font-mono">
              CLASSIFICATION: <span className="text-tech-warning">RESTRICTED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
