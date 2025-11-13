import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNetworkStore, NetworkNode, NetworkLink } from '../store/networkStore'
import { useDraggable } from '../hooks/useDraggable'

interface FeedItem {
  id: string
  type: 'packet' | 'connection' | 'threat' | 'dns' | 'bgp'
  timestamp: number
  data: any
  nodeId?: string
  linkId?: string
}

export const DataFeed = () => {
  const { getAllNodes, getAllLinks, setSelectedNode } = useNetworkStore()
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [isExpanded, setIsExpanded] = useState(true)
  const feedRef = useRef<HTMLDivElement>(null)

  // Draggable functionality
  const [initialPos] = useState(() => ({
    x: typeof window !== 'undefined' ? window.innerWidth - 400 : 500, // right side minus width
    y: typeof window !== 'undefined' ? window.innerHeight - 500 : 200, // Account for tab height (400px)
  }))
  const { position, isDragging, elementRef, handleMouseDown } = useDraggable(initialPos)

  useEffect(() => {
    const nodes = getAllNodes()
    const links = getAllLinks()

    // Generate feed items from recent activity
    const items: FeedItem[] = []

    // Recent packet activity
    nodes
      .filter((n) => Date.now() / 1000 - n.lastSeen < 10)
      .slice(0, 10)
      .forEach((node) => {
        items.push({
          id: `packet-${node.id}-${node.lastSeen}`,
          type: 'packet',
          timestamp: node.lastSeen,
          data: { ip: node.ip, packets: node.packets, bytes: node.bytes },
          nodeId: node.id,
        })
      })

    // Recent connections
    links
      .filter((l) => Date.now() / 1000 - l.lastSeen < 10)
      .slice(0, 10)
      .forEach((link) => {
        items.push({
          id: `conn-${link.id}-${link.lastSeen}`,
          type: 'connection',
          timestamp: link.lastSeen,
          data: {
            source: link.source,
            target: link.target,
            protocol: link.protocol,
            packets: link.packets,
          },
          linkId: link.id,
        })
      })

    // Threats
    nodes
      .filter((n) => n.threatInfo)
      .forEach((node) => {
        items.push({
          id: `threat-${node.id}`,
          type: 'threat',
          timestamp: node.threatInfo!.lastSeen,
          data: { ip: node.ip, threat: node.threatInfo },
          nodeId: node.id,
        })
      })

    // Sort by timestamp
    items.sort((a, b) => b.timestamp - a.timestamp)
    setFeedItems(items.slice(0, 30))
  }, [getAllNodes, getAllLinks])

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [feedItems])

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      packet: 'text-tech-primary',
      connection: 'text-tech-secondary',
      threat: 'text-tech-error',
      dns: 'text-tech-accent',
      bgp: 'text-tech-warning',
    }
    return colors[type] || 'text-tech-text-muted'
  }

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      packet: '📦',
      connection: '🔗',
      threat: '⚠️',
      dns: '🌐',
      bgp: '🛣️',
    }
    return icons[type] || '•'
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const handleItemClick = (item: FeedItem) => {
    if (item.nodeId) {
      setSelectedNode(item.nodeId)
    }
  }

  return (
    <div
      ref={elementRef}
      className="fixed z-50 w-96 select-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        opacity: isDragging ? 0.8 : 1,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      <div className="data-panel rounded-lg overflow-hidden">
        <div
          className="px-4 py-3 border-b border-tech-border flex items-center justify-between cursor-move"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-tech-primary rounded-full animate-pulse" />
            <h3 className="text-sm font-semibold text-tech-text uppercase tracking-wide font-mono">
              Live Data Feed
            </h3>
            <span className="text-xs text-tech-text-muted">
              ({feedItems.length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-tech-text-muted hover:text-tech-primary transition-colors">⋮⋮</div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded(!isExpanded)
              }}
              className="text-tech-text-muted hover:text-tech-text transition-colors"
            >
              <svg
                className={`w-4 h-4 transition-transform ${
                  isExpanded ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 400 }}
              exit={{ height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div
                ref={feedRef}
                className="h-96 overflow-y-auto p-2 space-y-1"
                style={{ scrollbarWidth: 'thin' }}
              >
                {feedItems.length === 0 ? (
                  <div className="text-center text-tech-text-muted text-sm py-8 font-mono">
                    No recent activity
                  </div>
                ) : (
                  feedItems.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`data-panel rounded p-2 text-xs cursor-pointer hover:border-tech-primary transition-colors ${
                        item.type === 'threat' ? 'border-tech-error/50' : ''
                      }`}
                      onClick={() => handleItemClick(item)}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span>{getTypeIcon(item.type)}</span>
                          <span className={`font-semibold font-mono ${getTypeColor(item.type)}`}>
                            {item.type.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-tech-text-muted text-xs font-mono">
                          {formatTime(item.timestamp)}
                        </span>
                      </div>
                      <div className="text-tech-text-muted space-y-0.5 font-mono">
                        {item.type === 'packet' && (
                          <>
                            <div className="font-mono text-tech-text">
                              {item.data.ip}
                            </div>
                            <div>
                              {item.data.packets} packets • {formatBytes(item.data.bytes)}
                            </div>
                          </>
                        )}
                        {item.type === 'connection' && (
                          <>
                            <div className="font-mono text-tech-text">
                              {item.data.source} → {item.data.target}
                            </div>
                            <div>
                              {item.data.protocol.toUpperCase()} • {item.data.packets} packets
                            </div>
                          </>
                        )}
                        {item.type === 'threat' && (
                          <>
                            <div className="font-mono text-tech-error">
                              {item.data.ip}
                            </div>
                            <div className="text-tech-error">
                              {item.data.threat.type} • Score: {item.data.threat.score}/100
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
