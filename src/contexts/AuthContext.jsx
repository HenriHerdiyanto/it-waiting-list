import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { ADMIN_PASS, ADMIN_USER } from '../config';

const AUTH_KEY = 'isAuth';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => localStorage.getItem(AUTH_KEY) === 'true',
  );

  const login = useCallback((username, password) => {
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      setIsLoggedIn(true);
      localStorage.setItem(AUTH_KEY, 'true');
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setIsLoggedIn(false);
    localStorage.removeItem(AUTH_KEY);
  }, []);

  const value = useMemo(
    () => ({ isLoggedIn, login, logout }),
    [isLoggedIn, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth harus dipakai di dalam AuthProvider.');
  return context;
}
