"use client"

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Mail, Lock, ArrowRight, School, BookOpen, Globe, Camera, CheckCircle2, Sun, Moon, Settings, X, Save, Loader2, AlertCircle, UserPlus } from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import { RegisterStudentModal } from '@/components/auth/RegisterStudentModal'

// Yeni Tema Butonu Komponenti (Yerel olarak tanımlandı, isterseniz ayrı dosyaya taşıyabilirsiniz)
interface ThemeToggleButtonProps {
  theme: string | undefined;
  toggleTheme: () => void;
  t: any; // çeviri objesi
}

const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({ theme, toggleTheme, t }) => {
  const spring = {
    type: "spring",
    stiffness: 500,
    damping: 40
  };

  // Yıldızlar için pozisyonlar (örnek)
  const stars = [
    { top: '20%', left: '60%', scale: 0.6, delay: 0.1 },
    { top: '30%', left: '80%', scale: 0.4, delay: 0.3 },
    { top: '50%', left: '70%', scale: 0.5, delay: 0.5 },
    { top: '65%', left: '85%', scale: 0.3, delay: 0.2 },
  ];

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      className={cn(
        "relative flex items-center justify-between w-20 h-10 rounded-full p-1 cursor-pointer overflow-hidden",
        "bg-[url('/images/mountain-bg.png')] bg-cover bg-no-repeat",
        "transition-all duration-700 ease-in-out"
      )}
      style={{
        backgroundPosition: theme === 'dark' ? 'right center' : 'left center',
      }}
      aria-label={theme === 'dark' ? t.lightMode : t.darkMode}
      title={theme === 'dark' ? t.lightMode : t.darkMode}
    >
      {/* Yıldızlar - Sadece karanlık modda */} 
      <AnimatePresence>
        {theme === 'dark' && stars.map((star, i) => (
          <motion.div
            key={`star-${i}`}
            className="absolute rounded-full bg-white/80 shadow-sm"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 0.8, 0],
              scale: star.scale,
              transition: {
                delay: star.delay,
                duration: 1.5,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut"
              }
            }}
            exit={{ opacity: 0, scale: 0 }}
            style={{
              top: star.top,
              left: star.left,
              width: `${star.scale * 5}px`,
              height: `${star.scale * 5}px`,
            }}
          />
        ))}
      </AnimatePresence>

      <motion.div
        className="absolute left-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-lg"
        layout
        transition={spring}
        style={{ x: theme === 'dark' ? 2 : 42 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={theme === 'dark' ? 'moon' : 'sun'}
            initial={{ y: -15, opacity: 0, rotate: -60 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: 15, opacity: 0, rotate: 60 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex items-center justify-center"
          >
            {theme === 'dark' ? (
              <Moon className="h-5 w-5 text-slate-500" />
            ) : (
              <Sun className="h-5 w-5 text-yellow-500" />
            )}
          </motion.span>
        </AnimatePresence>
      </motion.div>
    </motion.button>
  );
};

// Form şeması
const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'E-posta adresi gereklidir' })
    .email({ message: 'Geçerli bir e-posta adresi giriniz' }),
  password: z
    .string()
    .min(6, { message: 'Şifre en az 6 karakter olmalıdır' }),
  rememberMe: z.boolean().default(false),
})

type LoginValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { login, loading, error, apiUrl, setApiUrl } = useAuth()
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [language, setLanguage] = useState<'tr' | 'en'>('tr')
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()
  const [showSettings, setShowSettings] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSuccess, setResetSuccess] = useState<string | null>(null)
  const [resetError, setResetError] = useState<string | null>(null)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: false,
    },
  })

  const onSubmit = async (data: LoginValues) => {
    try {
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
        mode: 'cors',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Giriş başarısız');
      }

      const result = await response.json();
      await login(data.email, data.password);
      
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const saveApiUrl = () => {
    setShowSettings(false)
  }

  const translations = {
    tr: {
      title: 'Yüz Tanıma Yoklama Sistemi',
      subtitle: 'Kampüs Çözümleri',
      welcome: 'Hoş Geldiniz',
      description: 'Yüz tanıma teknolojisiyle yoklama almanın en kolay yolu.',
      welcomeBack: 'Hoş Geldiniz',
      loginPrompt: 'Öğrenci veya Öğretmen portalına erişmek için lütfen giriş yapın.',
      email: 'E-posta',
      emailPlaceholder: 'ornek@email.com',
      password: 'Şifre',
      rememberMe: 'Beni Hatırla',
      forgotPassword: 'Şifremi Unuttum',
      login: 'Giriş Yap',
      features: {
        fast: 'Hızlı',
        secure: 'Güvenli',
        easy: 'Kolay'
      },
      lightMode: 'Aydınlık Mod',
      darkMode: 'Karanlık Mod',
      settings: 'Ayarlar',
      apiUrl: 'API Adresi',
      save: 'Kaydet',
      registerStudent: 'Öğrenci Kayıt',
      registerTitle: 'Öğrenci Kayıt Formu',
      registerDescription: 'Lütfen aşağıdaki bilgileri doldurarak hesabınızı oluşturun.',
      registerCtaTitle: 'Yeni Öğrenci misiniz?',
      registerCtaDescription: 'Hemen kaydolarak derslerinize erişin ve yoklama işlemlerinizi kolaylaştırın.',
      modal: {
        personalInfo: 'Kişisel Bilgiler',
        facePhoto: 'Yüz Fotoğrafı',
        selectCourses: 'Ders Seçin',
        noPhotoSelected: 'Fotoğraf seçilmedi veya kamera kapalı.',
        noCoursesAvailable: 'Listelemek için ders bulunamadı.',
      },
      form: {
        firstName: 'Adı',
        lastName: 'Soyadı',
        email: 'E-posta',
        password: 'Şifre',
        studentNumber: 'Öğrenci Numarası',
        department: 'Bölüm',
      },
      placeholders: {
        firstName: "Adı",
        lastName: "Soyadı",
        email: "john.doe@example.edu",
        studentNumber: "2024123456",
        department: "Bilgisayar Mühendisliği",
      },
      buttons: {
        closeCamera: 'Kamera Kapat',
        openCamera: 'Kamera Aç',
        uploadPhoto: 'Dosya Yükle (.jpg, .png)',
        takePhoto: 'Fotoğraf Çek',
        resetPhoto: 'Fotoğrafı Sıfırla',
        registering: 'Kayıt Ediliyor...',
        registerAndEnroll: 'Kayıt ve Kayıt Ol',
        newRegistration: 'Yeni Kayıt',
        close: 'Kapat',
      },
      loading: {
        courses: 'Dersler Yükleniyor...',
      },
      errors: {
        fetchCoursesFailed: 'Dersler yüklenemedi.',
        photoRequired: 'Yüz fotoğrafı yüklenmelidir.',
        courseRequired: 'En az bir ders seçilmelidir.',
        registerFailed: 'Öğrenci kaydı başarısız oldu. Lütfen bilgileri kontrol edin veya daha sonra tekrar deneyin.',
        missingStudentId: 'Kayıt sonrası gerekli bilgiler alınamadı. Lütfen tekrar deneyin.',
        photoUploadFailed: 'Yüz fotoğrafı yükleme başarısız oldu. Dosya formatını veya boyutunu kontrol edin.',
        photoUploadFailedShort: 'Fotoğraf yükleme hatası',
        enrollmentFailedGeneric: 'Kayıt sırasında bir veya daha fazla ders kayıt hatası oluştu.',
        someEnrollmentsFailed: 'Bazı dersler kayıt edilemedi:',
        unknownEnrollmentError: 'Bilinmeyen ders kayıt hatası.',
        enrollmentFailedShort: 'Ders kayıt hatası',
        registerFailedShort: 'Kayıt hatası',
        fileSizeError: "Dosya boyutu 5MB'yi aşamaz.",
        fileTypeError: "Sadece JPG veya PNG dosyaları kabul edilir.",
        cameraAccessError: "Kamera erişimi engellendi veya bir hata oluştu.",
        cameraPlayError: "Kamera başlatılamadı. Sayfayla etkileşim kurmayı deneyin.",
      },
      success: {
        registrationComplete: 'Kayıt tamamlandı!',
      },
      steps: {
        registeringStudent: 'Öğrenci kayıt ediliyor...',
        uploadingPhoto: 'Yüz fotoğrafı yükleniyor...',
        enrollingCourses: 'Dersler kayıt ediliyor...'
      },
      alt: {
        photoPreview: 'Fotoğraf Önizleme'
      }
    },
    en: {
      title: 'Face Recognition Attendance System',
      subtitle: 'Campus Solutions',
      welcome: 'Welcome',
      description: 'The easiest way to take attendance with face recognition technology.',
      welcomeBack: 'Welcome',
      loginPrompt: 'Please sign in to access the Student or Teacher portal.',
      email: 'Email',
      emailPlaceholder: 'example@email.com',
      password: 'Password',
      rememberMe: 'Remember Me',
      forgotPassword: 'Forgot Password',
      login: 'Login',
      features: {
        fast: 'Fast',
        secure: 'Secure',
        easy: 'Easy'
      },
      lightMode: 'Light Mode',
      darkMode: 'Dark Mode',
      settings: 'Settings',
      apiUrl: 'API URL',
      save: 'Save',
      registerStudent: 'Student Register',
      registerTitle: 'Student Registration Form',
      registerDescription: 'Please fill in the information below to create your account.',
      registerCtaTitle: 'New Student?',
      registerCtaDescription: 'Register now to access your courses and simplify attendance tracking.',
      modal: {
        personalInfo: 'Personal Information',
        facePhoto: 'Face Photo',
        selectCourses: 'Select Courses',
        noPhotoSelected: 'No photo selected or camera is off.',
        noCoursesAvailable: 'No courses found to list.',
      },
      form: {
        firstName: 'First Name',
        lastName: 'Last Name',
        email: 'Email',
        password: 'Password',
        studentNumber: 'Student Number',
        department: 'Department',
      },
      placeholders: {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.edu",
        studentNumber: "2024123456",
        department: "Computer Engineering",
      },
      buttons: {
        closeCamera: 'Close Camera',
        openCamera: 'Open Camera',
        uploadPhoto: 'Upload File (.jpg, .png)',
        takePhoto: 'Take Photo',
        resetPhoto: 'Reset Photo',
        registering: 'Registering...',
        registerAndEnroll: 'Register and Enroll',
        newRegistration: 'New Registration',
        close: 'Close',
      },
      loading: {
        courses: 'Loading courses...',
      },
      errors: {
        fetchCoursesFailed: 'Failed to load courses.',
        photoRequired: 'Face photo must be uploaded.',
        courseRequired: 'At least one course must be selected.',
        registerFailed: 'Student registration failed. Please check the information or try again later.',
        missingStudentId: 'Required information could not be retrieved after registration. Please try again.',
        photoUploadFailed: 'Failed to upload face photo. Check file format or size.',
        photoUploadFailedShort: 'Photo upload error',
        enrollmentFailedGeneric: 'Error occurred during enrollment for one or more courses.',
        someEnrollmentsFailed: 'Failed to enroll in some courses:',
        unknownEnrollmentError: 'Unknown course enrollment error.',
        enrollmentFailedShort: 'Course enrollment error',
        registerFailedShort: 'Registration error',
        fileSizeError: "File size cannot exceed 5MB.",
        fileTypeError: "Only JPG or PNG files are accepted.",
        cameraAccessError: "Camera access denied or an error occurred.",
        cameraPlayError: "Could not start camera. Try interacting with the page.",
      },
      success: {
        registrationComplete: 'Registration completed successfully!',
      },
      steps: {
        registeringStudent: 'Registering student...',
        uploadingPhoto: 'Uploading face photo...',
        enrollingCourses: 'Enrolling in courses...'
      },
      alt: {
        photoPreview: 'Photo Preview'
      }
    }
  }

  const t = translations[language]

  const toggleLanguage = () => {
    setLanguage(language === 'tr' ? 'en' : 'tr')
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  // Modal'ı kapatma (state sıfırlama RegisterStudentModal içinde yapılıyor)
  const handleCloseRegisterModal = () => {
    setShowRegisterModal(false);
  };

  // Animasyon varyantları
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.5,
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 100, damping: 15 }
    }
  }

  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.6 } }
  }

  const settingsVariants = {
    hidden: { x: '100%', opacity: 0 },
    visible: { 
      x: 0, 
      opacity: 1,
      transition: { 
        type: 'spring',
        damping: 25,
        stiffness: 300
      }
    },
    exit: { 
      x: '100%', 
      opacity: 0,
      transition: { 
        duration: 0.3
      }
    }
  }

  const logoAnimVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: { 
        type: 'spring',
        damping: 15,
        stiffness: 200 
      }
    }
  }

  // Tema geçiş animasyonu - Daha gelişmiş versiyona güncellendi
  const themeAnimVariants = {
    initial: (theme: string) => ({ 
      rotate: theme === 'dark' ? 0 : 180,
      scale: 0.5,
      opacity: 0 
    }),
    animate: { 
      rotate: 0, 
      scale: 1, 
      opacity: 1,
      transition: { type: 'spring', stiffness: 300, damping: 15 }
    },
    exit: (theme: string) => ({ 
      rotate: theme === 'dark' ? -180 : 180, 
      scale: 0.5, 
      opacity: 0,
      transition: { duration: 0.2 } 
    })
  }

  // Flaglar için stiller
  const flagSize = "w-5 h-5 rounded-full object-cover";

  // Şifre sıfırlama fonksiyonu
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Email doğrulama
    if (!resetEmail || !resetEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setResetError('Lütfen geçerli bir e-posta adresi girin.')
      return
    }
    
    try {
      setResetLoading(true)
      setResetError(null)
      setResetSuccess(null)
      
      const response = await fetch(`${apiUrl}/api/password/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email: resetEmail })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Şifre sıfırlama işlemi sırasında bir hata oluştu.')
      }
      
      setResetSuccess('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.')
      
      // Başarılı sonuçtan 3 saniye sonra popup'ı kapat
      setTimeout(() => {
        setShowForgotPassword(false)
        setResetSuccess(null)
        setResetEmail('')
      }, 3000)
      
    } catch (error: any) {
      setResetError(error.message || 'Şifre sıfırlama işlemi sırasında bir hata oluştu.')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-black">
      {/* Toolbar - Daha yumuşak gölge ve arkaplan */} 
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute right-4 top-4 z-20 flex items-center gap-3"
      >
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleLanguage}
          className="flex items-center gap-2 rounded-full bg-white/50 px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm backdrop-blur-sm transition-all hover:bg-white/70 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-800/70"
        >
          {language === 'tr' ? (
            <>
              <img 
                src="/images/tr-flag.png" 
                alt="Türk Bayrağı" 
                className={flagSize}
              />
              <span className="hidden sm:inline">Türkçe</span>
            </>
          ) : (
            <>
              <img 
                src="/images/en-flag.png" 
                alt="İngiliz Bayrağı" 
                className={flagSize}
              />
              <span className="hidden sm:inline">English</span>
            </>
          )}
        </motion.button>

        {mounted && (
          <ThemeToggleButton theme={theme} toggleTheme={toggleTheme} t={t} />
        )}

        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 rounded-full bg-white/50 p-2 text-sm font-medium text-gray-700 shadow-sm backdrop-blur-sm transition-all hover:bg-white/70 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-800/70"
        >
          <Settings className="h-4 w-4" />
        </motion.button>
      </motion.div>

      {/* Ayarlar Panel - Daha yumuşak gölge ve arkaplan */} 
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={settingsVariants}
            className="absolute right-0 top-0 z-50 h-full w-full max-w-sm border-l border-gray-200/50 bg-white/80 p-6 shadow-xl backdrop-blur-lg dark:border-gray-800/50 dark:bg-gray-950/80"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{t.settings}</h2>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowSettings(false)}
                className="rounded-full p-1 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </motion.button>
            </div>
            
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.apiUrl}</label>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                />
              </div>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={saveApiUrl}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground shadow-md hover:bg-primary/90"
              >
                <Save className="h-4 w-4" />
                {t.save}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay - Daha belirgin */} 
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSettings(false)}
            className="absolute inset-0 z-40 bg-black"
          />
        )}
      </AnimatePresence>

      {/* Sol Bölüm - Daha modern görünüm */} 
      <div className="relative hidden w-2/5 flex-col justify-between bg-gradient-to-br from-primary-600 to-primary-800 p-8 text-white md:flex shadow-2xl">
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={containerVariants} 
          className="relative z-10 flex flex-col h-full"
        >
          {/* Logo ve Başlık Bölümü */}
          <motion.div 
            variants={itemVariants}
            className="mb-10 flex flex-col items-center space-y-8 pt-8"
          >
            {/* Logo ve Face Recognition yazısı yan yana */}
            <div className="flex flex-row items-center gap-4">
              <Image
                src="/images/logo.png"
                alt="Okul Logosu"
                width={100}
                height={100}
                className="object-contain"
              />
              <div className="flex flex-col">
                {/* Light modda koyu renk, dark modda gradient */}
                <h2 className="text-gray-800 font-extrabold tracking-tighter leading-tight text-2xl drop-shadow-sm dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-blue-300 dark:via-purple-200 dark:to-pink-300 dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                  FACE RECOGNITION
                </h2>
                <div className="flex items-center mt-1 mb-1">
                  <div className="h-[2px] w-full bg-gray-700 dark:bg-gradient-to-r dark:from-blue-300 dark:via-purple-200 dark:to-pink-300 rounded-full opacity-80"></div>
                </div>
                <h2 className="text-gray-800 font-bold tracking-tight text-xl drop-shadow-sm dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-blue-300 dark:via-purple-200 dark:to-pink-300 dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                  ATTENDANCE SYSTEM
                </h2>
              </div>
            </div>
          </motion.div>
          
          {/* Okul Resmi - Aspect ratio korunacak şekilde */}
          <motion.div 
            variants={itemVariants}
            className="relative w-full aspect-[1000/561] overflow-hidden rounded-2xl shadow-xl mt-4 mb-8 group"
          >
            <Image
              src="/images/okul.jpg"
              alt="Okul Görüntüsü"
              fill
              className="object-cover object-center transition-transform duration-500 ease-in-out group-hover:scale-105"
              style={{ objectFit: 'contain' }}
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary-800/70 via-transparent to-transparent"></div>
          </motion.div>
          
          <motion.div variants={itemVariants} className="mb-6">
            <p className="text-xl font-bold drop-shadow-sm text-gray-800 dark:text-white">{t.welcome}</p>
            <p className="mt-2 text-gray-700 dark:text-white/90">
              {t.description}
            </p>
            {/* Feature tag'leri - Daha modern görünüm */} 
            <div className="mt-6 flex space-x-3 text-sm">
              {[t.features.fast, t.features.secure, t.features.easy].map((feature, index) => (
                <motion.div 
                  key={index}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="flex items-center gap-1.5 rounded-full bg-white/80 dark:bg-white/10 px-3 py-1 text-gray-700 dark:text-white backdrop-blur-sm border border-gray-300 dark:border-white/20 shadow-sm"
                >
                  <CheckCircle2 className="h-4 w-4 text-primary-600 dark:text-white/90" />
                  <span>{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Arka plan desenler - Daha subtle */}
        <div className="absolute inset-0 overflow-hidden opacity-10">
          <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-xl"></div>
          <div className="absolute bottom-20 right-10 h-60 w-60 rounded-full bg-white/10 blur-xl"></div>
          <div className="absolute -bottom-20 left-40 h-80 w-80 rounded-full bg-white/10 blur-xl"></div>
        </div>
      </div>
      
      {/* Sağ Bölüm - Giriş Formu - Daha iyi ortalama ve animasyon */} 
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants} 
        className="flex w-full flex-1 flex-col items-center justify-center px-6 py-12 md:w-3/5 md:px-16 bg-gray-50 dark:bg-gray-900"
      >
        <div className="mx-auto w-full max-w-sm"> 
          <motion.div variants={itemVariants} className="mb-8 text-center">
            {/* Daha şık başlık */}
            <h2 className="text-4xl font-extrabold tracking-tighter text-gray-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-blue-400 dark:to-emerald-400 mb-3">
              {t.welcomeBack}
            </h2>
             {/* Ayırıcı */}
             <div className="w-20 h-1 bg-gradient-to-r from-primary to-emerald-500 mx-auto mb-4 rounded-full"></div>
            <p className="text-md text-gray-600 dark:text-gray-400">
              {t.loginPrompt}
            </p>
          </motion.div>
          
          {/* Giriş Formu - Elemanlar arası boşluk ayarlandı */}
          <motion.form 
            onSubmit={handleSubmit(onSubmit)} 
            className="space-y-4" 
          >
            {/* E-posta Alanı - Focus efekti eklendi */} 
            <motion.div variants={itemVariants} className="space-y-1">
              <label
                htmlFor="email"
                className="text-sm font-medium text-gray-800 dark:text-gray-200"
              >
                {t.email}
              </label>
              
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </div>
                
                <input
                  id="email"
                  type="email"
                  className={cn(
                    "flex h-11 w-full rounded-md border border-gray-300 bg-white px-3 py-2 pl-10 text-sm text-gray-900 ring-offset-background placeholder:text-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-primary dark:focus:ring-primary/50",
                    errors.email && "border-destructive focus:ring-destructive/50 dark:border-destructive dark:focus:ring-destructive/50"
                  )}
                  placeholder={t.emailPlaceholder}
                  {...register("email")}
                />
              </div>
              
              {errors.email && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-600 dark:text-red-400 pt-1" 
                >
                  {errors.email.message}
                </motion.p>
              )}
            </motion.div>
            
            {/* Şifre Alanı - Focus efekti eklendi */} 
            <motion.div variants={itemVariants} className="space-y-1">
              <label
                htmlFor="password"
                className="text-sm font-medium text-gray-800 dark:text-gray-200"
              >
                {t.password}
              </label>
              
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </div>
                
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className={cn(
                    "flex h-11 w-full rounded-md border border-gray-300 bg-white px-3 py-2 pl-10 pr-10 text-sm text-gray-900 ring-offset-background placeholder:text-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-primary dark:focus:ring-primary/50",
                    errors.password && "border-destructive focus:ring-destructive/50 dark:border-destructive dark:focus:ring-destructive/50"
                  )}
                  placeholder="••••••••"
                  {...register("password")}
                />
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </motion.button>
              </div>
              
              {errors.password && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-600 dark:text-red-400 pt-1"
                >
                  {errors.password.message}
                </motion.p>
              )}
            </motion.div>
            
            {/* Beni Hatırla ve Şifremi Unuttum - Hizalama ve stil güncellendi */} 
            <motion.div variants={itemVariants} className="flex items-center justify-between pt-1">
              <div className="flex items-center space-x-2">
                <input
                  id="rememberMe"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/50 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-primary/50 dark:checked:bg-primary dark:checked:border-primary"
                  {...register("rememberMe")}
                />
                <label
                  htmlFor="rememberMe"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {t.rememberMe}
                </label>
              </div>
              
              <motion.a
                whileHover={{ scale: 1.05, color: '#4F46E5' }}
                href="#"
                className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-blue-400 dark:hover:text-blue-300"
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                  e.preventDefault()
                  setResetError(null);
                  setResetSuccess(null);
                  setShowForgotPassword(true)
                }}
              >
                {t.forgotPassword}
              </motion.a>
            </motion.div>
            
            {/* Hata Mesajı - Stil güncellendi */} 
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300"
              >
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
            
            {/* Giriş Yap Butonu - Stil ve animasyon güncellendi */} 
            <motion.button
              variants={itemVariants}
              whileHover={{ 
                scale: 1.03, 
                boxShadow: "0 10px 20px -5px rgba(99, 102, 241, 0.4)" 
              }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-primary to-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:from-primary-600 hover:to-primary-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:pointer-events-none disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>{t.loading.courses}</span>
                </>
              ) : (
                <>
                  <span>{t.login}</span>
                  <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
                </>
              )}
            </motion.button>
          </motion.form>

          {/* Öğrenci Kayıt Ol Butonu/Linki -> Kutu İçine Alındı */}
          <motion.div
            variants={itemVariants}
            className="mt-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-5 text-center shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-2">{t.registerCtaTitle}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t.registerCtaDescription}</p>
            <motion.button
              onClick={() => setShowRegisterModal(true)}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-gradient-to-r from-green-500 to-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-md transition-all hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              whileHover={{ scale: 1.05, boxShadow: "0px 5px 15px rgba(74, 222, 128, 0.4)" }}
              whileTap={{ scale: 0.98 }}
            >
              <UserPlus className="h-4 w-4" />
              {t.registerStudent}
            </motion.button>
          </motion.div>

        </div>
      </motion.div>

      {/* Şifre Sıfırlama Modal */} 
      <AnimatePresence>
        {showForgotPassword && (
          <>
            {/* Modal Overlay - Kapatma eventi burada */} 
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForgotPassword(false)}
              className="fixed inset-0 z-[60] bg-black"
            />
            
            {/* Modal İçeriği */} 
            <motion.div
              key="forgot-password-modal"
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ type: "spring", damping: 15, stiffness: 200 }}
              className="fixed left-1/2 top-1/2 z-[70] w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800"
            >
              {/* Kapatma Butonu - Doğru onClick */} 
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowForgotPassword(false)}
                className="absolute right-3 top-3 rounded-full p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                aria-label="Kapat"
              >
                <X className="h-5 w-5" />
              </motion.button>

              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Şifremi Unuttum
                </h2>
              </div>
              
              <p className="mb-5 text-sm text-gray-700 dark:text-gray-300">
                E-posta adresinizi girin. Şifre sıfırlama talimatlarını içeren bir bağlantı göndereceğiz.
              </p>
              
              {/* Başarı mesajı - Stil güncellendi */} 
              {resetSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300"
                >
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                  <span>{resetSuccess}</span>
                </motion.div>
              )}
              
              {/* Hata mesajı - Stil güncellendi */} 
              {resetError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300"
                >
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span>{resetError}</span>
                </motion.div>
              )}
              
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-1">
                  <label
                    htmlFor="reset-email"
                    className="text-sm font-medium text-gray-800 dark:text-gray-200"
                  >
                    E-posta
                  </label>
                  
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Mail className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    
                    <input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3 py-2 pl-10 text-sm text-gray-900 ring-offset-background placeholder:text-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-primary dark:focus:ring-primary/50"
                      placeholder="ornek@email.com"
                      required
                    />
                  </div>
                </div>
                
                {/* Şifremi Sıfırla Butonu - Stil güncellendi */} 
                <motion.button
                  whileHover={{ 
                    scale: 1.03, 
                    boxShadow: "0 10px 20px -5px rgba(99, 102, 241, 0.4)"
                  }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={resetLoading}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-primary to-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:from-primary-600 hover:to-primary-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:pointer-events-none disabled:opacity-60"
                >
                  {resetLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>İşleniyor...</span>
                    </>
                  ) : (
                    <>
                      <span>Şifremi Sıfırla</span>
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Yeni Öğrenci Kayıt Modal'ı */}
      <RegisterStudentModal
         isOpen={showRegisterModal}
         onClose={handleCloseRegisterModal}
         apiUrl={apiUrl}
         t={t}
      />

    </div>
  )
} 