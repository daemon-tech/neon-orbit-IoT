/**
 * TAB STORE - Manage all monitor tabs
 */

import { create } from 'zustand'
import { Tab } from '../components/TabSystem'

interface TabStore {
  tabs: Tab[]
  activeTabId: string | null

  addTab: (tab: Tab) => void
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string | null) => void
  updateTab: (tabId: string, updates: Partial<Tab>) => void
  getTab: (tabId: string) => Tab | undefined
}

export const useTabStore = create<TabStore>((set, get) => ({
  tabs: [],
  activeTabId: null,

  addTab: (tab) => {
    set((state) => {
      // Don't add duplicate tabs
      if (state.tabs.find(t => t.id === tab.id)) {
        return { activeTabId: tab.id }
      }
      return {
        tabs: [...state.tabs, tab],
        activeTabId: tab.id,
      }
    })
  },

  closeTab: (tabId) => {
    set((state) => {
      const newTabs = state.tabs.filter(t => t.id !== tabId)
      const newActiveId = 
        state.activeTabId === tabId
          ? newTabs.length > 0
            ? newTabs[newTabs.length - 1].id
            : null
          : state.activeTabId
      return {
        tabs: newTabs,
        activeTabId: newActiveId,
      }
    })
  },

  setActiveTab: (tabId) => set({ activeTabId: tabId }),

  updateTab: (tabId, updates) => {
    set((state) => ({
      tabs: state.tabs.map(t => t.id === tabId ? { ...t, ...updates } : t),
    }))
  },

  getTab: (tabId) => get().tabs.find(t => t.id === tabId),
}))

