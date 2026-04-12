/**
 * Sidebar state interface
 */
export interface SidebarState {
  workspaceDropdownOpen: boolean
  sidebarWidth: number
  /** Whether the sidebar is collapsed to icon-only mode */
  isCollapsed: boolean
  /** Whether the sidebar is currently being resized */
  isResizing: boolean
  /** Whether the mobile sidebar drawer is open */
  isMobileOpen: boolean
  _hasHydrated: boolean
  setWorkspaceDropdownOpen: (isOpen: boolean) => void
  setSidebarWidth: (width: number) => void
  /** Toggles sidebar between collapsed and expanded states */
  toggleCollapsed: () => void
  /** Updates the sidebar resize state */
  setIsResizing: (isResizing: boolean) => void
  /** Opens or closes the mobile sidebar drawer */
  setMobileOpen: (isOpen: boolean) => void
  setHasHydrated: (hasHydrated: boolean) => void
}
