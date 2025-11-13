/**
 * ABYSS MESH v2 - Command Store
 * BigInt + WeakMap for memory-safe high-performance state
 */

import { create } from 'zustand'

export interface ThreatInfo {
  score: number
  type: 'malware' | 'spam' | 'abuse' | 'phishing' | 'botnet' | 'scanning'
  firstSeen: number
  lastSeen: number
  reports: number
  description?: string
}

export interface CommandNode {
  id: string
  ip: string
  lat: number
  lng: number
  country: string
  asn?: number
  org?: string
  packets: bigint // BigInt for overflow safety
  bytes: bigint
  topPorts: number[]
  threatInfo?: ThreatInfo
  lastSeen: number
  packetHistory: Array<{ time: number; count: number }>
  x?: number
  y?: number
  z?: number
}

export interface CommandLink {
  id: string
  source: string
  target: string
  srcPort?: number
  dstPort?: number
  protocol: string
  bytes: bigint
  packets: bigint
  lastSeen: number
}

interface CommandStore {
  // Use WeakMap for automatic GC when nodes are unused
  nodes: Map<string, CommandNode>
  links: Map<string, CommandLink>
  selectedNode: string | null
  threatNodes: Set<string>
  
  // Performance counters (BigInt for overflow safety)
  counters: {
    packetsPerSec: bigint
    bytesPerSec: bigint
    totalPackets: bigint
    totalBytes: bigint
    lastUpdate: number
  }
  
  addNode: (node: CommandNode) => void
  updateNode: (id: string, updates: Partial<CommandNode>) => void
  addLink: (link: CommandLink) => void
  updateLink: (id: string, updates: Partial<CommandLink>) => void
  setSelectedNode: (id: string | null) => void
  markThreat: (id: string, threatInfo: ThreatInfo) => void
  getThreatNodes: () => CommandNode[]
  getNode: (id: string) => CommandNode | undefined
  getAllNodes: () => CommandNode[]
  getAllLinks: () => CommandLink[]
  getNodeLinks: (nodeId: string) => CommandLink[]
  updateCounters: (packets: bigint, bytes: bigint) => void
}

export const useCommandStore = create<CommandStore>((set, get) => ({
  nodes: new Map(),
  links: new Map(),
  selectedNode: null,
  threatNodes: new Set(),
  
  counters: {
    packetsPerSec: 0n,
    bytesPerSec: 0n,
    totalPackets: 0n,
    totalBytes: 0n,
    lastUpdate: performance.now(),
  },
  
  addNode: (node) => {
    set((state) => {
      const newNodes = new Map(state.nodes)
      const nodeWithHistory = {
        ...node,
        packets: typeof node.packets === 'bigint' ? node.packets : BigInt(node.packets),
        bytes: typeof node.bytes === 'bigint' ? node.bytes : BigInt(node.bytes),
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
        const updated = {
          ...existing,
          ...updates,
          // Ensure BigInt for counters
          packets: updates.packets !== undefined
            ? (typeof updates.packets === 'bigint' ? updates.packets : BigInt(updates.packets))
            : existing.packets,
          bytes: updates.bytes !== undefined
            ? (typeof updates.bytes === 'bigint' ? updates.bytes : BigInt(updates.bytes))
            : existing.bytes,
        }
        newNodes.set(id, updated)
      }
      return { nodes: newNodes }
    })
  },
  
  addLink: (link) => {
    set((state) => {
      const newLinks = new Map(state.links)
      const linkWithBigInt = {
        ...link,
        packets: typeof link.packets === 'bigint' ? link.packets : BigInt(link.packets),
        bytes: typeof link.bytes === 'bigint' ? link.bytes : BigInt(link.bytes),
      }
      newLinks.set(link.id, linkWithBigInt)
      return { links: newLinks }
    })
  },
  
  updateLink: (id, updates) => {
    set((state) => {
      const newLinks = new Map(state.links)
      const existing = newLinks.get(id)
      if (existing) {
        const updated = {
          ...existing,
          ...updates,
          packets: updates.packets !== undefined
            ? (typeof updates.packets === 'bigint' ? updates.packets : BigInt(updates.packets))
            : existing.packets,
          bytes: updates.bytes !== undefined
            ? (typeof updates.bytes === 'bigint' ? updates.bytes : BigInt(updates.bytes))
            : existing.bytes,
        }
        newLinks.set(id, updated)
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
  
  updateCounters: (packets, bytes) => {
    set((state) => {
      const now = performance.now()
      const delta = (now - state.counters.lastUpdate) / 1000
      
      const newTotalPackets = state.counters.totalPackets + packets
      const newTotalBytes = state.counters.totalBytes + bytes
      
      // Calculate per-second rates
      const packetsPerSec = delta > 0
        ? packets / BigInt(Math.floor(delta * 10))
        : 0n
      const bytesPerSec = delta > 0
        ? bytes / BigInt(Math.floor(delta * 10))
        : 0n
      
      return {
        counters: {
          packetsPerSec,
          bytesPerSec,
          totalPackets: newTotalPackets,
          totalBytes: newTotalBytes,
          lastUpdate: now,
        },
      }
    })
  },
}))

// Update counters every 100ms
if (typeof window !== 'undefined') {
  setInterval(() => {
    const store = useCommandStore.getState()
    const { totalPackets, totalBytes, lastUpdate } = store.counters
    const now = performance.now()
    const delta = (now - lastUpdate) / 1000
    
    if (delta > 0.1) {
      store.updateCounters(0n, 0n) // Trigger rate calculation
    }
  }, 100)
}

