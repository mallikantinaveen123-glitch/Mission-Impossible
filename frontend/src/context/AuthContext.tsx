import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  AuthUser, 
  loginUser, 
  verifyOtp, 
  registerUser, 
  getMe, 
  registerUser as apiRegister 
} from "@/services/api";

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<AuthUser>;
  loginWithOtp: (identifier: string, otp_code: string) => Promise<AuthUser>;
  register: (data: Parameters<typeof apiRegister>[0]) => Promise<AuthUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = async () => {
    const token = localStorage.getItem("traffic_auth_token");
    const savedUser = localStorage.getItem("traffic_auth_user");

    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse cached user", e);
      }
    }

    if (token) {
      try {
        const freshUser = await getMe();
        setUser(freshUser);
        localStorage.setItem("traffic_auth_user", JSON.stringify(freshUser));
      } catch (err) {
        localStorage.removeItem("traffic_auth_token");
        localStorage.removeItem("traffic_auth_user");
        setUser(null);
      }
    } else {
      localStorage.removeItem("traffic_auth_user");
      setUser(null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (identifier: string, password: string): Promise<AuthUser> => {
    const res = await loginUser({ identifier, password });
    localStorage.setItem("traffic_auth_token", res.access_token);
    localStorage.setItem("traffic_auth_user", JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  };

  const loginWithOtp = async (identifier: string, otp_code: string): Promise<AuthUser> => {
    const res = await verifyOtp({ identifier, otp_code, purpose: "LOGIN" });
    localStorage.setItem("traffic_auth_token", res.access_token);
    localStorage.setItem("traffic_auth_user", JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  };

  const register = async (data: Parameters<typeof registerUser>[0]): Promise<AuthUser> => {
    const res = await registerUser(data);
    localStorage.setItem("traffic_auth_token", res.access_token);
    localStorage.setItem("traffic_auth_user", JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem("traffic_auth_token");
    localStorage.removeItem("traffic_auth_user");
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const freshUser = await getMe();
      setUser(freshUser);
      localStorage.setItem("traffic_auth_user", JSON.stringify(freshUser));
    } catch (err) {
      console.error("Failed to refresh user", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginWithOtp,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

