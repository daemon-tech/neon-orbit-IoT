/**
 * THREAT HUNTER TAB
 * Automated vulnerability scanning with CVE matching
 */

import React, { useState, useEffect } from 'react'
import { performDeepScan } from '../../lib/scanner/deepScanner'
import { getHighThreatASNs } from '../../lib/geo/asnDatabase'

interface Threat {
  ip: string
  score: number
  cvss: number
  cve?: string
  port: number
  service: string
  description: string
  severity: 'critical' | 'high' | 'medium'
}

// CVE Database (simplified)
const CVE_DATABASE: Record<string, { cvss: number; description: string }> = {
  'CVE-2021-44228': { cvss: 10.0, description: 'Log4j Remote Code Execution' },
  'CVE-2021-34527': { cvss: 9.8, description: 'Windows Print Spooler RCE' },
  'CVE-2021-1675': { cvss: 8.8, description: 'PrintNightmare Local Privilege Escalation' },
  'CVE-2020-1472': { cvss: 10.0, description: 'Netlogon Elevation of Privilege' },
  'CVE-2019-0708': { cvss: 9.8, description: 'BlueKeep RDP Remote Code Execution' },
  'CVE-2017-0144': { cvss: 9.3, description: 'EternalBlue SMB Remote Code Execution' },
}

// Match services to CVEs
function matchCVE(port: number, service: string, version?: string): string | undefined {
  if (port === 3389 && service === 'RDP') return 'CVE-2019-0708'
  if (port === 445 && service === 'SMB') return 'CVE-2017-0144'
  if (port === 135 && service === 'MSRPC') return 'CVE-2021-34527'
  if (port === 389 && service === 'LDAP') return 'CVE-2020-1472'
  if (port === 8080 && version?.includes('Log4j')) return 'CVE-2021-44228'
  return undefined
}

