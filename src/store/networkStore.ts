import { create } from 'zustand'

export interface ThreatInfo {
  score: number
  type: 'malware' | 'spam' | 'abuse' | 'phishing' | 'botnet' | 'scanning' | 'ddos' | 'ransomware'
  firstSeen: number
  lastSeen: number
  reports: number
  description?: string
  bgpPath?: number[] // AS path
  attackVectors?: string[] // Ports, protocols used
}

export interface NetworkNode {
  id: string // IP address or ASN:XXXX for AS nodes
  ip: string
  lat: number
  lng: number
  country: string
  city?: string
  region?: string
  asn?: number
  org?: string
  hostname?: string
  packets: number
  bytes: number
  topPorts: number[]
  threatInfo?: ThreatInfo
  lastSeen: number
  packetHistory: Array<{ time: number; count: number }>
  x?: number
  y?: number
  z?: number
  // AS-level aggregation
  isASNode?: boolean // True if this is an AS-level aggregate node
  ipCount?: number // Number of IPs in this AS
  bgpPeers?: number[] // ASN peers
  bgpCustomers?: number[] // ASN customers
  bgpProviders?: number[] // ASN providers
  // Device fingerprinting
  deviceType?: string // server, router, workstation, etc.
  os?: string // Operating system
  services?: string[] // Detected services
  isPrivate?: boolean // Private IP (RFC 1918)
}

export interface NetworkLink {
  id: string
  source: string // IP or ASN:XXXX
  target: string // IP or ASN:XXXX
  srcPort?: number
  dstPort?: number
  protocol: string // tcp, udp, icmp, bgp, dns
  bytes: number
  packets: number
  lastSeen: number
  // Deep metadata
  bgpPath?: number[] // AS path for BGP links
  rtt?: number // Round-trip time in ms
  jitter?: number // Jitter in ms
  packetLoss?: number // Packet loss percentage
  flowDirection?: 'inbound' | 'outbound' | 'bidirectional'
  threatScore?: number // Link threat score
}

interface NetworkStore {
  nodes: Map<string, NetworkNode>
  links: Map<string, NetworkLink>
  asNodes: Map<string, NetworkNode> // AS-level nodes (ASN:XXXX)
  selectedNode: string | null
  threatNodes: Set<string>
  viewMode: 'ip' | 'as' // View mode: IP-level or AS-level
  
  addNode: (node: NetworkNode) => void
  updateNode: (id: string, updates: Partial<NetworkNode>) => void
  addLink: (link: NetworkLink) => void
  updateLink: (id: string, updates: Partial<NetworkLink>) => void
  setSelectedNode: (id: string | null) => void
  markThreat: (id: string, threatInfo: ThreatInfo) => void
  getThreatNodes: () => NetworkNode[]
  getNode: (id: string) => NetworkNode | undefined
  getAllNodes: () => NetworkNode[]
  getAllLinks: () => NetworkLink[]
  getNodeLinks: (nodeId: string) => NetworkLink[]
  getASNodes: () => NetworkNode[] // Get all AS-level nodes
  setViewMode: (mode: 'ip' | 'as') => void
  aggregateByASN: () => void // Aggregate IP nodes into AS nodes
}

