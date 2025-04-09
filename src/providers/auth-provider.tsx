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
  refreshUser: () => Promise<User | null>; // Dönüş tipi Promise<void> -> Promise<User | null> olarak güncellendi
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
  refreshUser: async () => null, // refreshUser için varsayılan eklendi
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
  const fetchAndSetUser = async (): Promise<User | null> => {
    const storedToken = localStorage.getItem('access_token');
    if (!storedToken) {
       setUser(null);
       setRole(null);
       setTeacherId(null);
       setToken(null);
       return null;
    }

    if (!token) setToken(storedToken); 

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
         console.error('Token validation failed during fetchAndSetUser', response.status);
         localStorage.removeItem('access_token');
         setToken(null);
         setUser(null);
         setRole(null);
         setTeacherId(null);
         return null;
      }

      const userData: User & { teacher_id?: number; student_id?: number } = await response.json(); 

      if (userData) {
        console.log("fetchAndSetUser successful, user data:", userData);
        setUser(userData);
        setRole(userData.role);
        setTeacherId(userData.role === 'TEACHER' ? userData.teacher_id || null : null); 
        return userData;
      } else {
         throw new Error('No user data found from /api/auth/me');
      }
    } catch (error) {
       console.error("fetchAndSetUser failed:", error);
       localStorage.removeItem('access_token');
       setToken(null);
       setUser(null);
       setRole(null);
       setTeacherId(null);
       return null;
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

  // Giriş işlemi - Giriş sonrası fetchAndSetUser çağrısı eklendi
  const login = async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    setUser(null);
    setRole(null);
    setTeacherId(null);
    setToken(null);
    localStorage.removeItem('access_token');

    try {
      console.log(`Login attempt for ${email} using API: ${apiUrl}/api/auth/login`);
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        mode: 'cors',
      })

      if (!response.ok) {
        let errorMessage = `Giriş başarısız: ${response.status}`;
        try {
           const errorData = await response.json();
           console.error('Login API error response:', errorData);
           errorMessage = errorData.message || errorData.detail || errorMessage;
        } catch (e) {
           console.error('Could not parse error response from login API');
        }
        throw new Error(errorMessage);
      }

      const data: { access_token: string } = await response.json() 
      console.log('Login API success, received token.');

      const { access_token } = data
      
      localStorage.setItem('access_token', access_token)

      console.log('Calling fetchAndSetUser after successful login...');
      const refreshedUserData = await fetchAndSetUser();

      if (refreshedUserData) {
          console.log(`Redirecting based on role: ${refreshedUserData.role}`);

          if (refreshedUserData.role === 'TEACHER') {
            router.push('/dashboard/teacher');
          } else if (refreshedUserData.role === 'STUDENT') {
            router.push('/dashboard/student');
          } else {
             console.error("Unknown user role after login:", refreshedUserData.role);
             setError("Bilinmeyen kullanıcı rolü.");
             localStorage.removeItem('access_token');
             setToken(null);setUser(null);setRole(null);setTeacherId(null);
          }
      } else {
          throw new Error("Kullanıcı bilgileri giriş sonrası alınamadı.");
      }

    } catch (err) {
      console.error('Login process error:', err)
      localStorage.removeItem('access_token');
      setToken(null);
      setUser(null);
      setRole(null);
      setTeacherId(null);
      setError(err instanceof Error ? err.message : 'Giriş işlemi sırasında bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  // Çıkış işlemi - Değişiklik yok
  const logout = () => {
    localStorage.removeItem('access_token')
    setToken(null)
    setUser(null)
    setRole(null)
    setTeacherId(null)
    router.push('/auth/login')
  }

  // Context değeri - Değişiklik yok
  const value = {
    user,
    token,
    teacherId,
    loading,
    error,
    role,
    login,
    logout,
    isAuthenticated: !!user,
    apiUrl,
    setApiUrl,
    refreshUser: fetchAndSetUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
