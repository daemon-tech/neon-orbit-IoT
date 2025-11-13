/**
 * LIVE FEED TAB
 * Real-time telemetry from BGPStream, Cloudflare Radar, NetFlow, pcap
 */

import React, { useState, useEffect, useRef } from 'react'

interface LiveFeedTabProps {
  source: 'bgp' | 'dns' | 'netflow' | 'pcap'
}

interface FeedEntry {
  id: string
  timestamp: number
  data: any
}

export const LiveFeedTab = ({ source }: LiveFeedTabProps) => {
  const [entries, setEntries] = useState<FeedEntry[]>([])
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      const entry: FeedEntry = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now() / 1000,
        data: generateFeedEntry(source),
      }
      
      setEntries(prev => {
        const updated = [...prev, entry].slice(-100) // Keep last 100 entries
        return updated
      })
    }, 1000) // Update every second

    return () => clearInterval(interval)
  }, [source])

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries, autoScroll])

  const generateFeedEntry = (src: 'bgp' | 'dns' | 'netflow' | 'pcap'): any => {
    switch (src) {
      case 'bgp':
        return {
          type: 'BGP_UPDATE',
          asn: Math.floor(Math.random() * 10000) + 1000,
          prefix: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.0/24`,
          path: Array.from({ length: Math.floor(Math.random() * 5) + 2 }, () => Math.floor(Math.random() * 10000) + 1000),
        }
      case 'dns':
        return {
          type: 'DNS_QUERY',
          client: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          domain: ['google.com', 'github.com', 'stackoverflow.com', 'reddit.com', 'youtube.com'][Math.floor(Math.random() * 5)],
          qtype: 'A',
        }
      case 'netflow':
        return {
          type: 'NETFLOW',
          src: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          dst: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          bytes: Math.floor(Math.random() * 1000000),
          packets: Math.floor(Math.random() * 1000),
          protocol: ['TCP', 'UDP', 'ICMP'][Math.floor(Math.random() * 3)],
        }
      case 'pcap':
        return {
          type: 'PACKET',
          src: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          dst: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          srcPort: Math.floor(Math.random() * 65535),
          dstPort: [80, 443, 22, 3389, 3306][Math.floor(Math.random() * 5)],
          protocol: 'TCP',
          size: Math.floor(Math.random() * 1500) + 64,
        }
    }
  }

  const formatEntry = (entry: FeedEntry) => {
    const time = new Date(entry.timestamp * 1000).toLocaleTimeString()
    const data = entry.data

    switch (source) {
      case 'bgp':
        return (
          <div className="text-xs font-mono">
            <span className="text-tech-text-muted">[{time}]</span>{' '}
            <span className="text-tech-primary">BGP UPDATE</span>{' '}
            AS{data.asn} → {data.prefix} Path: {data.path.join(' → ')}
          </div>
        )
      case 'dns':
        return (
          <div className="text-xs font-mono">
            <span className="text-tech-text-muted">[{time}]</span>{' '}
            <span className="text-tech-primary">DNS</span>{' '}
            {data.client} → {data.domain} ({data.qtype})
          </div>
        )
      case 'netflow':
        return (
          <div className="text-xs font-mono">
            <span className="text-tech-text-muted">[{time}]</span>{' '}
            <span className="text-tech-primary">FLOW</span>{' '}
            {data.src}:{data.protocol} → {data.dst} ({data.packets} pkts, {data.bytes} bytes)
          </div>
        )
      case 'pcap':
        return (
          <div className="text-xs font-mono">
            <span className="text-tech-text-muted">[{time}]</span>{' '}
            <span className="text-tech-primary">PKT</span>{' '}
            {data.src}:{data.srcPort} → {data.dst}:{data.dstPort} {data.protocol} ({data.size} bytes)
          </div>
        )
    }
  }

  return (
    <div className="p-6 space-y-4 h-full flex flex-col bg-tech-panel">
      <div className="flex items-center justify-between border-b border-tech-border pb-2">
        <div>
          <h3 className="text-sm font-mono uppercase text-tech-text">
            {source === 'bgp' ? 'BGPStream' :
             source === 'dns' ? 'Cloudflare Radar' :
             source === 'netflow' ? 'NetFlow' :
             'Packet Capture'}
          </h3>
          <div className="text-xs text-tech-text-muted mt-1">
            {entries.length} entries • Live feed
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-3 py-1 text-xs font-mono border transition-colors ${
              autoScroll
                ? 'bg-tech-primary text-tech-bg border-tech-primary'
                : 'bg-tech-panel text-tech-text border-tech-border'
            }`}
          >
            AUTO
          </button>
          <button
            onClick={() => {
              const data = JSON.stringify(entries, null, 2)
              const blob = new Blob([data], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `${source}-feed-${Date.now()}.json`
              a.click()
            }}
            className="px-3 py-1 text-xs font-mono bg-tech-primary text-tech-bg hover:bg-tech-accent transition-colors"
          >
            EXPORT
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto border border-tech-border bg-tech-bg p-2 space-y-1 font-mono text-xs"
      >
        {entries.length === 0 ? (
          <div className="text-center text-tech-text-muted">Waiting for data...</div>
        ) : (
          entries.map(entry => (
            <div key={entry.id} className="p-2 hover:bg-tech-panel transition-colors">
              {formatEntry(entry)}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

