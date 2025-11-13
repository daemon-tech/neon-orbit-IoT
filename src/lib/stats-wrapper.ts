// Wrapper for stats.js UMD module to provide ES module default export
// This file loads the UMD script and exports Stats as default

let Stats: any = null

if (typeof window !== 'undefined') {
  // Check if already loaded
  if (window.Stats) {
    Stats = window.Stats
  } else {
    // Load the UMD script
    const script = document.createElement('script')
    script.src = '/node_modules/stats.js/build/stats.min.js'
    script.type = 'text/javascript'
    script.async = false
    script.defer = false
    
    // Wait for script to load
    const loadPromise = new Promise<void>((resolve) => {
      script.onload = () => {
        Stats = (window as any).Stats || (globalThis as any).Stats
        resolve()
      }
      script.onerror = () => {
        console.error('Failed to load stats.js')
        resolve()
      }
    })
    
    document.head.appendChild(script)
    
    // Try to get it immediately if available
    if ((window as any).Stats) {
      Stats = (window as any).Stats
    }
  }
} else if (typeof globalThis !== 'undefined') {
  Stats = (globalThis as any).Stats
}

export default Stats

