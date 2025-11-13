import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { motion } from 'framer-motion'
import { Globe } from './components/Globe'
import { DataStreamParticles } from './components/DataStreamParticles'
import { HolographicPanel } from './components/HolographicPanel'
import { SearchBar } from './components/SearchBar'
import { LiveDataFeed } from './components/LiveDataFeed'
import { useMQTT } from './hooks/useMQTT'
import { useSensorStore } from './store/sensorStore'

function Scene() {
  return (
    <>
      <Globe />
      <DataStreamParticles />
      
      <EffectComposer>
        <Bloom intensity={0.5} luminanceThreshold={0.9} />
      </EffectComposer>
    </>
  )
}

function App() {
  useMQTT()
  const { getAllSensors, globalAlert } = useSensorStore()
  const sensors = getAllSensors()
  const onlineCount = sensors.filter((s) => s.status === 'online').length
  const warningCount = sensors.filter((s) => s.status === 'warning').length
  const criticalCount = sensors.filter((s) => s.status === 'critical').length

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-tech-bg">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>

      {globalAlert && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.1, 0.3] }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="fixed inset-0 pointer-events-none z-40"
          style={{
            background: 'radial-gradient(circle, rgba(239,68,68,0.2) 0%, transparent 70%)',
          }}
        />
      )}

      <SearchBar />
      <HolographicPanel />
      <LiveDataFeed />

      {/* System Status Panel */}
      <motion.div
        initial={{ x: -400 }}
        animate={{ x: 0 }}
        className="fixed bottom-10 left-10 glass-panel rounded-lg p-5 z-50 min-w-[280px]"
      >
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-tech-border">
          <div className="w-2 h-2 bg-tech-primary rounded-full" />
          <h3 className="text-sm font-semibold text-tech-text uppercase tracking-wide">
            System Status
          </h3>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-tech-text-muted">Total Nodes</span>
            <span className="font-mono font-semibold text-tech-text">{sensors.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-tech-text-muted">Online</span>
            <span className="font-mono font-semibold text-tech-accent">{onlineCount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-tech-text-muted">Warning</span>
            <span className="font-mono font-semibold text-tech-warning">{warningCount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-tech-text-muted">Critical</span>
            <span className="font-mono font-semibold text-tech-error">{criticalCount}</span>
          </div>
        </div>
      </motion.div>

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
            Protocol: MQTT/WebSocket
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
