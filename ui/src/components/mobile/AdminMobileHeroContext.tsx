import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type AdminMobileHeroContextValue = {
  heroOwned: boolean;
  setHeroOwned: (owned: boolean) => void;
};

const AdminMobileHeroContext = createContext<AdminMobileHeroContextValue | null>(null);

export function AdminMobileHeroProvider({ children }: { children: ReactNode }) {
  const [heroOwned, setHeroOwned] = useState(false);
  const value = useMemo(() => ({ heroOwned, setHeroOwned }), [heroOwned]);
  return (
    <AdminMobileHeroContext.Provider value={value}>{children}</AdminMobileHeroContext.Provider>
  );
}

export function useAdminMobileHeroContext() {
  return useContext(AdminMobileHeroContext);
}

export function useAdminMobileHeroOwned() {
  return useAdminMobileHeroContext()?.heroOwned ?? false;
}
