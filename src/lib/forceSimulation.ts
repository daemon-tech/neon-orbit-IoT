// Simple 3D force simulation (replacement for d3-force-3d)

export interface ForceNode {
  id: string
  x?: number
  y?: number
  z?: number
  vx?: number
  vy?: number
  vz?: number
}

export interface ForceLink {
  source: string | ForceNode
  target: string | ForceNode
  distance?: number
}

export class ForceSimulation {
  private nodes: ForceNode[]
  private links: ForceLink[]
  private alpha: number = 1
  private _alphaTarget: number = 0
  private alphaDecay: number = 0.0228
  private velocityDecay: number = 0.4
  private chargeStrength: number = -120
  private linkDistance: number = 30
  private centerX: number = 0
  private centerY: number = 0
  private centerZ: number = 0
  private centerStrength: number = 0.1
  private tickCallbacks: (() => void)[] = []

  constructor(nodes: ForceNode[]) {
    this.nodes = nodes.map((n) => ({
      ...n,
      x: n.x ?? (Math.random() - 0.5) * 10,
      y: n.y ?? (Math.random() - 0.5) * 10,
      z: n.z ?? (Math.random() - 0.5) * 10,
      vx: n.vx ?? 0,
      vy: n.vy ?? 0,
      vz: n.vz ?? 0,
    }))
    this.links = []
  }

  force(name: string, force?: any): this {
    if (name === 'charge') {
      this.chargeStrength = force?.strength?.() ?? -120
    } else if (name === 'link') {
      this.links = force?.links() ?? []
      this.linkDistance = force?.distance?.() ?? 30
    } else if (name === 'center') {
      this.centerX = force?.x?.() ?? 0
      this.centerY = force?.y?.() ?? 0
      this.centerZ = force?.z?.() ?? 0
      this.centerStrength = force?.strength?.() ?? 0.1
    }
    return this
  }

  alphaTarget(target: number): this {
    this._alphaTarget = target
    return this
  }

  restart(): this {
    this.alpha = 1
    return this
  }

  stop(): this {
    this.alpha = 0
    this.tickCallbacks = []
    return this
  }

  on(event: string, callback: () => void): this {
    if (event === 'tick') {
      this.tickCallbacks.push(callback)
    }
    return this
  }

  tick(): void {
    if (this.alpha < 0.001) return

    // Apply charge force (repulsion)
    for (let i = 0; i < this.nodes.length; i++) {
      const nodeA = this.nodes[i]
      for (let j = i + 1; j < this.nodes.length; j++) {
        const nodeB = this.nodes[j]
        const dx = (nodeB.x ?? 0) - (nodeA.x ?? 0)
        const dy = (nodeB.y ?? 0) - (nodeA.y ?? 0)
        const dz = (nodeB.z ?? 0) - (nodeA.z ?? 0)
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1

        const force = (this.chargeStrength * this.alpha) / (distance * distance)
        const fx = (dx / distance) * force
        const fy = (dy / distance) * force
        const fz = (dz / distance) * force

        nodeA.vx = (nodeA.vx ?? 0) - fx
        nodeA.vy = (nodeA.vy ?? 0) - fy
        nodeA.vz = (nodeA.vz ?? 0) - fz

        nodeB.vx = (nodeB.vx ?? 0) + fx
        nodeB.vy = (nodeB.vy ?? 0) + fy
        nodeB.vz = (nodeB.vz ?? 0) + fz
      }
    }

    // Apply link force (attraction)
    for (const link of this.links) {
      const source = typeof link.source === 'string'
        ? this.nodes.find((n) => n.id === link.source)
        : link.source
      const target = typeof link.target === 'string'
        ? this.nodes.find((n) => n.id === link.target)
        : link.target

      if (!source || !target) continue

      const dx = (target.x ?? 0) - (source.x ?? 0)
      const dy = (target.y ?? 0) - (source.y ?? 0)
      const dz = (target.z ?? 0) - (source.z ?? 0)
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1
      const targetDistance = link.distance ?? this.linkDistance

      const force = ((distance - targetDistance) / distance) * this.alpha * 0.1

      const fx = (dx / distance) * force
      const fy = (dy / distance) * force
      const fz = (dz / distance) * force

      source.vx = (source.vx ?? 0) + fx
      source.vy = (source.vy ?? 0) + fy
      source.vz = (source.vz ?? 0) + fz

      target.vx = (target.vx ?? 0) - fx
      target.vy = (target.vy ?? 0) - fy
      target.vz = (target.vz ?? 0) - fz
    }

    // Apply center force
    for (const node of this.nodes) {
      const dx = this.centerX - (node.x ?? 0)
      const dy = this.centerY - (node.y ?? 0)
      const dz = this.centerZ - (node.z ?? 0)

      node.vx = (node.vx ?? 0) + dx * this.centerStrength * this.alpha
      node.vy = (node.vy ?? 0) + dy * this.centerStrength * this.alpha
      node.vz = (node.vz ?? 0) + dz * this.centerStrength * this.alpha
    }

    // Update positions
    for (const node of this.nodes) {
      node.vx = (node.vx ?? 0) * this.velocityDecay
      node.vy = (node.vy ?? 0) * this.velocityDecay
      node.vz = (node.vz ?? 0) * this.velocityDecay

      node.x = (node.x ?? 0) + (node.vx ?? 0)
      node.y = (node.y ?? 0) + (node.vy ?? 0)
      node.z = (node.z ?? 0) + (node.vz ?? 0)
    }

    // Update alpha
    this.alpha += (this._alphaTarget - this.alpha) * 0.1

    // Call tick callbacks
    this.tickCallbacks.forEach((cb) => cb())
  }
}

export function forceSimulation(nodes: ForceNode[]): ForceSimulation {
  return new ForceSimulation(nodes)
}

export function forceManyBody() {
  return {
    strength: () => -120,
  }
}

export function forceLink(links: ForceLink[]) {
  const linkForce = {
    links: () => links,
    distance: () => 30,
  }
  
  // Add id method for chaining
  ;(linkForce as any).id = function(accessor: (d: any) => string) {
    return linkForce
  }
  
  return linkForce
}

export function forceCenter() {
  return {
    x: () => 0,
    y: () => 0,
    z: () => 0,
    strength: () => 0.1,
  }
}

