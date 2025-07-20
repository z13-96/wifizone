'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'SELLER' | 'CLIENT';
  isActive: boolean;
  isVerified: boolean;
  avatar?: string;
  sellerProfile?: {
    id: string;
    businessName: string;
    balance: number;
    isApproved: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

interface RegisterData {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'SELLER' | 'CLIENT';
  businessName?: string;
  businessAddress?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Configuration axios
  axios.defaults.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  // Intercepteur pour ajouter le token aux requêtes
  axios.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Intercepteur pour gérer les erreurs d'authentification
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        setUser(null);
        router.push('/auth/login');
      }
      return Promise.reject(error);
    }
  );

  // Vérifier l'authentification au chargement
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await axios.get('/auth/me');
          setUser(response.data.user);
        }
      } catch (error) {
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      setUser(user);
      
      // Rediriger selon le rôle
      if (user.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else if (user.role === 'SELLER') {
        router.push('/seller/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Erreur de connexion');
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      const response = await axios.post('/auth/register', userData);
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      setUser(user);
      
      // Rediriger selon le rôle
      if (user.role === 'SELLER') {
        router.push('/seller/onboarding');
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Erreur d\'inscription');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    router.push('/');
  };

  const updateUser = (userData: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...userData } : null);
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 