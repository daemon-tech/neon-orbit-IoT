import { create } from 'zustand'

export interface ThreatInfo {
  score: number
  type: 'malware' | 'spam' | 'abuse' | 'phishing' | 'botnet' | 'scanning'
  firstSeen: number
  lastSeen: number
  reports: number
  description?: string
}

export interface NetworkNode {
  id: string // IP address
  ip: string
  lat: number
  lng: number
  country: string
  asn?: number
  org?: string
  packets: number
  bytes: number
  topPorts: number[]
  threatInfo?: ThreatInfo
  lastSeen: number
  packetHistory: Array<{ time: number; count: number }>
  x?: number
  y?: number
  z?: number
}

export interface NetworkLink {
  id: string
  source: string // IP
  target: string // IP
  srcPort?: number
  dstPort?: number
  protocol: string // tcp, udp, icmp
  bytes: number
  packets: number
  lastSeen: number
}

interface NetworkStore {
  nodes: Map<string, NetworkNode>
  links: Map<string, NetworkLink>
  selectedNode: string | null
  threatNodes: Set<string>
  
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
}

export const useNetworkStore = create<NetworkStore>((set, get) => ({
  nodes: new Map(),
  links: new Map(),
  selectedNode: null,
  threatNodes: new Set(),
  
  addNode: (node) => {
    set((state) => {
      const newNodes = new Map(state.nodes)
      const nodeWithHistory = {
        ...node,
        packetHistory: node.packetHistory || [],
      }
      newNodes.set(node.id, nodeWithHistory)
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
  
  getAllNodes: () => Array.from(get().nodes.values()),
  
  getAllLinks: () => Array.from(get().links.values()),
  
  getNodeLinks: (nodeId) => {
    const links = get().getAllLinks()
    return links.filter((l) => l.source === nodeId || l.target === nodeId)
  },
}))

