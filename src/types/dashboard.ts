export type DashboardTab = 'events' | 'earnings' | 'notifications' | 'settings';

export interface DashboardState {
  activeTab: DashboardTab;
  isSidebarOpen: boolean;
  modals: {
    session: boolean;
    eventType: boolean;
  };
}

export interface DashboardContextType {
  state: DashboardState;
  setActiveTab: (tab: DashboardTab) => void;
  toggleSidebar: (open?: boolean) => void;
  openModal: (modal: keyof DashboardState['modals']) => void;
  closeModal: (modal: keyof DashboardState['modals']) => void;
}