import { createContext, useContext } from 'react';

// PRESENTATION LAYER: React components only talk to use cases, handed to them here.
// They never import repositories or the database.
const AppContext = createContext(null);

export function AppProvider({ container, children }) {
  return <AppContext.Provider value={container}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside <AppProvider>');
  return value;
}
