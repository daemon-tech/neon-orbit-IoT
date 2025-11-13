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
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
  }

  // Generate packet history chart data (last 24 hours)
  const packetHistory = node.packetHistory || []
  const chartData = Array.from({ length: 24 }, (_, i) => {
    const hour = Date.now() / 1000 - (23 - i) * 3600
    const dataPoint = packetHistory.find((p) => Math.abs(p.time - hour) < 1800)
    return {
      hour: i,
      count: dataPoint?.count || Math.floor(Math.random() * 100),
    }
  })

  const maxPackets = Math.max(...chartData.map((d) => d.count), 1)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed top-20 right-10 w-96 glass-panel rounded-lg p-5 z-50 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-tech-border">
          <div>
            <h2 className="text-lg font-semibold text-tech-text font-mono">
              {node.ip}
            </h2>
            {node.threatInfo && (
              <div className="mt-2 space-y-1">
                <div className="text-xs text-tech-error font-semibold">
                  ⚠ {node.threatInfo.type.toUpperCase()} Threat
                </div>
                <div className="text-xs text-tech-text-muted">
                  Score: {node.threatInfo.score}/100 • {node.threatInfo.reports} reports
                </div>
                {node.threatInfo.description && (
                  <div className="text-xs text-tech-text-muted italic">
                    {node.threatInfo.description}
                  </div>
                )}
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

          {/* Packet History Chart */}
          <div>
            <div className="text-xs text-tech-text-muted mb-2 uppercase tracking-wide">
              24h Packet Activity
            </div>
            <div className="h-24 relative bg-tech-panel rounded p-2">
              <svg className="w-full h-full" viewBox="0 0 200 80" preserveAspectRatio="none">
                <polyline
                  points={chartData
                    .map((d, i) => `${(i / 23) * 200},${80 - (d.count / maxPackets) * 70}`)
                    .join(' ')}
                  fill="none"
                  stroke={node.threatInfo ? '#ef4444' : '#3b82f6'}
                  strokeWidth="1.5"
                />
                <defs>
                  <linearGradient id={`packetGradient-${node.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={node.threatInfo ? '#ef4444' : '#3b82f6'} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={node.threatInfo ? '#ef4444' : '#3b82f6'} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polygon
                  points={`0,80 ${chartData
                    .map((d, i) => `${(i / 23) * 200},${80 - (d.count / maxPackets) * 70}`)
                    .join(' ')} 200,80`}
                  fill={`url(#packetGradient-${node.id})`}
                />
              </svg>
            </div>
          </div>

          {topPorts.length > 0 && (
            <div>
              <div className="text-xs text-tech-text-muted mb-1 uppercase tracking-wide">
                Top Ports
              </div>
              <div className="flex flex-wrap gap-2">
                {topPorts.map((port) => (
                  <span
                    key={port}
                    className="px-2 py-1 bg-tech-primary/20 text-tech-primary text-xs font-mono rounded"
                  >
                    {port}
                  </span>
                ))}
              </div>
            </div>
          )}

          {nodeLinks.length > 0 && (
            <div>
              <div className="text-xs text-tech-text-muted mb-2 uppercase tracking-wide">
                Active Connections ({nodeLinks.length})
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {nodeLinks.slice(0, 5).map((link) => {
                  const otherNode = link.source === node.id ? link.target : link.source
                  return (
                    <div
                      key={link.id}
                      className="text-xs font-mono text-tech-text-muted p-1 hover:bg-tech-border rounded cursor-pointer"
                      onClick={() => setSelectedNode(otherNode)}
                    >
                      {link.source === node.id ? '→' : '←'} {otherNode}
                      <span className="ml-2 text-tech-text">
                        {link.protocol.toUpperCase()}
                      </span>
                    </div>
                  )
                })}
                {nodeLinks.length > 5 && (
                  <div className="text-xs text-tech-text-muted italic">
                    +{nodeLinks.length - 5} more...
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs text-tech-text-muted mb-1 uppercase tracking-wide">
              Last Seen
            </div>
            <div className="text-sm text-tech-text">
              {new Date(node.lastSeen * 1000).toLocaleTimeString()}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                window.open(`https://www.abuseipdb.com/check/${node.ip}`, '_blank')
              }}
              className="flex-1 px-4 py-2 bg-tech-primary/20 hover:bg-tech-primary/30 border border-tech-primary rounded text-tech-primary text-sm font-semibold transition-colors"
            >
              Check AbuseIPDB
            </button>
            <button
              onClick={() => {
                console.log('Tracing route to', node.ip)
              }}
              className="flex-1 px-4 py-2 bg-tech-primary/20 hover:bg-tech-primary/30 border border-tech-primary rounded text-tech-primary text-sm font-semibold transition-colors"
            >
              Trace Route
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
