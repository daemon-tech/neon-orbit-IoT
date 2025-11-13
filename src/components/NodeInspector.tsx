import { motion, AnimatePresence } from 'framer-motion'
import { useNetworkStore } from '../store/networkStore'

export const NodeInspector = () => {
  const { selectedNode, getNode, setSelectedNode, getNodeLinks } = useNetworkStore()
  const node = selectedNode ? getNode(selectedNode) : null

  if (!node) return null

  const nodeLinks = getNodeLinks(node.id)
  const topPorts = node.topPorts.slice(0, 5)

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed top-20 right-10 w-96 glass-panel rounded-lg p-5 z-50"
      >
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-tech-border">
          <div>
            <h2 className="text-lg font-semibold text-tech-text font-mono">
              {node.ip}
            </h2>
            {node.threatScore && (
              <div className="text-xs text-tech-error font-semibold mt-1">
                ⚠ Threat Score: {node.threatScore}
              </div>
            )}
          </div>
          <button
            onClick={() => setSelectedNode(null)}
            className="text-tech-text-muted hover:text-tech-text transition-colors text-xl font-bold w-7 h-7 flex items-center justify-center rounded hover:bg-tech-border"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {node.asn && (
            <div>
              <div className="text-xs text-tech-text-muted mb-1 uppercase tracking-wide">
                ASN
              </div>
              <div className="text-sm font-mono text-tech-text">
                AS{node.asn} {node.org && `(${node.org})`}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs text-tech-text-muted mb-1 uppercase tracking-wide">
              Location
            </div>
            <div className="text-sm text-tech-text">
              {node.country} ({node.lat.toFixed(2)}, {node.lng.toFixed(2)})
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-tech-text-muted mb-1 uppercase tracking-wide">
                Packets
              </div>
              <div className="font-mono text-lg text-tech-text">
                {node.packets.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-tech-text-muted mb-1 uppercase tracking-wide">
                Traffic
              </div>
              <div className="font-mono text-lg text-tech-text">
                {formatBytes(node.bytes)}
              </div>
            </div>
          </div>

          {topPorts.length > 0 && (
            <div>
              <div className="text-xs text-tech-text-muted mb-1 uppercase tracking-wide">
                Top Ports
              </div>
              <div className="text-sm font-mono text-tech-text">
                {topPorts.join(', ')}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs text-tech-text-muted mb-1 uppercase tracking-wide">
              Connections
            </div>
            <div className="text-sm text-tech-text">
              {nodeLinks.length} active links
            </div>
          </div>

          <div>
            <div className="text-xs text-tech-text-muted mb-1 uppercase tracking-wide">
              Last Seen
            </div>
            <div className="text-sm text-tech-text">
              {new Date(node.lastSeen * 1000).toLocaleTimeString()}
            </div>
          </div>

          <button
            onClick={() => {
              // Trace route functionality
              console.log('Tracing route to', node.ip)
            }}
            className="w-full mt-4 px-4 py-2 bg-tech-primary/20 hover:bg-tech-primary/30 border border-tech-primary rounded text-tech-primary text-sm font-semibold transition-colors"
          >
            Trace Route
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

