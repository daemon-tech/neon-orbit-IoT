import { motion, AnimatePresence } from 'framer-motion'
import { useNetworkStore } from '../store/networkStore'
import { ASN_DATABASE } from '../lib/geo/asnDatabase'

export const NodeInspector = () => {
  const { selectedNode, getNode, setSelectedNode, getNodeLinks } = useNetworkStore()
  const node = selectedNode ? getNode(selectedNode) : null

  if (!node) return null

  const nodeLinks = getNodeLinks(node.id)
  const topPorts = node.topPorts.slice(0, 10)
  const asnData = node.asn ? ASN_DATABASE.get(node.asn) : null

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
      count: dataPoint?.count || 0,
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
            {node.hostname && (
              <div className="text-xs text-tech-text-muted font-mono mt-1">
                {node.hostname}
              </div>
            )}
            {node.isPrivate && (
              <div className="text-xs text-tech-warning font-mono mt-1">
                PRIVATE IP (RFC 1918)
              </div>
            )}
            {node.threatInfo && (
              <div className="mt-2 space-y-1">
                <div className="text-xs text-tech-error font-semibold">
                  ⚠ {node.threatInfo.type.toUpperCase()} Threat
                </div>
                <div className="text-xs text-tech-text-muted">
                  Score: {node.threatInfo.score}/100
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setSelectedNode(null)}
            className="text-tech-text-muted hover:text-tech-text transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Location & ASN */}
        <div className="space-y-3 mb-4">
          <div>
            <div className="text-xs text-tech-text-muted uppercase tracking-wider mb-1 font-mono">
              LOCATION
            </div>
            <div className="text-sm text-tech-text font-mono">
              {node.city && `${node.city}, `}
              {node.region && `${node.region}, `}
              {node.country}
            </div>
            <div className="text-xs text-tech-text-muted font-mono">
              {node.lat.toFixed(4)}, {node.lng.toFixed(4)}
            </div>
          </div>

          {node.asn && (
            <div>
              <div className="text-xs text-tech-text-muted uppercase tracking-wider mb-1 font-mono">
                AUTONOMOUS SYSTEM
              </div>
              <div className="text-sm text-tech-primary font-mono">
                AS{node.asn} - {node.org || 'Unknown'}
              </div>
              {asnData && (
                <div className="mt-2 space-y-1 text-xs text-tech-text-muted font-mono">
                  <div>Type: {asnData.type}</div>
                  <div>Tier: {asnData.tier}</div>
                  {asnData.peers && asnData.peers.length > 0 && (
                    <div>Peers: {asnData.peers.length}</div>
                  )}
                  {asnData.threats > 0 && (
                    <div className="text-tech-warning">Threat Level: {asnData.threats}/100</div>
                  )}
                </div>
              )}
              {node.bgpPeers && node.bgpPeers.length > 0 && (
                <div className="mt-2 text-xs text-tech-text-muted font-mono">
                  BGP Peers: {node.bgpPeers.slice(0, 5).map(p => `AS${p}`).join(', ')}
                  {node.bgpPeers.length > 5 && ` +${node.bgpPeers.length - 5}`}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Device Fingerprinting */}
        {(node.deviceType || node.os || node.services) && (
          <div className="mb-4 pb-4 border-b border-tech-border">
            <div className="text-xs text-tech-text-muted uppercase tracking-wider mb-2 font-mono">
              DEVICE INTELLIGENCE
            </div>
            <div className="space-y-2 text-xs font-mono">
              {node.deviceType && (
                <div>
                  <span className="text-tech-text-muted">Type: </span>
                  <span className="text-tech-text">{node.deviceType.toUpperCase()}</span>
                </div>
              )}
              {node.os && (
                <div>
                  <span className="text-tech-text-muted">OS: </span>
                  <span className="text-tech-text">{node.os}</span>
                </div>
              )}
              {node.services && node.services.length > 0 && (
                <div>
                  <span className="text-tech-text-muted">Services: </span>
                  <span className="text-tech-primary">{node.services.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Traffic Statistics */}
        <div className="mb-4 pb-4 border-b border-tech-border">
          <div className="text-xs text-tech-text-muted uppercase tracking-wider mb-2 font-mono">
            TRAFFIC STATISTICS
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <div className="text-tech-text-muted">Packets</div>
              <div className="text-tech-primary">{node.packets.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-tech-text-muted">Bytes</div>
              <div className="text-tech-primary">{formatBytes(node.bytes)}</div>
            </div>
            <div>
              <div className="text-tech-text-muted">Connections</div>
              <div className="text-tech-primary">{nodeLinks.length}</div>
            </div>
            <div>
              <div className="text-tech-text-muted">Last Seen</div>
              <div className="text-tech-text">
                {new Date(node.lastSeen * 1000).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>

        {/* Top Ports */}
        {topPorts.length > 0 && (
          <div className="mb-4 pb-4 border-b border-tech-border">
            <div className="text-xs text-tech-text-muted uppercase tracking-wider mb-2 font-mono">
              ACTIVE PORTS
            </div>
            <div className="flex flex-wrap gap-2">
              {topPorts.map((port) => {
                const portNames: Record<number, string> = {
                  22: 'SSH',
                  80: 'HTTP',
                  443: 'HTTPS',
                  53: 'DNS',
                  3389: 'RDP',
                  3306: 'MySQL',
                  5432: 'PostgreSQL',
                  8080: 'HTTP-Alt',
                  8443: 'HTTPS-Alt',
                }
                return (
                  <div
                    key={port}
                    className="px-2 py-1 bg-tech-panel border border-tech-border text-xs font-mono text-tech-text"
                  >
                    {port} {portNames[port] && `(${portNames[port]})`}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Threat Information */}
        {node.threatInfo && (
          <div className="mb-4 pb-4 border-b border-tech-border">
            <div className="text-xs text-tech-text-muted uppercase tracking-wider mb-2 font-mono">
              THREAT INTELLIGENCE
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div>
                <span className="text-tech-text-muted">Type: </span>
                <span className="text-tech-warning">{node.threatInfo.type.toUpperCase()}</span>
              </div>
              <div>
                <span className="text-tech-text-muted">Score: </span>
                <span className="text-tech-error">{node.threatInfo.score}/100</span>
              </div>
              <div>
                <span className="text-tech-text-muted">Reports: </span>
                <span className="text-tech-text">{node.threatInfo.reports}</span>
              </div>
              {node.threatInfo.description && (
                <div className="text-tech-text-muted italic">
                  {node.threatInfo.description}
                </div>
              )}
              <div>
                <span className="text-tech-text-muted">First Seen: </span>
                <span className="text-tech-text">
                  {new Date(node.threatInfo.firstSeen * 1000).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Packet History Chart */}
        <div className="mb-4">
          <div className="text-xs text-tech-text-muted uppercase tracking-wider mb-2 font-mono">
            PACKET HISTORY (24H)
          </div>
          <div className="h-20 flex items-end gap-1">
            {chartData.map((data, i) => (
              <div
                key={i}
                className="flex-1 bg-tech-primary"
                style={{
                  height: `${(data.count / maxPackets) * 100}%`,
                  minHeight: '2px',
                }}
                title={`Hour ${i}: ${data.count} packets`}
              />
            ))}
          </div>
        </div>

        {/* Connections */}
        {nodeLinks.length > 0 && (
          <div>
            <div className="text-xs text-tech-text-muted uppercase tracking-wider mb-2 font-mono">
              CONNECTIONS ({nodeLinks.length})
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {nodeLinks.slice(0, 10).map((link) => {
                const targetId = link.source === node.id ? link.target : link.source
                const target = useNetworkStore.getState().getNode(targetId)
                return (
                  <div
                    key={link.id}
                    className="text-xs font-mono text-tech-text-muted hover:text-tech-text transition-colors cursor-pointer"
                    onClick={() => setSelectedNode(targetId)}
                  >
                    {targetId} ({link.protocol.toUpperCase()}) - {formatBytes(link.bytes)}
                  </div>
                )
              })}
              {nodeLinks.length > 10 && (
                <div className="text-xs text-tech-text-muted font-mono">
                  +{nodeLinks.length - 10} more connections
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
