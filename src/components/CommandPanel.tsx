/**
 * COMMAND CENTER v3 - MILITARY-GRADE COMMAND PANEL
 * Every action opens a live, detailed, closable monitor tab
 */

import { useState } from 'react'
import { useNetworkStore } from '../store/networkStore'
import { useNetworkScanner } from '../hooks/useNetworkScanner'
import { useTabStore } from '../store/tabStore'
import { LocalNetworkTab } from './tabs/LocalNetworkTab'
import { DeepScanTab } from './tabs/DeepScanTab'
import { ThreatHunterTab } from './tabs/ThreatHunterTab'
import { LiveFeedTab } from './tabs/LiveFeedTab'

export const CommandPanel = () => {
  const [isExpanded, setIsExpanded] = useState(true)
  const [scanType, setScanType] = useState<'global' | 'asn' | 'local' | 'threat'>('global')
  const [scanRange, setScanRange] = useState('')
  const { isScanning, scanProgress, startScan, stopScan, scanStats } = useNetworkScanner()
  const { addTab } = useTabStore()

  const handleLocalScan = () => {
    // Generate local IP range
    const localRanges = ['192.168.1.0/24', '192.168.0.0/24', '10.0.0.0/24', '172.16.0.0/24']
    const ipRange: string[] = []
    
    localRanges.forEach(cidr => {
      const [ip, prefix] = cidr.split('/')
      const prefixLen = parseInt(prefix)
      const parts = ip.split('.').map(Number)
      const mask = 0xFFFFFFFF << (32 - prefixLen)
      const startIP = (parts[0] << 24 | parts[1] << 16 | parts[2] << 8 | parts[3]) & mask
      
      for (let i = 1; i <= 254; i++) {
        const hostIP = startIP | i
        ipRange.push([
          (hostIP >>> 24) & 0xFF,
          (hostIP >>> 16) & 0xFF,
          (hostIP >>> 8) & 0xFF,
          hostIP & 0xFF
        ].join('.'))
      }
    })

    addTab({
      id: 'local-network',
      title: 'LOCAL NETWORK MESH',
      type: 'local',
      content: <LocalNetworkTab ipRange={ipRange.slice(0, 254)} />,
    })
  }

  const handleDeepScan = (type: 'global' | 'asn' | 'threat', range?: string) => {
    const tabId = `scan-${type}-${Date.now()}`
    const title = type === 'threat' ? 'THREAT HUNTER' : `SCAN: ${range || 'GLOBAL'}`
    
    addTab({
      id: tabId,
      title,
      type: type === 'threat' ? 'threat' : 'scan',
      content: <DeepScanTab type={type} range={range} />,
      data: { type, range },
    })
  }

  const handleThreatScan = () => {
    addTab({
      id: 'threat-hunter',
      title: 'THREAT HUNTER',
      type: 'threat',
      content: <ThreatHunterTab />,
    })
  }

  const handleLiveFeed = (source: 'bgp' | 'dns' | 'netflow' | 'pcap') => {
    const tabId = `feed-${source}`
    const titles = {
      bgp: 'LIVE FEED: BGPStream',
      dns: 'LIVE FEED: Cloudflare Radar',
      netflow: 'LIVE FEED: NetFlow',
      pcap: 'LIVE FEED: Packet Capture',
    }
    
    addTab({
      id: tabId,
      title: titles[source],
      type: 'feed',
      content: <LiveFeedTab source={source} />,
    })
  }

  return (
    <div className={`fixed top-16 left-4 z-50 glass-panel rounded-lg transition-all duration-300 ${
      isExpanded ? 'w-96' : 'w-16'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-tech-border">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${isScanning ? 'bg-tech-warning animate-pulse' : 'bg-tech-primary'}`} />
          <span className="text-xs font-mono uppercase tracking-wider text-tech-text">
            {isExpanded ? 'COMMAND CENTER v3' : 'CC'}
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-tech-text-muted hover:text-tech-text transition-colors"
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Scan Type Selector */}
          <div>
            <label className="text-xs font-mono text-tech-text-muted uppercase tracking-wider mb-2 block">
              SCAN MODE
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['global', 'asn', 'local', 'threat'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setScanType(type)}
                  className={`px-3 py-2 text-xs font-mono uppercase transition-colors ${
                    scanType === type
                      ? 'bg-tech-primary text-tech-bg'
                      : 'bg-tech-panel border border-tech-border text-tech-text hover:border-tech-primary'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Scan Range Input */}
          {scanType !== 'local' && (
            <div>
              <label className="text-xs font-mono text-tech-text-muted uppercase tracking-wider mb-2 block">
                TARGET RANGE
              </label>
              <input
                type="text"
                value={scanRange}
                onChange={(e) => setScanRange(e.target.value)}
                placeholder={scanType === 'global' ? '8.8.8.0/24' : scanType === 'asn' ? 'ASN:15169' : '192.168.1.0/24'}
                className="w-full px-3 py-2 bg-tech-panel border border-tech-border text-tech-text font-mono text-xs focus:border-tech-primary focus:outline-none"
                disabled={isScanning}
              />
            </div>
          )}

          {/* Scan Controls */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (scanType === 'local') {
                  handleLocalScan()
                } else {
                  handleDeepScan(scanType, scanRange || undefined)
                }
              }}
              disabled={isScanning}
              className="flex-1 px-4 py-2 bg-tech-primary text-tech-bg font-mono text-xs uppercase tracking-wider hover:bg-tech-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              INITIATE SCAN
            </button>
            {isScanning && (
              <button
                onClick={stopScan}
                className="px-4 py-2 bg-tech-warning text-tech-bg font-mono text-xs uppercase tracking-wider hover:bg-red-600 transition-colors"
              >
                ABORT
              </button>
            )}
          </div>

          {/* Quick Actions */}
          <div className="pt-2 border-t border-tech-border">
            <div className="text-xs font-mono text-tech-text-muted uppercase tracking-wider mb-2">
              QUICK ACTIONS
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleThreatScan}
                className="px-3 py-2 text-xs font-mono bg-tech-panel border border-tech-warning text-tech-warning hover:bg-tech-warning hover:text-tech-bg transition-colors"
              >
                THREAT SCAN
              </button>
              <button
                onClick={handleLocalScan}
                className="px-3 py-2 text-xs font-mono bg-tech-panel border border-tech-primary text-tech-primary hover:bg-tech-primary hover:text-tech-bg transition-colors"
              >
                LOCAL NET
              </button>
            </div>
          </div>

          {/* Live Feeds */}
          <div className="pt-2 border-t border-tech-border">
            <div className="text-xs font-mono text-tech-text-muted uppercase tracking-wider mb-2">
              LIVE FEEDS
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleLiveFeed('bgp')}
                className="px-3 py-2 text-xs font-mono bg-tech-panel border border-tech-primary text-tech-primary hover:bg-tech-primary hover:text-tech-bg transition-colors"
              >
                BGPStream
              </button>
              <button
                onClick={() => handleLiveFeed('dns')}
                className="px-3 py-2 text-xs font-mono bg-tech-panel border border-tech-primary text-tech-primary hover:bg-tech-primary hover:text-tech-bg transition-colors"
              >
                DNS Radar
              </button>
              <button
                onClick={() => handleLiveFeed('netflow')}
                className="px-3 py-2 text-xs font-mono bg-tech-panel border border-tech-primary text-tech-primary hover:bg-tech-primary hover:text-tech-bg transition-colors"
              >
                NetFlow
              </button>
              <button
                onClick={() => handleLiveFeed('pcap')}
                className="px-3 py-2 text-xs font-mono bg-tech-panel border border-tech-primary text-tech-primary hover:bg-tech-primary hover:text-tech-bg transition-colors"
              >
                Packet Capture
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
