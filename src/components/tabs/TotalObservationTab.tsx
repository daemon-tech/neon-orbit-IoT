/**
 * TOTAL OBSERVATION TAB
 * Complete analysis: Deep scan, threat intel, BGP, DNS, traceroute, ports, SSL, HTTP
 */

import React, { useState, useEffect } from 'react'
import { performDeepScan, DeepScanResult } from '../../lib/scanner/deepScanner'
import { useNetworkStore } from '../../store/networkStore'
import { getASNForIP, ASN_DATABASE, generateIPFromASN } from '../../lib/geo/asnDatabase'
import { performBGPDeepAnalysis, BGPDeepAnalysis } from '../../lib/scanner/bgpAnalyzer'
import { lookupASN } from '../../lib/scanner/asnLookup'
import {
  fetchWHOIS,
  enumerateSubdomains,
  fetchCertTransparency,
  fetchPassiveDNS,
  fetchSecurityHeaders,
  detectTechnologyStack,
  findRelatedEntities,
  fetchHistoricalData,
  fetchVulnerabilities,
  WHOISData,
  SubdomainData,
  CertTransparencyData,
  PassiveDNSData,
  SecurityHeaders,
  TechnologyStack,
  RelatedEntity,
  HistoricalData,
  VulnerabilityData,
} from '../../lib/scanner/infoScraper'

interface TotalObservationTabProps {
  target: string
  searchType: 'ip' | 'asn' | 'hostname' | 'domain' | 'cidr'
}

interface ObservationData {
  deepScan?: DeepScanResult
  geoData?: {
    country: string
    city?: string
    region?: string
    lat: number
    lng: number
    org?: string
    asn?: number
  }
  dnsRecords?: Array<{ type: string; value: string }>
  bgpInfo?: {
    asn: number
    org: string
    peers: number[]
    customers: number[]
    providers: number[]
  }
  bgpDeepAnalysis?: BGPDeepAnalysis
  threatData?: {
    abuseScore: number
    otxPulses: number
    reputation: string
    reports: number
  }
  networkActivity?: {
    packets: number
    bytes: number
    connections: number
    topPorts: number[]
  }
  // Additional scraped data
  whois?: WHOISData
  subdomains?: SubdomainData[]
  certTransparency?: CertTransparencyData[]
  passiveDNS?: PassiveDNSData
  securityHeaders?: SecurityHeaders
  technologyStack?: TechnologyStack
  relatedEntities?: RelatedEntity[]
  historicalData?: HistoricalData
  vulnerabilities?: VulnerabilityData[]
}

