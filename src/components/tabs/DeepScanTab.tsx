/**
 * DEEP SCAN TAB
 * Full L3-L7 analysis with traceroute, port scan, SSL, BGP, threat intel
 */

import React, { useState, useEffect } from 'react'
import { performDeepScan, DeepScanResult } from '../../lib/scanner/deepScanner'
import { useNetworkStore } from '../../store/networkStore'

interface DeepScanTabProps {
  type: 'global' | 'asn' | 'threat'
  range?: string
}

export const DeepScanTab = ({ type, range }: DeepScanTabProps) => {
  const [results, setResults] = useState<DeepScanResult[]>([])
  const [scanning, setScanning] = useState(true)
  const [progress, setProgress] = useState(0)
  const [selectedIP, setSelectedIP] = useState<string | null>(null)
  const { addNode, addLink } = useNetworkStore()

  useEffect(() => {
    // Generate IPs to scan
    const ipsToScan: string[] = []
    
    if (range) {
      // Parse CIDR or single IP
      if (range.includes('/')) {
        const [ip, prefix] = range.split('/')
        const prefixLen = parseInt(prefix)
        const parts = ip.split('.').map(Number)
        const mask = 0xFFFFFFFF << (32 - prefixLen)
        const startIP = (parts[0] << 24 | parts[1] << 16 | parts[2] << 8 | parts[3]) & mask
        const count = Math.min(1 << (32 - prefixLen), 100) // Limit to 100 IPs
        
        for (let i = 0; i < count; i++) {
          const hostIP = startIP | i
          ipsToScan.push([
            (hostIP >>> 24) & 0xFF,
            (hostIP >>> 16) & 0xFF,
            (hostIP >>> 8) & 0xFF,
            hostIP & 0xFF
          ].join('.'))
        }
      } else {
        ipsToScan.push(range)
      }
    } else {
      // Generate sample IPs
      for (let i = 0; i < 10; i++) {
        ipsToScan.push(
          `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
        )
      }
    }

    let completed = 0
    const scanPromises = ipsToScan.map(async (ip) => {
      const result = await performDeepScan(ip, (prog) => {
        completed++
        setProgress((completed / ipsToScan.length) * 100)
      })
      setResults(prev => [...prev, result])
      
      // Add to network store
      addNode({
        id: ip,
        ip,
        lat: 0,
        lng: 0,
        country: 'Unknown',
        packets: 0,
        bytes: 0,
        topPorts: result.openPorts.map(p => p.port),
        lastSeen: Date.now() / 1000,
        packetHistory: [],
        threatInfo: result.threatIntel?.abuseScore ? {
          score: result.threatIntel.abuseScore,
          type: result.threatIntel.reputation === 'malicious' ? 'malware' : 'scanning',
          firstSeen: Date.now() / 1000,
          lastSeen: Date.now() / 1000,
          reports: result.threatIntel.otxPulses || 0,
        } : undefined,
      })
      
      return result
    })

    Promise.all(scanPromises).then(() => {
      setScanning(false)
    })
  }, [])

  const selectedResult = results.find(r => r.ip === selectedIP)

  return (
    <div className="p-6 space-y-4 h-full bg-tech-panel">
      <div className="flex items-center justify-between border-b border-tech-border pb-3">
        <div>
          <h3 className="text-sm font-mono uppercase text-tech-text">DEEP SCAN: {range || 'GLOBAL'}</h3>
          <div className="text-xs text-tech-text-muted mt-1">
            {results.length} IPs scanned {scanning && `(${progress.toFixed(1)}%)`}
          </div>
        </div>
        <button
          onClick={() => {
            const data = JSON.stringify(results, null, 2)
            const blob = new Blob([data], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `deep-scan-${Date.now()}.json`
            a.click()
          }}
          className="px-3 py-1 text-xs font-mono bg-tech-primary text-tech-bg hover:bg-tech-accent transition-colors"
        >
          EXPORT JSON
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4" style={{ height: 'calc(100% - 100px)' }}>
        {/* Results List */}
        <div className="overflow-y-auto border border-tech-border bg-tech-panel">
          <div className="p-2 text-xs font-mono uppercase text-tech-text-muted border-b border-tech-border">
            SCAN RESULTS ({results.length})
          </div>
          <div className="divide-y divide-tech-border">
            {results.map((result) => (
              <div
                key={result.ip}
                onClick={() => setSelectedIP(result.ip)}
                className={`p-2 cursor-pointer hover:bg-tech-border transition-colors ${
                  selectedIP === result.ip ? 'bg-tech-primary/20' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono text-tech-text">{result.ip}</div>
                  {result.threatIntel?.abuseScore && (
                    <div className={`text-xs ${
                      result.threatIntel.abuseScore > 75 ? 'text-tech-error' :
                      result.threatIntel.abuseScore > 50 ? 'text-tech-warning' :
                      'text-tech-primary'
                    }`}>
                      Threat: {result.threatIntel.abuseScore}
                    </div>
                  )}
                </div>
                <div className="mt-1 text-xs text-tech-text-muted">
                  {result.openPorts.length} ports • {result.traceroute?.length || 0} hops
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed View */}
        <div className="overflow-y-auto border border-tech-border bg-tech-panel p-3">
          {selectedResult ? (
            <div className="space-y-3 text-xs font-mono">
              <div>
                <div className="text-tech-text-muted uppercase mb-1">IP: {selectedResult.ip}</div>
                {selectedResult.hostname && (
                  <div className="text-tech-text">Hostname: {selectedResult.hostname}</div>
                )}
              </div>

              {selectedResult.traceroute && (
                <div>
                  <div className="text-tech-text-muted uppercase mb-1">TRACEROUTE</div>
                  <div className="space-y-1">
                    {selectedResult.traceroute.map((hop) => (
                      <div key={hop.hop} className="text-tech-text">
                        {hop.hop}. {hop.ip} ({hop.latency}ms)
                        {hop.asn && <span className="text-tech-primary ml-2">AS{hop.asn}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedResult.openPorts.length > 0 && (
                <div>
                  <div className="text-tech-text-muted uppercase mb-1">OPEN PORTS ({selectedResult.openPorts.length})</div>
                  <div className="space-y-1">
                    {selectedResult.openPorts.map((p) => (
                      <div key={p.port} className="text-tech-text">
                        {p.port}/{p.service} {p.version && `(${p.version})`} {p.ssl && '[SSL]'}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedResult.sslCerts && (
                <div>
                  <div className="text-tech-text-muted uppercase mb-1">SSL CERTIFICATES</div>
                  {selectedResult.sslCerts.map((cert, i) => (
                    <div key={i} className="text-tech-text">
                      Issuer: {cert.issuer}<br />
                      Valid until: {new Date(cert.validUntil).toLocaleDateString()}
                    </div>
                  ))}
                </div>
              )}

              {selectedResult.bgpPath && (
                <div>
                  <div className="text-tech-text-muted uppercase mb-1">BGP PATH</div>
                  <div className="text-tech-primary">
                    {selectedResult.bgpPath.map(asn => `AS${asn}`).join(' → ')}
                  </div>
                </div>
              )}

              {selectedResult.threatIntel && (
                <div>
                  <div className="text-tech-text-muted uppercase mb-1">THREAT INTELLIGENCE</div>
                  <div className="text-tech-text">
                    Abuse Score: {selectedResult.threatIntel.abuseScore || 'N/A'}<br />
                    OTX Pulses: {selectedResult.threatIntel.otxPulses || 0}<br />
                    Reputation: <span className={
                      selectedResult.threatIntel.reputation === 'malicious' ? 'text-tech-error' :
                      selectedResult.threatIntel.reputation === 'suspicious' ? 'text-tech-warning' :
                      'text-tech-primary'
                    }>{selectedResult.threatIntel.reputation?.toUpperCase()}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-tech-text-muted text-xs font-mono">
              Select an IP to view details
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

