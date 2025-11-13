import { useNetworkStore } from '../store/networkStore'

/**
 * AS View Toggle Component
 * Switch between IP-level and AS-level visualization
 */
export const ASViewToggle = () => {
  const { viewMode, setViewMode, aggregateByASN } = useNetworkStore()

  const handleToggle = () => {
    const newMode = viewMode === 'ip' ? 'as' : 'ip'
    setViewMode(newMode)
    
    if (newMode === 'as') {
      // Aggregate nodes by ASN when switching to AS view
      aggregateByASN()
    }
  }

  return (
    <button
      onClick={handleToggle}
      className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors border ${
        viewMode === 'ip'
          ? 'bg-tech-primary text-tech-bg border-tech-primary'
          : 'bg-tech-warning text-tech-bg border-tech-warning'
      } hover:opacity-80`}
    >
      {viewMode === 'ip' ? 'IP' : 'AS'}
    </button>
  )
}