export const useNetworkStore = create<NetworkStore>((set, get) => ({
  nodes: new Map(),
  links: new Map(),
  asNodes: new Map(),
  selectedNode: null,
  threatNodes: new Set(),
  viewMode: 'ip',
  
  addNode: (node) => {
    set((state) => {
      const newNodes = new Map(state.nodes)
      const nodeWithHistory = {
        ...node,
        packetHistory: node.packetHistory || [],
      }
      newNodes.set(node.id, nodeWithHistory)
      
      // If AS node, also add to asNodes
      if (node.isASNode) {
        const newASNodes = new Map(state.asNodes)
        newASNodes.set(node.id, nodeWithHistory)
        return { nodes: newNodes, asNodes: newASNodes }
      }
      
      return { nodes: newNodes }
    })
  },
  
  updateNode: (id, updates) => {
    set((state) => {
      const newNodes = new Map(state.nodes)
      const existing = newNodes.get(id)
      if (existing) {
        newNodes.set(id, { ...existing, ...updates })
      }
      
      // Also update AS node if exists
      if (state.asNodes.has(id)) {
        const newASNodes = new Map(state.asNodes)
        const asExisting = newASNodes.get(id)
        if (asExisting) {
          newASNodes.set(id, { ...asExisting, ...updates })
        }
        return { nodes: newNodes, asNodes: newASNodes }
      }
      
      return { nodes: newNodes }
    })
  },
  
  addLink: (link) => {
    set((state) => {
      const newLinks = new Map(state.links)
      newLinks.set(link.id, link)
      return { links: newLinks }
    })
  },
  
  updateLink: (id, updates) => {
    set((state) => {
      const newLinks = new Map(state.links)
      const existing = newLinks.get(id)
      if (existing) {
        newLinks.set(id, { ...existing, ...updates })
      }
      return { links: newLinks }
    })
  },
  
  setSelectedNode: (id) => set({ selectedNode: id }),
  
  markThreat: (id, threatInfo) => {
    set((state) => {
      const newNodes = new Map(state.nodes)
      const existing = newNodes.get(id)
      if (existing) {
        newNodes.set(id, { ...existing, threatInfo })
      }
      const newThreats = new Set(state.threatNodes)
      newThreats.add(id)
      return { nodes: newNodes, threatNodes: newThreats }
    })
  },
  
  getThreatNodes: () => {
    return Array.from(get().nodes.values()).filter((n) => n.threatInfo)
  },
  
  getNode: (id) => get().nodes.get(id),
  
  getAllNodes: () => {
    const state = get()
    return state.viewMode === 'as' 
      ? Array.from(state.asNodes.values())
      : Array.from(state.nodes.values())
  },
  
  getAllLinks: () => Array.from(get().links.values()),
  
  getNodeLinks: (nodeId) => {
    const links = get().getAllLinks()
    return links.filter((l) => l.source === nodeId || l.target === nodeId)
  },
  
  getASNodes: () => Array.from(get().asNodes.values()),
  
  setViewMode: (mode) => set({ viewMode: mode }),
  
  aggregateByASN: () => {
    const state = get()
    const asAggregates = new Map<string, {
      asn: number
      org: string
      country: string
      lat: number
      lng: number
      packets: number
      bytes: number
      ipCount: number
      topPorts: number[]
      threatInfo?: ThreatInfo
      bgpPeers: number[]
      bgpCustomers: number[]
      bgpProviders: number[]
    }>()
    
    // Aggregate IP nodes by ASN
    state.nodes.forEach((node) => {
      if (node.isASNode || !node.asn) return // Skip AS nodes and nodes without ASN
      
      const asnKey = `ASN:${node.asn}`
      const existing = asAggregates.get(asnKey)
      
      if (existing) {
        existing.packets += node.packets
        existing.bytes += node.bytes
        existing.ipCount += 1
        // Merge top ports
        node.topPorts.forEach(port => {
          if (!existing.topPorts.includes(port)) {
            existing.topPorts.push(port)
          }
        })
        existing.topPorts.sort((a, b) => b - a).splice(10) // Keep top 10
        // Update threat if higher
        if (node.threatInfo && (!existing.threatInfo || node.threatInfo.score > existing.threatInfo.score)) {
          existing.threatInfo = node.threatInfo
        }
      } else {
        asAggregates.set(asnKey, {
          asn: node.asn,
          org: node.org || `ASN ${node.asn}`,
          country: node.country,
          lat: node.lat,
          lng: node.lng,
          packets: node.packets,
          bytes: node.bytes,
          ipCount: 1,
          topPorts: [...node.topPorts],
          threatInfo: node.threatInfo,
          bgpPeers: [],
          bgpCustomers: [],
          bgpProviders: [],
        })
      }
    })
    
    // Create AS nodes
    const newASNodes = new Map<string, NetworkNode>()
    asAggregates.forEach((agg, asnKey) => {
      newASNodes.set(asnKey, {
        id: asnKey,
        ip: asnKey,
        lat: agg.lat,
        lng: agg.lng,
        country: agg.country,
        asn: agg.asn,
        org: agg.org,
        packets: agg.packets,
        bytes: agg.bytes,
        topPorts: agg.topPorts,
        threatInfo: agg.threatInfo,
        lastSeen: Date.now() / 1000,
        packetHistory: [],
        isASNode: true,
        ipCount: agg.ipCount,
        bgpPeers: agg.bgpPeers,
        bgpCustomers: agg.bgpCustomers,
        bgpProviders: agg.bgpProviders,
      })
    })
    
    set({ asNodes: newASNodes })
  },
}))
