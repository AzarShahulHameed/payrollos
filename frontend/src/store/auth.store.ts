import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

function storage() {
  if (typeof window !== 'undefined') return window.localStorage;
  return { getItem: () => null as any, setItem: () => {}, removeItem: () => {} };
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string;
  organizationName: string;
  region: 'UAE' | 'INDIA';
  photoUrl?: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth:    (u: AuthUser, at: string, rt: string) => void;
  setTokens:  (at: string, rt: string) => void;
  updateUser: (patch: Partial<AuthUser>) => void;  // ← patch user fields without full re-login
  logout:     () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null, accessToken: null, refreshToken: null, isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      updateUser: (patch) =>
        set((state) => ({ user: state.user ? { ...state.user, ...patch } : state.user })),
      logout: () => set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
    }),
    { name: 'payrollos-auth', storage: createJSONStorage(storage) },
  ),
);

interface RegionState {
  region: 'UAE' | 'INDIA';
  setRegion: (r: 'UAE' | 'INDIA') => void;
}

export const useRegionStore = create<RegionState>()(
  persist(
    (set) => ({ region: 'UAE', setRegion: (r) => set({ region: r }) }),
    { name: 'payrollos-region', storage: createJSONStorage(storage) },
  ),
);