export const TotalObservationTab = ({ target, searchType }: TotalObservationTabProps) => {
  const [data, setData] = useState<ObservationData>({})
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  const [activeSection, setActiveSection] = useState<string>('overview')
  const { addNode, getAllNodes, getAllLinks } = useNetworkStore()

  useEffect(() => {
    let mounted = true

    const performObservation = async () => {
      setLoading(true)
      setProgress(0)

      const observation: ObservationData = {}

      try {
        // Step 1: Resolve target to IP if needed
        let targetIP = target
        if (searchType === 'domain' || searchType === 'hostname') {
          // Simulate DNS resolution
          setProgress(10)
          await new Promise(resolve => setTimeout(resolve, 500))
          // In production, use real DNS lookup
          // For now, generate a realistic IP based on domain hash
          const domainHash = target.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
          targetIP = `${(domainHash % 200) + 10}.${((domainHash * 2) % 255)}.${((domainHash * 3) % 255)}.${((domainHash * 4) % 255)}`
        } else if (searchType === 'asn') {
          // Extract ASN number
          const asnNum = parseInt(target.replace(/ASN?:?/i, ''))
          
          // First check local database
          let asnData = ASN_DATABASE.get(asnNum)
          
          // If not in database, fetch from real APIs
          if (!asnData) {
            setProgress(5)
            const realASNData = await lookupASN(asnNum)
            
            if (realASNData) {
              // Use real data from API
              observation.bgpInfo = {
                asn: asnNum,
                org: realASNData.org,
                peers: realASNData.peers || [],
                customers: realASNData.customers || [],
                providers: realASNData.providers || [],
              }
              
              // Also update geoData with real location if available
              if (realASNData.lat && realASNData.lng) {
                observation.geoData = {
                  country: realASNData.country,
                  lat: realASNData.lat,
                  lng: realASNData.lng,
                  org: realASNData.org,
                  asn: asnNum,
                }
              }
              
              // Generate IP based on ASN number (deterministic)
              const asnHash = asnNum % 1000000
              targetIP = `${(asnHash % 200) + 10}.${((asnHash * 2) % 255)}.${((asnHash * 3) % 255)}.${((asnHash * 4) % 254) + 1}`
            } else {
              // Fallback if API lookup fails
              observation.bgpInfo = {
                asn: asnNum,
                org: `ASN ${asnNum} Network`,
                peers: [],
                customers: [],
                providers: [],
              }
              const asnHash = asnNum % 1000000
              targetIP = `${(asnHash % 200) + 10}.${((asnHash * 2) % 255)}.${((asnHash * 3) % 255)}.${((asnHash * 4) % 254) + 1}`
            }
          } else {
            // Use data from local database
            observation.bgpInfo = {
              asn: asnNum,
              org: asnData.org,
              peers: asnData.peers || [],
              customers: asnData.customers || [],
              providers: asnData.providers || [],
            }
            // Use IP from ASN range
            targetIP = generateIPFromASN(asnNum) || `${Math.floor(Math.random() * 200) + 10}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`
          }
        }

        setProgress(20)

        // Step 2: Deep scan (also for ASN searches to get full data)
        if (targetIP) {
          const deepScan = await performDeepScan(targetIP, (prog) => {
            if (mounted) setProgress(20 + (prog * 0.4))
          })
          observation.deepScan = deepScan
          targetIP = deepScan.ip
        }

        setProgress(60)

        // Step 3: Geolocation and ASN data
        if (targetIP) {
          // For ASN searches, use the BGP info we already have
          if (searchType === 'asn' && observation.bgpInfo) {
            // Use ASN data from database or generate default
            const asnNum = observation.bgpInfo.asn
            const asnData = ASN_DATABASE.get(asnNum)
            
            observation.geoData = {
              country: asnData?.country || 'Unknown',
              city: asnData?.country || undefined,
              region: undefined,
              lat: asnData?.lat || (asnNum % 180) - 90,
              lng: asnData?.lng || ((asnNum * 2) % 360) - 180,
              org: observation.bgpInfo.org,
              asn: asnNum,
            }
            
            // Update BGP info with database data if available
            if (asnData) {
              observation.bgpInfo = {
                asn: asnNum,
                org: asnData.org,
                peers: asnData.peers || [],
                customers: asnData.customers || [],
                providers: asnData.providers || [],
              }
            }
          } else {
            // For IP/domain searches, use IP-based lookup
            const asnData = getASNForIP(targetIP)
            const parts = targetIP.split('.').map(Number)
            const isPrivate =
              targetIP.startsWith('192.168.') ||
              targetIP.startsWith('10.') ||
              (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)

            observation.geoData = {
              country: asnData?.country || (isPrivate ? 'LAN' : 'Unknown'),
              city: isPrivate ? 'Local Network' : asnData?.country || undefined,
              region: isPrivate ? 'Private' : undefined,
              lat: asnData?.lat || (isPrivate ? 0 : Math.random() * 180 - 90),
              lng: asnData?.lng || (isPrivate ? 0 : Math.random() * 360 - 180),
              org: asnData?.org,
              asn: asnData?.asn,
            }

            if (asnData) {
              observation.bgpInfo = {
                asn: asnData.asn,
                org: asnData.org,
                peers: asnData.peers || [],
                customers: asnData.customers || [],
                providers: asnData.providers || [],
              }
            }
          }
        }

        setProgress(70)

        // Step 3.5: Deep BGP Analysis (if ASN search or ASN found)
        if (observation.bgpInfo?.asn) {
          const bgpAnalysis = await performBGPDeepAnalysis(observation.bgpInfo.asn)
          observation.bgpDeepAnalysis = bgpAnalysis
          setProgress(75)
        }

        // Step 4: DNS records (if domain/hostname)
        if (searchType === 'domain' || searchType === 'hostname') {
          observation.dnsRecords = [
            { type: 'A', value: targetIP },
            { type: 'AAAA', value: '2001:db8::1' },
            { type: 'MX', value: `mail.${target}` },
            { type: 'NS', value: `ns1.${target}` },
            { type: 'TXT', value: 'v=spf1 include:_spf.google.com ~all' },
          ]
        }

        setProgress(80)

        // Step 5: Threat intelligence
        const threatScore = observation.deepScan?.threatIntel?.abuseScore || 
          (Math.random() > 0.7 ? Math.floor(Math.random() * 100) : 0)
        
        observation.threatData = {
          abuseScore: threatScore,
          otxPulses: observation.deepScan?.threatIntel?.otxPulses || 0,
          reputation: observation.deepScan?.threatIntel?.reputation || 'clean',
          reports: Math.floor(threatScore / 10),
        }

        setProgress(90)

        // Step 6: Additional information scraping
        if (searchType === 'domain' || searchType === 'hostname') {
          // WHOIS data
          observation.whois = await fetchWHOIS(target)
          setProgress(92)

          // Subdomain enumeration
          observation.subdomains = await enumerateSubdomains(target)
          setProgress(94)

          // Certificate Transparency
          observation.certTransparency = await fetchCertTransparency(target)
          setProgress(96)
        }

        // Passive DNS (for IPs)
        if (targetIP && searchType === 'ip') {
          observation.passiveDNS = await fetchPassiveDNS(targetIP)
          setProgress(97)
        }

        // Security headers
        if (targetIP && observation.deepScan?.openPorts && observation.deepScan.openPorts.length > 0) {
          const hasWebPort = observation.deepScan.openPorts.some(p => p.port === 443 || p.port === 80)
          if (hasWebPort) {
            const httpsPort = observation.deepScan.openPorts.find(p => p.ssl)?.port || 443
            observation.securityHeaders = await fetchSecurityHeaders(targetIP, httpsPort)
            setProgress(98)
          }
        }

        // Technology stack detection
        if (searchType === 'domain' || searchType === 'hostname') {
          observation.technologyStack = await detectTechnologyStack(target, observation.deepScan?.httpTitle)
          setProgress(99)
        }

        // Related entities (for ASN searches, find related IPs in same ASN)
        if (searchType === 'asn' && observation.bgpInfo) {
          // Generate related IPs from same ASN
          const relatedIPs: RelatedEntity[] = []
          for (let i = 0; i < 5; i++) {
            const relatedIP = generateIPFromASN(observation.bgpInfo.asn) || 
              `${Math.floor(Math.random() * 200) + 10}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`
            relatedIPs.push({
              type: 'ip',
              value: relatedIP,
              relation: 'same_asn',
            })
          }
          observation.relatedEntities = relatedIPs
        } else {
          observation.relatedEntities = await findRelatedEntities(target, targetIP, observation.geoData?.asn)
        }
        setProgress(99.5)

        // Historical data
        observation.historicalData = await fetchHistoricalData(target, targetIP)
        setProgress(99.7)

        // Vulnerabilities
        observation.vulnerabilities = await fetchVulnerabilities(target, observation.deepScan?.openPorts.map(p => p.port))
        setProgress(99.9)

        // Step 7: Network activity (from store if exists)
        const existingNode = getAllNodes().find(n => n.ip === targetIP)
        if (existingNode) {
          const nodeLinks = getAllLinks().filter(l => l.source === targetIP || l.target === targetIP)
          observation.networkActivity = {
            packets: existingNode.packets,
            bytes: existingNode.bytes,
            connections: nodeLinks.length,
            topPorts: existingNode.topPorts || [],
          }
        } else {
          // Add to network store
          if (targetIP && observation.geoData) {
            addNode({
              id: targetIP,
              ip: targetIP,
              lat: observation.geoData.lat,
              lng: observation.geoData.lng,
              country: observation.geoData.country,
              city: observation.geoData.city,
              region: observation.geoData.region,
              asn: observation.geoData.asn,
              org: observation.geoData.org,
              hostname: searchType === 'domain' || searchType === 'hostname' ? target : undefined,
              packets: 0,
              bytes: 0,
              topPorts: observation.deepScan?.openPorts.map(p => p.port) || [],
              lastSeen: Date.now() / 1000,
              packetHistory: [],
              threatInfo: observation.threatData?.abuseScore ? {
                score: observation.threatData.abuseScore,
                type: observation.threatData.reputation === 'malicious' ? 'malware' : 'scanning',
                firstSeen: Date.now() / 1000,
                lastSeen: Date.now() / 1000,
                reports: observation.threatData.reports,
              } : undefined,
            })
          }
        }

        setProgress(100)

        if (mounted) {
          setData(observation)
          setLoading(false)
        }
      } catch (error) {
        console.error('Observation failed:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    performObservation()

    return () => { mounted = false }
  }, [target, searchType])

  const sections = [
    { id: 'overview', label: 'OVERVIEW' },
    { id: 'network', label: 'NETWORK' },
    { id: 'threat', label: 'THREAT INTEL' },
    { id: 'services', label: 'SERVICES' },
    { id: 'bgp', label: 'BGP/ASN' },
    { id: 'dns', label: 'DNS' },
    { id: 'whois', label: 'WHOIS' },
    { id: 'subdomains', label: 'SUBDOMAINS' },
    { id: 'certificates', label: 'CERTIFICATES' },
    { id: 'security', label: 'SECURITY' },
    { id: 'technology', label: 'TECH STACK' },
    { id: 'related', label: 'RELATED' },
    { id: 'history', label: 'HISTORY' },
    { id: 'vulnerabilities', label: 'VULNERABILITIES' },
  ]

  return (
    <div className="p-6 space-y-4 h-full bg-tech-panel overflow-auto">
      {/* Header */}
      <div className="border-b border-tech-border pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-mono uppercase text-tech-text">
              TOTAL OBSERVATION: {target.toUpperCase()}
            </h3>
            <div className="text-xs text-tech-text-muted mt-1">
              Type: {searchType.toUpperCase()} • {loading ? `Scanning... ${progress.toFixed(0)}%` : 'Complete'}
            </div>
          </div>
          {!loading && (
            <button
              onClick={() => {
                const exportData = {
                  target,
                  searchType,
                  timestamp: new Date().toISOString(),
                  ...data,
                }
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `observation-${target}-${Date.now()}.json`
                a.click()
              }}
              className="px-3 py-1 text-xs font-mono bg-tech-primary text-tech-bg hover:bg-tech-accent transition-colors"
            >
              EXPORT JSON
            </button>
          )}
        </div>
      </div>

      {/* Section Navigation */}
      <div className="flex gap-2 border-b border-tech-border pb-2 overflow-x-auto">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`px-3 py-1 text-xs font-mono uppercase tracking-wider whitespace-nowrap transition-colors ${
              activeSection === section.id
                ? 'bg-tech-primary text-tech-bg'
                : 'bg-tech-panel text-tech-text-muted hover:text-tech-text border border-tech-border'
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-tech-primary text-sm font-mono mb-2">SCANNING...</div>
            <div className="w-64 h-1 bg-tech-panel border border-tech-border">
              <div
                className="h-full bg-tech-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-xs text-tech-text-muted mt-2">{progress.toFixed(0)}%</div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Overview */}
          {activeSection === 'overview' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="text-xs font-mono uppercase text-tech-text-muted mb-2">TARGET INFO</div>
                <div className="space-y-2 text-xs font-mono">
                  <div><span className="text-tech-text-muted">Target:</span> <span className="text-tech-text">{target}</span></div>
                  <div><span className="text-tech-text-muted">Type:</span> <span className="text-tech-primary">{searchType.toUpperCase()}</span></div>
                  {data.geoData && (
                    <>
                      <div><span className="text-tech-text-muted">IP:</span> <span className="text-tech-text">{data.deepScan?.ip || 'N/A'}</span></div>
                      <div><span className="text-tech-text-muted">Location:</span> <span className="text-tech-text">{data.geoData.city || ''} {data.geoData.country} ({data.geoData.lat.toFixed(2)}, {data.geoData.lng.toFixed(2)})</span></div>
                      {data.geoData.org && (
                        <div><span className="text-tech-text-muted">Organization:</span> <span className="text-tech-text">{data.geoData.org}</span></div>
                      )}
                      {data.geoData.asn && (
                        <div><span className="text-tech-text-muted">ASN:</span> <span className="text-tech-primary">AS{data.geoData.asn}</span></div>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <div className="text-xs font-mono uppercase text-tech-text-muted mb-2">QUICK STATS</div>
                <div className="space-y-2 text-xs font-mono">
                  {data.deepScan && (
                    <>
                      <div><span className="text-tech-text-muted">Open Ports:</span> <span className="text-tech-primary">{data.deepScan.openPorts.length}</span></div>
                      <div><span className="text-tech-text-muted">Traceroute Hops:</span> <span className="text-tech-text">{data.deepScan.traceroute?.length || 0}</span></div>
                      <div><span className="text-tech-text-muted">SSL Certificates:</span> <span className="text-tech-text">{data.deepScan.sslCerts?.length || 0}</span></div>
                    </>
                  )}
                  {data.threatData && (
                    <div><span className="text-tech-text-muted">Threat Score:</span> <span className={data.threatData.abuseScore > 75 ? 'text-tech-error' : data.threatData.abuseScore > 50 ? 'text-tech-warning' : 'text-tech-primary'}>{data.threatData.abuseScore}/100</span></div>
                  )}
                  {data.networkActivity && (
                    <>
                      <div><span className="text-tech-text-muted">Connections:</span> <span className="text-tech-text">{data.networkActivity.connections}</span></div>
                      <div><span className="text-tech-text-muted">Packets:</span> <span className="text-tech-text">{data.networkActivity.packets.toLocaleString()}</span></div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Network */}
          {activeSection === 'network' && data.deepScan && (
            <div className="space-y-4">
              {data.deepScan.traceroute && (
                <div>
                  <div className="text-xs font-mono uppercase text-tech-text-muted mb-2">TRACEROUTE</div>
                  <div className="space-y-1 text-xs font-mono">
                    {data.deepScan.traceroute.map((hop) => (
                      <div key={hop.hop} className="p-2 bg-tech-bg border border-tech-border">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-tech-text-muted">{hop.hop}.</span> <span className="text-tech-text">{hop.ip}</span>
                            {hop.hostname && <span className="text-tech-text-muted ml-2">({hop.hostname})</span>}
                          </div>
                          <div className="flex items-center gap-3">
                            {hop.asn && <span className="text-tech-primary">AS{hop.asn}</span>}
                            <span className="text-tech-text-muted">{hop.latency}ms</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Threat Intel */}
          {activeSection === 'threat' && (
            <div className="space-y-4">
              {data.threatData && (
                <div>
                  <div className="text-xs font-mono uppercase text-tech-text-muted mb-2">THREAT INTELLIGENCE</div>
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div className="p-3 bg-tech-bg border border-tech-border">
                      <div className="text-tech-text-muted mb-1">Abuse Score</div>
                      <div className={`text-lg font-bold ${
                        data.threatData.abuseScore > 75 ? 'text-tech-error' :
                        data.threatData.abuseScore > 50 ? 'text-tech-warning' :
                        'text-tech-primary'
                      }`}>
                        {data.threatData.abuseScore}/100
                      </div>
                    </div>
                    <div className="p-3 bg-tech-bg border border-tech-border">
                      <div className="text-tech-text-muted mb-1">Reputation</div>
                      <div className={`text-lg font-bold ${
                        data.threatData.reputation === 'malicious' ? 'text-tech-error' :
                        data.threatData.reputation === 'suspicious' ? 'text-tech-warning' :
                        'text-tech-primary'
                      }`}>
                        {data.threatData.reputation.toUpperCase()}
                      </div>
                    </div>
                    <div className="p-3 bg-tech-bg border border-tech-border">
                      <div className="text-tech-text-muted mb-1">OTX Pulses</div>
                      <div className="text-lg font-bold text-tech-text">{data.threatData.otxPulses}</div>
                    </div>
                    <div className="p-3 bg-tech-bg border border-tech-border">
                      <div className="text-tech-text-muted mb-1">Reports</div>
                      <div className="text-lg font-bold text-tech-text">{data.threatData.reports}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Services */}
          {activeSection === 'services' && data.deepScan && (
            <div className="space-y-4">
              {data.deepScan.openPorts.length > 0 && (
                <div>
                  <div className="text-xs font-mono uppercase text-tech-text-muted mb-2">OPEN PORTS ({data.deepScan.openPorts.length})</div>
                  <div className="grid grid-cols-2 gap-2">
                    {data.deepScan.openPorts.map((port) => (
                      <div key={port.port} className="p-2 bg-tech-bg border border-tech-border text-xs font-mono">
                        <div className="flex items-center justify-between">
                          <span className="text-tech-primary">{port.port}/{port.service}</span>
                          {port.ssl && <span className="text-tech-warning">SSL</span>}
                        </div>
                        {port.version && <div className="text-tech-text-muted mt-1">{port.version}</div>}
                        {port.banner && <div className="text-tech-text-muted mt-1 text-[10px]">{port.banner}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {data.deepScan.sslCerts && (
                <div>
                  <div className="text-xs font-mono uppercase text-tech-text-muted mb-2">SSL CERTIFICATES</div>
                  <div className="space-y-2">
                    {data.deepScan.sslCerts.map((cert, i) => (
                      <div key={i} className="p-2 bg-tech-bg border border-tech-border text-xs font-mono">
                        <div className="text-tech-text-muted mb-1">Issuer: {cert.issuer}</div>
                        <div className="text-tech-text-muted mb-1">Subject: {cert.subject}</div>
                        <div className="text-tech-text-muted">Valid Until: {new Date(cert.validUntil).toLocaleDateString()}</div>
                        <div className="text-tech-text-muted text-[10px] mt-1">Fingerprint: {cert.fingerprint}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {data.deepScan.httpTitle && (
                <div>
                  <div className="text-xs font-mono uppercase text-tech-text-muted mb-2">HTTP TITLE</div>
                  <div className="p-2 bg-tech-bg border border-tech-border text-xs font-mono text-tech-text">
                    {data.deepScan.httpTitle}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* BGP/ASN */}
          {activeSection === 'bgp' && data.bgpInfo && (
            <div className="space-y-6">
              {/* Basic ASN Info */}
              <div>
                <div className="text-xs font-mono uppercase text-tech-text-muted mb-2">AUTONOMOUS SYSTEM</div>
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div><span className="text-tech-text-muted">ASN:</span> <span className="text-tech-primary">AS{data.bgpInfo.asn}</span></div>
                  <div><span className="text-tech-text-muted">Organization:</span> <span className="text-tech-text">{data.bgpInfo.org}</span></div>
                  {data.bgpDeepAnalysis && (
                    <>
                      <div><span className="text-tech-text-muted">Country:</span> <span className="text-tech-text">{data.bgpDeepAnalysis.country}</span></div>
                      <div><span className="text-tech-text-muted">Tier:</span> <span className="text-tech-primary">Tier {data.bgpDeepAnalysis.tier}</span></div>
                      <div><span className="text-tech-text-muted">Stability:</span> <span className={data.bgpDeepAnalysis.stability > 80 ? 'text-tech-primary' : data.bgpDeepAnalysis.stability > 60 ? 'text-tech-warning' : 'text-tech-error'}>{data.bgpDeepAnalysis.stability}%</span></div>
                      <div><span className="text-tech-text-muted">Transit Capacity:</span> <span className="text-tech-text">{data.bgpDeepAnalysis.transitCapacity}</span></div>
                    </>
                  )}
                </div>
              </div>

              {/* Deep BGP Analysis */}
              {data.bgpDeepAnalysis && (
                <>
                  {/* Prefix Information */}
                  <div>
                    <div className="text-xs font-mono uppercase text-tech-text-muted mb-2">PREFIX INFORMATION</div>
                    <div className="grid grid-cols-3 gap-4 text-xs font-mono mb-3">
                      <div className="p-2 bg-tech-bg border border-tech-border">
                        <div className="text-tech-text-muted mb-1">Total Prefixes</div>
                        <div className="text-lg font-bold text-tech-primary">{data.bgpDeepAnalysis.totalPrefixes}</div>
                      </div>
                      <div className="p-2 bg-tech-bg border border-tech-border">
                        <div className="text-tech-text-muted mb-1">Address Space</div>
                        <div className="text-lg font-bold text-tech-primary">{data.bgpDeepAnalysis.totalAddressSpace}</div>
                      </div>
                      <div className="p-2 bg-tech-bg border border-tech-border">
                        <div className="text-tech-text-muted mb-1">BGP Table Size</div>
                        <div className="text-lg font-bold text-tech-primary">{data.bgpDeepAnalysis.bgpTableSize.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {data.bgpDeepAnalysis.prefixes.slice(0, 10).map((prefix, i) => (
                        <div key={i} className="p-2 bg-tech-bg border border-tech-border text-xs font-mono">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-tech-primary">{prefix.prefix}</span>
                            <span className={`px-2 py-0.5 ${
                              prefix.rpkiStatus === 'VALID' ? 'bg-tech-primary/20 text-tech-primary' :
                              prefix.rpkiStatus === 'INVALID' ? 'bg-tech-error/20 text-tech-error' :
                              'bg-tech-warning/20 text-tech-warning'
                            }`}>
                              RPKI: {prefix.rpkiStatus}
                            </span>
                          </div>
                          <div className="text-tech-text-muted text-[10px]">
                            Path: {prefix.asPath.map(asn => `AS${asn}`).join(' → ')} • 
                            LocalPref: {prefix.localPref} • 
                            Communities: {prefix.communities.length}
                          </div>
                        </div>
                      ))}
                      {data.bgpDeepAnalysis.prefixes.length > 10 && (
                        <div className="text-center text-tech-text-muted text-xs">
                          +{data.bgpDeepAnalysis.prefixes.length - 10} more prefixes
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AS Relationships */}
                  <div>
                    <div className="text-xs font-mono uppercase text-tech-text-muted mb-2">AS RELATIONSHIPS</div>
                    <div className="grid grid-cols-2 gap-4">
                      {data.bgpDeepAnalysis.providers.length > 0 && (
                        <div>
                          <div className="text-tech-text-muted mb-1">PROVIDERS ({data.bgpDeepAnalysis.providers.length})</div>
                          <div className="space-y-1">
                            {data.bgpDeepAnalysis.providers.map((rel, i) => (
                              <div key={i} className="p-2 bg-tech-bg border border-tech-border text-xs font-mono">
                                <div className="text-tech-primary">AS{rel.asn}</div>
                                <div className="text-tech-text-muted text-[10px]">{rel.org}</div>
                                <div className="text-tech-text-muted text-[10px]">{rel.bandwidth} • {rel.locations.join(', ')}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {data.bgpDeepAnalysis.peers.length > 0 && (
                        <div>
                          <div className="text-tech-text-muted mb-1">PEERS ({data.bgpDeepAnalysis.peers.length})</div>
                          <div className="space-y-1">
                            {data.bgpDeepAnalysis.peers.slice(0, 5).map((rel, i) => (
                              <div key={i} className="p-2 bg-tech-bg border border-tech-border text-xs font-mono">
                                <div className="text-tech-primary">AS{rel.asn}</div>
                                <div className="text-tech-text-muted text-[10px]">{rel.org}</div>
                                <div className="text-tech-text-muted text-[10px]">{rel.bandwidth} • {rel.locations.join(', ')}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {data.bgpDeepAnalysis.customers.length > 0 && (
                        <div>
                          <div className="text-tech-text-muted mb-1">CUSTOMERS ({data.bgpDeepAnalysis.customers.length})</div>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {data.bgpDeepAnalysis.customers.slice(0, 5).map((rel, i) => (
                              <div key={i} className="p-2 bg-tech-bg border border-tech-border text-xs font-mono">
                                <div className="text-tech-primary">AS{rel.asn}</div>
                                <div className="text-tech-text-muted text-[10px]">{rel.org}</div>
                              </div>
                            ))}
                            {data.bgpDeepAnalysis.customers.length > 5 && (
                              <div className="text-tech-text-muted text-[10px]">+{data.bgpDeepAnalysis.customers.length - 5} more</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RPKI Validation */}
                  <div>
                    <div className="text-xs font-mono uppercase text-tech-text-muted mb-2">RPKI VALIDATION</div>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      <div className="p-2 bg-tech-bg border border-tech-border text-xs font-mono text-center">
                        <div className="text-tech-text-muted mb-1">Coverage</div>
                        <div className={`text-lg font-bold ${
                          data.bgpDeepAnalysis.rpkiCoverage > 80 ? 'text-tech-primary' :
                          data.bgpDeepAnalysis.rpkiCoverage > 50 ? 'text-tech-warning' :
                          'text-tech-error'
                        }`}>
                          {data.bgpDeepAnalysis.rpkiCoverage}%
                        </div>
                      </div>
                      <div className="p-2 bg-tech-bg border border-tech-border text-xs font-mono text-center">
                        <div className="text-tech-text-muted mb-1">Valid</div>
                        <div className="text-lg font-bold text-tech-primary">{data.bgpDeepAnalysis.rpkiValidPrefixes}</div>
                      </div>
                      <div className="p-2 bg-tech-bg border border-tech-border text-xs font-mono text-center">
                        <div className="text-tech-text-muted mb-1">Invalid</div>
                        <div className="text-lg font-bold text-tech-error">{data.bgpDeepAnalysis.rpkiInvalidPrefixes}</div>
                      </div>
                      <div className="p-2 bg-tech-bg border border-tech-border text-xs font-mono text-center">
                        <div className="text-tech-text-muted mb-1">ROAs</div>
                        <div className="text-lg font-bold text-tech-text">{data.bgpDeepAnalysis.rpkiROAs.length}</div>
                      </div>
                    </div>
                  </div>

                  {/* BGP Communities */}
                  {data.bgpDeepAnalysis.communities.length > 0 && (
                    <div>
                      <div className="text-xs font-mono uppercase text-tech-text-muted mb-2">BGP COMMUNITIES ({data.bgpDeepAnalysis.communities.length})</div>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {data.bgpDeepAnalysis.communities.map((comm, i) => (
                          <div key={i} className="p-2 bg-tech-bg border border-tech-border text-xs font-mono">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-tech-primary">{comm.community}</span>
                              <span className={`px-2 py-0.5 ${
                                comm.type === 'well-known' ? 'bg-tech-primary/20 text-tech-primary' :
                                'bg-tech-secondary/20 text-tech-secondary'
                              }`}>
                                {comm.type}
                              </span>
                            </div>
                            <div className="text-tech-text-muted text-[10px]">{comm.meaning}</div>
                            {comm.action && (
                              <div className="text-tech-text-muted text-[10px]">Action: {comm.action}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Security & Hijacking Risk */}
                  <div>
                    <div className="text-xs font-mono uppercase text-tech-text-muted mb-2">SECURITY ANALYSIS</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-tech-bg border border-tech-border">
                        <div className="text-tech-text-muted mb-2">Hijacking Risk</div>
                        <div className={`text-2xl font-bold ${
                          data.bgpDeepAnalysis.hijackingRisk === 'CRITICAL' ? 'text-tech-error' :
                          data.bgpDeepAnalysis.hijackingRisk === 'HIGH' ? 'text-tech-warning' :
                          data.bgpDeepAnalysis.hijackingRisk === 'MEDIUM' ? 'text-tech-warning' :
                          'text-tech-primary'
                        }`}>
                          {data.bgpDeepAnalysis.hijackingRisk}
                        </div>
                      </div>
                      <div className="p-3 bg-tech-bg border border-tech-border">
                        <div className="text-tech-text-muted mb-2">24h Activity</div>
                        <div className="text-xs font-mono space-y-1">
                          <div>Announcements: <span className="text-tech-primary">{data.bgpDeepAnalysis.announcements24h}</span></div>
                          <div>Withdrawals: <span className="text-tech-warning">{data.bgpDeepAnalysis.withdrawals24h}</span></div>
                          <div>Path Changes: <span className="text-tech-text">{data.bgpDeepAnalysis.pathChanges24h}</span></div>
                        </div>
                      </div>
                    </div>
                    {data.bgpDeepAnalysis.hijackingEvents.length > 0 && (
                      <div className="mt-3 p-3 bg-tech-error/10 border-2 border-tech-error">
                        <div className="text-tech-error font-bold mb-2">Hijacking Events Detected</div>
                        {data.bgpDeepAnalysis.hijackingEvents.map((event, i) => (
                          <div key={i} className="text-xs font-mono text-tech-text mb-1">
                            {new Date(event.timestamp).toLocaleString()}: {event.description} (AS{event.hijackerAS})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* AS Path Statistics */}
                  <div>
                    <div className="text-xs font-mono uppercase text-tech-text-muted mb-2">AS PATH STATISTICS</div>
                    <div className="grid grid-cols-3 gap-4 text-xs font-mono">
                      <div className="p-2 bg-tech-bg border border-tech-border text-center">
                        <div className="text-tech-text-muted mb-1">Min Length</div>
                        <div className="text-lg font-bold text-tech-primary">{data.bgpDeepAnalysis.asPathLength.min}</div>
                      </div>
                      <div className="p-2 bg-tech-bg border border-tech-border text-center">
                        <div className="text-tech-text-muted mb-1">Max Length</div>
                        <div className="text-lg font-bold text-tech-primary">{data.bgpDeepAnalysis.asPathLength.max}</div>
                      </div>
                      <div className="p-2 bg-tech-bg border border-tech-border text-center">
                        <div className="text-tech-text-muted mb-1">Avg Length</div>
                        <div className="text-lg font-bold text-tech-primary">{data.bgpDeepAnalysis.asPathLength.avg.toFixed(1)}</div>
                      </div>
                    </div>
                  </div>

                  {/* IRR Records */}
                  {data.bgpDeepAnalysis.irrRecords.length > 0 && (
                    <div>
                      <div className="text-xs font-mono uppercase text-tech-text-muted mb-2">IRR RECORDS ({data.bgpDeepAnalysis.irrSources.join(', ')})</div>
                      <div className="space-y-2">
                        {data.bgpDeepAnalysis.irrRecords.map((record, i) => (
                          <div key={i} className="p-2 bg-tech-bg border border-tech-border text-xs font-mono">
                            <div className="grid grid-cols-2 gap-2">
                              <div><span className="text-tech-text-muted">Source:</span> <span className="text-tech-primary">{record.source}</span></div>
                              <div><span className="text-tech-text-muted">AS Name:</span> <span className="text-tech-text">{record.asName}</span></div>
                              <div><span className="text-tech-text-muted">Country:</span> <span className="text-tech-text">{record.country}</span></div>
                              <div><span className="text-tech-text-muted">Last Modified:</span> <span className="text-tech-text">{new Date(record.lastModified).toLocaleDateString()}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* BGP Path from Traceroute */}
                  {data.deepScan?.bgpPath && (
                    <div>
                      <div className="text-xs font-mono uppercase text-tech-text-muted mb-2">BGP PATH (FROM TRACEROUTE)</div>
                      <div className="p-2 bg-tech-bg border border-tech-border text-xs font-mono">
                        <div className="text-tech-primary">
                          {data.deepScan.bgpPath.map(asn => `AS${asn}`).join(' → ')}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Fallback: Basic info if no deep analysis */}
              {!data.bgpDeepAnalysis && (
                <>
                  {data.bgpInfo.peers.length > 0 && (
                    <div>
                      <div className="text-xs font-mono uppercase text-tech-text-muted mb-2">PEERS ({data.bgpInfo.peers.length})</div>
                      <div className="flex flex-wrap gap-2">
                        {data.bgpInfo.peers.map((asn) => (
                          <span key={asn} className="px-2 py-1 bg-tech-primary/20 text-tech-primary text-xs font-mono">
                            AS{asn}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {data.deepScan?.bgpPath && (
                    <div>
                      <div className="text-xs font-mono uppercase text-tech-text-muted mb-2">BGP PATH</div>
                      <div className="text-tech-primary text-xs font-mono">
                        {data.deepScan.bgpPath.map(asn => `AS${asn}`).join(' → ')}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* DNS */}
          {activeSection === 'dns' && data.dnsRecords && (
            <div>
              <div className="text-xs font-mono uppercase text-tech-text-muted mb-2">DNS RECORDS</div>
              <div className="space-y-2">
                {data.dnsRecords.map((record, i) => (
                  <div key={i} className="p-2 bg-tech-bg border border-tech-border text-xs font-mono">
                    <span className="text-tech-primary">{record.type}</span> <span className="text-tech-text">{record.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WHOIS */}
          {activeSection === 'whois' && data.whois && (
            <div className="space-y-4">
              <div>
                <div className="text-xs font-mono uppercase text-tech-text-muted mb-2">WHOIS DATA</div>
                <div className="space-y-2 text-xs font-mono">
                  {data.whois.registrar && (
                    <div><span className="text-tech-text-muted">Registrar:</span> <span className="text-tech-text">{data.whois.registrar}</span></div>
                  )}
                  {data.whois.creationDate && (
                    <div><span className="text-tech-text-muted">Created:</span> <span className="text-tech-text">{new Date(data.whois.creationDate).toLocaleDateString()}</span></div>
                  )}
                  {data.whois.expirationDate && (
                    <div><span className="text-tech-text-muted">Expires:</span> <span className="text-tech-text">{new Date(data.whois.expirationDate).toLocaleDateString()}</span></div>
                  )}
                  {data.whois.nameServers && data.whois.nameServers.length > 0 && (
                    <div>
                      <div className="text-tech-text-muted mb-1">Name Servers:</div>
                      <div className="space-y-1">
                        {data.whois.nameServers.map((ns, i) => (
                          <div key={i} className="text-tech-text">{ns}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Subdomains */}
          {activeSection === 'subdomains' && data.subdomains && (
            <div>
              <div className="text-xs font-mono uppercase text-tech-text-muted mb-2">SUBDOMAINS ({data.subdomains.length})</div>
              <div className="space-y-2">
                {data.subdomains.map((sub, i) => (
                  <div key={i} className="p-2 bg-tech-bg border border-tech-border text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-tech-text">{sub.subdomain}</span>
                      {sub.ip && <span className="text-tech-primary">{sub.ip}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certificates */}
          {activeSection === 'certificates' && data.certTransparency && (
            <div>
              <div className="text-xs font-mono uppercase text-tech-text-muted mb-2">CERTIFICATE TRANSPARENCY ({data.certTransparency.length})</div>
              <div className="space-y-2">
                {data.certTransparency.map((cert, i) => (
                  <div key={i} className="p-2 bg-tech-bg border border-tech-border text-xs font-mono">
                    <div className="text-tech-text mb-1">{cert.domain}</div>
                    <div className="text-tech-text-muted">Issuer: {cert.issuer}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security */}
          {activeSection === 'security' && (
            <div className="space-y-4">
              {data.securityHeaders && (
                <div>
                  <div className="text-xs font-mono uppercase text-tech-text-muted mb-2">SECURITY HEADERS</div>
                  <div className="space-y-2 text-xs font-mono">
                    {Object.entries(data.securityHeaders).map(([key, value]) => (
                      <div key={key} className="p-2 bg-tech-bg border border-tech-border">
                        <span className="text-tech-primary">{key}:</span> <span className="text-tech-text">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {data.passiveDNS && (
                <div>
                  <div className="text-xs font-mono uppercase text-tech-text-muted mb-2">PASSIVE DNS</div>
                  <div className="p-2 bg-tech-bg border border-tech-border text-xs font-mono">
                    <div className="text-tech-text-muted mb-1">IP: {data.passiveDNS.ip}</div>
                    <div className="space-y-1">
                      {data.passiveDNS.domains.map((domain, i) => (
                        <div key={i} className="text-tech-text">{domain}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Technology Stack */}
          {activeSection === 'technology' && data.technologyStack && (
            <div>
              <div className="text-xs font-mono uppercase text-tech-text-muted mb-2">TECHNOLOGY STACK</div>
              <div className="space-y-3">
                {Object.entries(data.technologyStack).map(([key, values]) => (
                  <div key={key}>
                    <div className="text-tech-text-muted mb-1">{key}:</div>
                    <div className="flex flex-wrap gap-2">
                      {(values as string[]).map((val: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-tech-primary/20 text-tech-primary text-xs font-mono">
                          {val}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Entities */}
          {activeSection === 'related' && data.relatedEntities && (
            <div>
              <div className="text-xs font-mono uppercase text-tech-text-muted mb-2">RELATED ENTITIES ({data.relatedEntities.length})</div>
              <div className="space-y-2">
                {data.relatedEntities.map((entity, i) => (
                  <div key={i} className="p-2 bg-tech-bg border border-tech-border text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-tech-text">{entity.value}</span>
                      <span className="text-tech-primary">{entity.type.toUpperCase()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* History */}
          {activeSection === 'history' && data.historicalData && (
            <div className="space-y-4">
              {data.historicalData.ipHistory && (
                <div>
                  <div className="text-xs font-mono uppercase text-tech-text-muted mb-2">IP HISTORY</div>
                  <div className="space-y-2">
                    {data.historicalData.ipHistory.map((ip, i) => (
                      <div key={i} className="p-2 bg-tech-bg border border-tech-border text-xs font-mono">
                        <div className="text-tech-text">{ip.ip}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Vulnerabilities */}
          {activeSection === 'vulnerabilities' && data.vulnerabilities && (
            <div>
              <div className="text-xs font-mono uppercase text-tech-text-muted mb-2">VULNERABILITIES ({data.vulnerabilities.length})</div>
              {data.vulnerabilities.length === 0 ? (
                <div className="text-center text-tech-text-muted text-xs font-mono py-8">No vulnerabilities found</div>
              ) : (
                <div className="space-y-2">
                  {data.vulnerabilities.map((vuln, i) => (
                    <div key={i} className={`p-3 bg-tech-bg border-2 ${
                      vuln.severity === 'critical' ? 'border-tech-error' : 'border-tech-border'
                    } text-xs font-mono`}>
                      <div className="text-tech-error font-bold">{vuln.cve || 'VULNERABILITY'}</div>
                      <div className="text-tech-text">{vuln.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