export const ThreatHunterTab = () => {
  const [threats, setThreats] = useState<Threat[]>([])
  const [scanning, setScanning] = useState(true)
  const [selectedThreat, setSelectedThreat] = useState<Threat | null>(null)

  useEffect(() => {
    // Scan high-threat ASNs
    const threatASNs = getHighThreatASNs(10).slice(0, 20)
    const ipsToScan: string[] = []

    threatASNs.forEach(asn => {
      asn.ipRanges.slice(0, 1).forEach(range => {
        const [ip, prefix] = range.cidr.split('/')
        const prefixLen = parseInt(prefix)
        const parts = ip.split('.').map(Number)
        const mask = 0xFFFFFFFF << (32 - prefixLen)
        const startIP = (parts[0] << 24 | parts[1] << 16 | parts[2] << 8 | parts[3]) & mask
        
        for (let i = 1; i <= 10; i++) {
          const hostIP = startIP | i
          ipsToScan.push([
            (hostIP >>> 24) & 0xFF,
            (hostIP >>> 16) & 0xFF,
            (hostIP >>> 8) & 0xFF,
            hostIP & 0xFF
          ].join('.'))
        }
      })
    })

    // Scan vulnerable ports
    const vulnerablePorts = [3389, 445, 135, 139, 22, 21, 23, 1433, 3306, 5432]

    Promise.all(ipsToScan.map(async (ip) => {
      const result = await performDeepScan(ip)
      
      // Check for vulnerabilities
      result.openPorts.forEach(portInfo => {
        if (vulnerablePorts.includes(portInfo.port)) {
          const cve = matchCVE(portInfo.port, portInfo.service, portInfo.version)
          const cveInfo = cve ? CVE_DATABASE[cve] : undefined
          
          if (cveInfo || result.threatIntel?.abuseScore) {
            const score = result.threatIntel?.abuseScore || (cveInfo ? cveInfo.cvss * 10 : 50)
            const severity = score >= 90 ? 'critical' : score >= 70 ? 'high' : 'medium'
            
            setThreats(prev => [...prev, {
              ip,
              score,
              cvss: cveInfo?.cvss || score / 10,
              cve,
              port: portInfo.port,
              service: portInfo.service,
              description: cveInfo?.description || `Vulnerable ${portInfo.service} service`,
              severity,
            }])
          }
        }
      })
    })).then(() => {
      setScanning(false)
      // Sort by severity
      setThreats(prev => prev.sort((a, b) => {
        const severityOrder = { critical: 3, high: 2, medium: 1 }
        return severityOrder[b.severity] - severityOrder[a.severity] || b.score - a.score
      }))
    })
  }, [])

  return (
    <div className="p-6 space-y-4 h-full bg-tech-panel">
      <div className="flex items-center justify-between border-b border-tech-border pb-3">
        <div>
          <h3 className="text-sm font-mono uppercase text-tech-text">THREAT HUNTER</h3>
          <div className="text-xs text-tech-text-muted mt-1">
            {threats.length} threats found {scanning && '(scanning...)'}
          </div>
        </div>
        <button
          onClick={() => {
            const data = JSON.stringify(threats, null, 2)
            const blob = new Blob([data], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `threats-${Date.now()}.json`
            a.click()
          }}
          className="px-3 py-1 text-xs font-mono bg-tech-warning text-tech-bg hover:bg-red-600 transition-colors"
        >
          EXPORT JSON
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4" style={{ height: 'calc(100% - 100px)' }}>
        {/* Threats List */}
        <div className="overflow-y-auto border border-tech-border bg-tech-panel">
          <div className="p-2 text-xs font-mono uppercase text-tech-text-muted border-b border-tech-border">
            THREATS ({threats.length})
          </div>
          <div className="divide-y divide-tech-border">
            {threats.map((threat, i) => (
              <div
                key={i}
                onClick={() => setSelectedThreat(threat)}
                className={`p-2 cursor-pointer hover:bg-tech-border transition-colors ${
                  selectedThreat === threat ? 'bg-tech-warning/20' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono text-tech-text">{threat.ip}</div>
                  <div className={`text-xs font-bold ${
                    threat.severity === 'critical' ? 'text-tech-error' :
                    threat.severity === 'high' ? 'text-tech-warning' :
                    'text-tech-primary'
                  }`}>
                    {threat.severity.toUpperCase()}
                  </div>
                </div>
                <div className="mt-1 text-xs text-tech-text-muted">
                  {threat.port}/{threat.service} • CVSS: {threat.cvss.toFixed(1)}
                </div>
                {threat.cve && (
                  <div className="mt-1 text-xs text-tech-error font-mono">
                    {threat.cve}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Threat Details */}
        <div className="overflow-y-auto border border-tech-border bg-tech-panel p-3">
          {selectedThreat ? (
            <div className="space-y-3 text-xs font-mono">
              <div>
                <div className="text-tech-text-muted uppercase mb-1">IP ADDRESS</div>
                <div className="text-tech-text">{selectedThreat.ip}</div>
              </div>
              <div>
                <div className="text-tech-text-muted uppercase mb-1">SEVERITY</div>
                <div className={`font-bold ${
                  selectedThreat.severity === 'critical' ? 'text-tech-error' :
                  selectedThreat.severity === 'high' ? 'text-tech-warning' :
                  'text-tech-primary'
                }`}>
                  {selectedThreat.severity.toUpperCase()}
                </div>
              </div>
              <div>
                <div className="text-tech-text-muted uppercase mb-1">VULNERABLE SERVICE</div>
                <div className="text-tech-text">
                  Port {selectedThreat.port} / {selectedThreat.service}
                </div>
              </div>
              {selectedThreat.cve && (
                <div>
                  <div className="text-tech-text-muted uppercase mb-1">CVE</div>
                  <div className="text-tech-error font-bold">{selectedThreat.cve}</div>
                  <div className="text-tech-text mt-1">CVSS: {selectedThreat.cvss.toFixed(1)}</div>
                </div>
              )}
              <div>
                <div className="text-tech-text-muted uppercase mb-1">DESCRIPTION</div>
                <div className="text-tech-text">{selectedThreat.description}</div>
              </div>
              <div>
                <div className="text-tech-text-muted uppercase mb-1">THREAT SCORE</div>
                <div className="text-tech-warning">{selectedThreat.score}/100</div>
              </div>
            </div>
          ) : (
            <div className="text-center text-tech-text-muted text-xs font-mono">
              Select a threat to view details
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

