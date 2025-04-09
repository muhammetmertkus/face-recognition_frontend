"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import apiService from '@/lib/api'
import { Teacher, Student } from '@/lib/mock-db'

// Kullanıcı tipi tanımı - API yanıtına göre güncellendi
interface User {
  id: number // API'den number geliyor
  email: string
  first_name: string
  last_name: string
  role: string // örn: "TEACHER", "STUDENT"
  is_active: boolean
  created_at: string
  updated_at: string
  // Avatar veya studentId gibi ek alanlar API yanıtına göre eklenebilir
  avatar?: string 
  student_id?: number | null; // student_id eklendi (opsiyonel)
}

// Auth bağlamı tipi - token eklendi
interface AuthContextType {
  user: User | null
  token: string | null // Token eklendi
  teacherId: number | null // Öğretmen ID'si eklendi
  loading: boolean
  error: string | null
  role: string | null // userType yerine role
  login: (email: string, password: string) => Promise<void> // userType kaldırıldı
  logout: () => void
  isAuthenticated: boolean
  apiUrl: string
  setApiUrl: (url: string) => void
  refreshUser: () => Promise<void>; // Kullanıcı bilgisini yenileme fonksiyonu eklendi
}

// Varsayılan değerler ile bağlam oluşturma - token eklendi
const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null, // Token eklendi
  teacherId: null, // Öğretmen ID'si eklendi
  loading: false,
  error: null,
  role: null, // userType yerine role
  login: async () => {},
  logout: () => {},
  isAuthenticated: false,
  apiUrl: 'https://web-production-0ea9f.up.railway.app', // Örnek API URL'si ile güncellendi
  setApiUrl: () => {},
  refreshUser: async () => {}, // refreshUser için varsayılan eklendi
})

// Auth bağlamını kullanmak için özel hook
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null) // Token state'i eklendi
  const [teacherId, setTeacherId] = useState<number | null>(null) // Öğretmen ID'si state'i eklendi
  const [role, setRole] = useState<string | null>(null) // userType -> role
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  // API URL'si için varsayılan değer ayarlandı
  const [apiUrl, setApiUrlState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('apiUrl') || 'https://web-production-0ea9f.up.railway.app'
    }
    return 'https://web-production-0ea9f.up.railway.app'
  })
  const router = useRouter()

  // API URL'ini ayarla ve localStorage'a kaydet
  const setApiUrl = (url: string) => {
    setApiUrlState(url)
    localStorage.setItem('apiUrl', url)
    // API servisinin URL'ini güncelle (apiService varsayımı)
    // apiService.setBaseUrl(url) // Bu satırın apiService yapınıza göre olması gerekir
  }

  // Kullanıcı bilgisini API'den alıp state'i güncelleyen fonksiyon
  const fetchAndSetUser = async () => {
    const storedToken = localStorage.getItem('access_token');
    if (!storedToken) {
       setUser(null);
       setRole(null);
       setTeacherId(null);
       setToken(null);
       return;
    }

    setToken(storedToken);
    try {
      const response = await fetch(`${apiUrl}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${storedToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        credentials: 'include',
      });
      
      if (!response.ok) {
         throw new Error('Token validation failed during refresh');
      }

      const userData: User & { teacher_id?: number; student_id?: number } = await response.json(); 

      if (userData) {
        setUser(userData);
        setRole(userData.role);
        setTeacherId(userData.role === 'TEACHER' ? userData.teacher_id || null : null);
      } else {
         throw new Error('No user data found during refresh');
      }
    } catch (error) {
       console.error("User refresh failed:", error);
       localStorage.removeItem('access_token');
       setToken(null);
       setUser(null);
       setRole(null);
       setTeacherId(null);
    }
  };


  useEffect(() => {
    // Saklanan API URL'ini kontrol et ve ayarla
    const savedApiUrl = localStorage.getItem('apiUrl')
    if (savedApiUrl) {
      setApiUrlState(savedApiUrl)
      // apiService.setBaseUrl(savedApiUrl) // Bu satırın apiService yapınıza göre olması gerekir
    } else {
       // Eğer local storage'da yoksa varsayılanı ayarla
       localStorage.setItem('apiUrl', apiUrl)
       // apiService.setBaseUrl(apiUrl) // Bu satırın apiService yapınıza göre olması gerekir
    }

    // Sayfa yüklendiğinde kullanıcı bilgisini ve token'ı getir
    const checkAuth = async () => {
       setLoading(true); // Yükleme başlangıcı
       await fetchAndSetUser(); // Kullanıcı bilgisini al
       setLoading(false); // Yükleme bitişi
    }

    checkAuth()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // apiUrl bağımlılıklardan çıkarıldı, sadece başlangıçta çalışsın

  // Giriş işlemi - token state'i de ayarlanıyor
  const login = async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        mode: 'cors',
        credentials: 'include',
      })

      if (!response.ok) {
        let errorMessage = `Giriş başarısız: ${response.statusText}`;
        try {
           const errorData = await response.json();
           errorMessage = errorData.message || errorData.detail || errorMessage;
        } catch (e) {
        }
        throw new Error(errorMessage);
      }

      const data: { access_token: string, user: User & { teacher_id?: number } } = await response.json() 
      
      const { access_token, user: userData } = data
      
      localStorage.setItem('access_token', access_token)
      setToken(access_token)
      setUser(userData)
      setRole(userData.role)

      // Log the received user data, especially the role
      console.log("Login successful, user data:", userData);
      console.log("User role for redirection:", userData.role);

      if (userData.role === 'TEACHER' && userData.teacher_id) {
         setTeacherId(userData.teacher_id);
      } else {
         setTeacherId(null);
      }

      sessionStorage.setItem('needsDashboardRefresh', 'true');

      if (userData.role === 'TEACHER') {
        router.push('/dashboard/teacher');
      } else if (userData.role === 'STUDENT') {
        router.push('/dashboard/student');
        // Removed the forced refresh as it interferes with navigation
        // Data loading is now handled by waiting for authLoading in dashboard/courses pages
      }
    } catch (err) {
      console.error('Login error:', err)
      setError(err instanceof Error ? err.message : 'Giriş başarısız')
    } finally {
      setLoading(false)
    }
  }

  // Çıkış işlemi - token state'i de temizleniyor
  const logout = () => {
    localStorage.removeItem('access_token')
    setToken(null) // Token state'ini temizle
    setUser(null)
    setRole(null)
    setTeacherId(null) // Çıkışta teacherId'yi sıfırla
    router.push('/auth/login')
  }

  // Context değeri güncellendi - token ve refreshUser eklendi
  const value = {
    user,
    token, // Token eklendi
    teacherId, // Öğretmen ID'si eklendi
    loading,
    error,
    role,
    login,
    logout,
    isAuthenticated: !!user, // veya !!token da kullanılabilir
    apiUrl,
    setApiUrl,
    refreshUser: fetchAndSetUser // refreshUser fonksiyonu bağlama eklendi
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
