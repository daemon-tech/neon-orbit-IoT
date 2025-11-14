/**
 * COMMAND CENTER v3 - MONITOR SCREEN SYSTEM
 * Floating monitor screens that appear like pages
 */

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface Tab {
  id: string
  title: string
  type: 'local' | 'scan' | 'threat' | 'feed' | 'mesh'
  content: React.ReactNode
  data?: any
}

interface TabSystemProps {
  tabs: Tab[]
  activeTabId: string | null
  onTabChange: (tabId: string | null) => void
  onTabClose: (tabId: string) => void
}

export const TabSystem = ({ tabs, activeTabId, onTabChange, onTabClose }: TabSystemProps) => {
  // Always show monitor screen if there's an active tab
  const shouldShowScreen = activeTabId !== null && tabs.length > 0

  return (
    <>
      {/* Screen Navigation - Floating at bottom */}
      {shouldShowScreen && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[10000]">
        <div className="bg-tech-panel border border-tech-border px-4 py-2 flex items-center gap-3">
          <div className="text-xs font-mono text-tech-text-muted uppercase tracking-wider">
            SCREENS:
          </div>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-all border ${
                activeTabId === tab.id
                  ? 'bg-tech-primary text-tech-bg border-tech-primary'
                  : 'bg-tech-panel text-tech-text-muted border-tech-border hover:border-tech-primary hover:text-tech-text'
              }`}
            >
              {tab.title}
            </button>
          ))}
          {tabs.length > 1 && (
            <>
              <div className="h-4 w-px bg-tech-border mx-1" />
              <button
                onClick={() => {
                  if (tabs.length > 0) {
                    const currentIndex = tabs.findIndex(t => t.id === activeTabId)
                    const nextIndex = (currentIndex + 1) % tabs.length
                    onTabChange(tabs[nextIndex].id)
                  }
                }}
                className="px-3 py-1.5 text-xs font-mono uppercase text-tech-text-muted hover:text-tech-primary border border-tech-border hover:border-tech-primary transition-colors"
              >
                NEXT →
              </button>
            </>
          )}
        </div>
      </div>
      )}

      {/* Floating Monitor Screen - Always on top when active */}
      <AnimatePresence>
        {shouldShowScreen && activeTabId && (
          <motion.div
            key={activeTabId}
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
          >
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/70 backdrop-blur-sm pointer-events-auto"
              onClick={() => {
                // Only close if clicking backdrop, not the screen itself
                onTabClose(activeTabId!)
              }}
            />
            
            {/* Monitor Screen */}
            <div 
              className="relative w-[90%] max-w-[1400px] h-[85vh] bg-tech-panel border-2 border-tech-primary pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Monitor Bezel/Frame Effect */}
              <div className="absolute inset-0 border-4 border-tech-bg pointer-events-none" />
              
              {/* Screen Content Area */}
              <div className="relative h-full overflow-hidden">
                <div className="absolute inset-0 overflow-auto">
                  {tabs.find(t => t.id === activeTabId)?.content}
                </div>
              </div>

              {/* Monitor Screen Label/Info Bar */}
              <div className="absolute top-0 left-0 right-0 h-10 bg-tech-bg border-b-2 border-tech-primary flex items-center justify-between px-6 z-10">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-tech-primary rounded-full animate-pulse" />
                  <span className="text-sm font-mono uppercase text-tech-primary tracking-wider">
                    {tabs.find(t => t.id === activeTabId)?.title || 'MONITOR DISPLAY'}
                  </span>
                  {activeTabId && (
                    <span className="text-xs font-mono text-tech-text-muted">
                      [{tabs.findIndex(t => t.id === activeTabId) + 1}/{tabs.length}]
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-xs font-mono text-tech-text-muted">
                    {new Date().toLocaleTimeString('en-US', { hour12: false })}
                  </div>
                  <button
                    onClick={() => onTabClose(activeTabId)}
                    className="w-7 h-7 flex items-center justify-center text-tech-text-muted hover:text-tech-error hover:bg-tech-error/20 transition-colors border border-tech-border hover:border-tech-error text-lg font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
