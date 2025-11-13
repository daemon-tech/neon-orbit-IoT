/**
 * Object Pool for Reusing Nodes/Links
 * Prevents GC pressure by reusing objects
 */
export class ObjectPool<T> {
  private pool: T[] = []
  private active = new WeakSet<T>()

  constructor(
    private factory: () => T,
    private reset?: (obj: T) => void
  ) {}

  /**
   * Acquire object from pool or create new one
   */
  acquire(): T {
    const obj = this.pool.pop() || this.factory()
    this.active.add(obj)
    return obj
  }

  /**
   * Release object back to pool
   */
  release(obj: T): void {
    if (!this.active.has(obj)) return
    
    // Reset object state
    if (this.reset) {
      this.reset(obj)
    } else {
      // Default reset: clear common fields
      if (typeof obj === 'object' && obj !== null) {
        const anyObj = obj as any
        if ('packets' in anyObj) anyObj.packets = 0n
        if ('bytes' in anyObj) anyObj.bytes = 0n
        if ('lastSeen' in anyObj) anyObj.lastSeen = 0
      }
    }
    
    this.active.delete(obj)
    this.pool.push(obj)
  }

  /**
   * Get pool size
   */
  getSize(): number {
    return this.pool.length
  }

  /**
   * Clear pool
   */
  clear(): void {
    this.pool = []
  }
}

