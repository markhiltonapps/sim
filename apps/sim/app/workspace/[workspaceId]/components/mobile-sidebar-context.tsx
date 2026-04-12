'use client'

import { createContext, useContext } from 'react'

const MobileSidebarContext = createContext(false)

export function MobileSidebarProvider({ children }: { children: React.ReactNode }) {
  return <MobileSidebarContext.Provider value={true}>{children}</MobileSidebarContext.Provider>
}

/** Returns true when the sidebar is rendered inside the mobile drawer overlay */
export function useIsMobileSidebar() {
  return useContext(MobileSidebarContext)
}
