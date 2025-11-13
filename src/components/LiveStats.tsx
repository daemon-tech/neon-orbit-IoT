import { useEffect, useState } from 'react'
import { useNetworkStore } from '../store/networkStore'
import { useDraggable } from '../hooks/useDraggable'

export const LiveStats = () => {
  const { getAllNodes, getAllLinks } = useNetworkStore()
  const [stats, setStats] = useState({
    totalNodes: 0,
    totalLinks: 0,
    totalPackets: 0,
    totalBytes: 0,
    threatCount: 0,
  })

  // Draggable functionality
  const [initialPos] = useState(() => ({
    x: 40, // left-10 = 40px
    y: typeof window !== 'undefined' ? window.innerHeight - 500 : 200, // Account for tab height (400px)
  }))
  const { position, isDragging, elementRef, handleMouseDown } = useDraggable(initialPos)

  useEffect(() => {
    const updateStats = () => {
      const nodes = getAllNodes()
      const links = getAllLinks()
      
      setStats({
        totalNodes: nodes.length,
        totalLinks: links.length,
        totalPackets: nodes.reduce((sum, n) => sum + n.packets, 0),
        totalBytes: nodes.reduce((sum, n) => sum + n.bytes, 0),
        threatCount: nodes.filter((n) => n.threatInfo).length,
      })
    }

    updateStats()
    const interval = setInterval(updateStats, 1000)
    return () => clearInterval(interval)
  }, [getAllNodes, getAllLinks])

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
  }

  return (
    <div
      ref={elementRef}
      className="fixed glass-panel rounded-lg p-5 z-50 min-w-[280px] select-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        opacity: isDragging ? 0.8 : 1,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      <div 
        className="flex items-center gap-2 mb-4 pb-3 border-b border-tech-border cursor-move"
        onMouseDown={handleMouseDown}
      >
        <div className="w-2 h-2 bg-tech-accent rounded-full animate-pulse" />
        <h3 className="text-sm font-semibold text-tech-text uppercase tracking-wide font-mono">
          Network Statistics
        </h3>
        <div className="ml-auto text-xs text-tech-text-muted hover:text-tech-primary transition-colors">⋮⋮</div>
      </div>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-tech-text-muted font-mono text-xs">Nodes</span>
          <span className="font-mono font-semibold text-tech-text">
            {stats.totalNodes.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-tech-text-muted font-mono text-xs">Links</span>
          <span className="font-mono font-semibold text-tech-text">
            {stats.totalLinks.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-tech-text-muted font-mono text-xs">Packets</span>
          <span className="font-mono font-semibold text-tech-text">
            {stats.totalPackets.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-tech-text-muted font-mono text-xs">Traffic</span>
          <span className="font-mono font-semibold text-tech-text">
            {formatBytes(stats.totalBytes)}
          </span>
        </div>
        {stats.threatCount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-tech-text-muted font-mono text-xs">Threats</span>
            <span className="font-mono font-semibold text-tech-error">
              {stats.threatCount}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
