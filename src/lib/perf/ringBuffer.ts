/**
 * Zero-Alloc Ring Buffer for High-Performance Streaming
 * Reuses objects to avoid GC pressure
 */
export class RingBuffer<T> {
  private buffer: T[]
  private write = 0
  private read = 0
  private size = 0

  constructor(
    private capacity: number,
    private factory: () => T
  ) {
    // Pre-allocate all objects
    this.buffer = Array(capacity)
      .fill(null)
      .map(() => factory())
  }

  /**
   * Push item into buffer, reusing existing object
   * Returns the object that was written to
   */
  push(item: Partial<T>): T {
    const obj = this.buffer[this.write]
    Object.assign(obj, item)
    
    this.write = (this.write + 1) % this.capacity
    
    if (this.size < this.capacity) {
      this.size++
    } else {
      // Buffer full, advance read pointer
      this.read = (this.read + 1) % this.capacity
    }
    
    return obj
  }

  /**
   * Get current size
   */
  getSize(): number {
    return this.size
  }

  /**
   * Check if buffer is full
   */
  isFull(): boolean {
    return this.size === this.capacity
  }

  /**
   * Clear buffer
   */
  clear(): void {
    this.size = 0
    this.read = 0
    this.write = 0
  }

  /**
   * Iterate over buffer items (in order)
   */
  [Symbol.iterator]() {
    let i = 0
    return {
      next: () => {
        if (i >= this.size) {
          return { done: true, value: undefined }
        }
        const idx = (this.read + i) % this.capacity
        i++
        return { value: this.buffer[idx], done: false }
      },
    }
  }

  /**
   * Get all items as array (for batch processing)
   */
  toArray(): T[] {
    const result: T[] = []
    for (const item of this) {
      result.push(item)
    }
    return result
  }
}

