
"use client";
import * as React from 'react';

interface NotificationContextType {
  refreshNotifications: () => void;
  refreshKey: number;
}

const NotificationContext = React.createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [refreshKey, setRefreshKey] = React.useState(0);
  const refreshNotifications = React.useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return (
    <NotificationContext.Provider value={{ refreshNotifications, refreshKey }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
}
