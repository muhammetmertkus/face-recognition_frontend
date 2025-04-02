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
  apiUrl: 'http://127.0.0.1:5000', // Örnek API URL'si ile güncellendi
  setApiUrl: () => {}
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
      return localStorage.getItem('apiUrl') || 'http://127.0.0.1:5000'
    }
    return 'http://127.0.0.1:5000'
  })
  const router = useRouter()

  // API URL'ini ayarla ve localStorage'a kaydet
  const setApiUrl = (url: string) => {
    setApiUrlState(url)
    localStorage.setItem('apiUrl', url)
    // API servisinin URL'ini güncelle (apiService varsayımı)
    // apiService.setBaseUrl(url) // Bu satırın apiService yapınıza göre olması gerekir
  }

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
      const storedToken = localStorage.getItem('access_token') // token anahtarı güncellendi
      setToken(storedToken) // Token state'ini ayarla

      if (storedToken) {
        try {
          const response = await fetch(`${apiUrl}/api/auth/me`, { // apiUrl kullanıldı
             headers: {
               'Authorization': `Bearer ${storedToken}`,
               'Accept': 'application/json'
             }
          });
          
          if (!response.ok) {
             throw new Error('Token validation failed');
          }

          const userData: User & { teacher_id?: number } = await response.json(); // teacher_id bekliyoruz

          if (userData) {
            setUser(userData)
            setRole(userData.role) // Role bilgisini ayarla
            // Eğer öğretmen ise teacherId'yi API'den gelen teacher_id ile ayarla
            if (userData.role === 'TEACHER' && userData.teacher_id) {
              setTeacherId(userData.teacher_id);
            } else {
              setTeacherId(null);
            }
          } else {
             throw new Error('No user data found');
          }
          
        } catch (error) {
          console.error("Token check failed:", error)
          localStorage.removeItem('access_token') // token anahtarı güncellendi
          setToken(null) // Token state'ini temizle
          setUser(null)
          setRole(null) // role sıfırlandı
          setTeacherId(null); // Hata durumunda teacherId'yi sıfırla
        }
      }
      
      setLoading(false)
    }

    checkAuth()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // apiUrl bağımlılıklardan çıkarıldı, sadece başlangıçta çalışsın

  // Giriş işlemi - token state'i de ayarlanıyor
  const login = async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${apiUrl}/api/auth/login`, { // apiUrl kullanıldı
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email, password }), // Sadece email ve password gönderiliyor
      })

      if (!response.ok) {
        // Hata durumunu daha detaylı yönetebiliriz
        let errorMessage = `Giriş başarısız: ${response.statusText}`;
        try {
           const errorData = await response.json();
           errorMessage = errorData.message || errorData.detail || errorMessage;
        } catch (e) {
           // JSON parse hatası olursa varsayılan mesajı kullan
        }
        throw new Error(errorMessage);
      }

      // teacher_id bekliyoruz
      const data: { access_token: string, user: User & { teacher_id?: number } } = await response.json() 
      
      const { access_token, user: userData } = data
      
      localStorage.setItem('access_token', access_token)
      setToken(access_token) // Token state'ini ayarla
      setUser(userData)
      setRole(userData.role)
      
      // Eğer öğretmen ise teacherId'yi API'den gelen teacher_id ile ayarla
      if (userData.role === 'TEACHER' && userData.teacher_id) {
         setTeacherId(userData.teacher_id);
      } else {
         setTeacherId(null);
      }

      // Rol tabanlı yönlendirme (API'den gelen role değerine göre)
      if (userData.role === 'TEACHER') {
        router.push('/dashboard/teacher')
      } else if (userData.role === 'STUDENT') {
        router.push('/dashboard/student')
      } else {
         // Diğer roller veya varsayılan durum için yönlendirme
         router.push('/dashboard') 
      }
      
    } catch (error: any) {
      setError(error.message || 'Sunucu bağlantı hatası veya giriş hatası')
      localStorage.removeItem('access_token');
      setToken(null) // Token state'ini temizle
      setUser(null);
      setRole(null);
      setTeacherId(null); // Hata durumunda teacherId'yi sıfırla
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

  // Context değeri güncellendi - token eklendi
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
    setApiUrl
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 