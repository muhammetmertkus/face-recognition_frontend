"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import { useTheme } from 'next-themes'
import { PlusCircle, Edit, Trash2, RefreshCcw, Globe, ArrowLeft, Search, Filter, Calendar, Clock, Book, Loader2, X, ChevronDown, ChevronUp, Save } from 'lucide-react'

// API'den gelen ders zamanı tipi
type LessonTime = {
  day: string;
  start_time: string;
  end_time: string;
  lesson_number: number;
}

// API'den gelen kullanıcı tipi
type User = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// API'den gelen öğretmen tipi
type Teacher = {
  id: number;
  user_id: number;
  department: string;
  title: string;
  created_at: string;
  updated_at: string;
  user: User;
}

// API'den gelen ders tipi
type Course = {
  id: number;
  code: string;
  name: string;
  semester: string;
  teacher_id: number;
  teacher: Teacher;
  lesson_times: LessonTime[];
  created_at: string;
  updated_at: string;
}

// Çeviriler
const translations = {
  tr: {
    courses: "Dersler",
    description: "Tüm derslerinizi yönetin, düzenleyin veya yeni dersler ekleyin.",
    createNewCourse: "Yeni Ders Oluştur",
    dashboard: "Panele Dön",
    search: "Ders ara...",
    allCourses: "Tüm Dersler",
    courseCode: "Ders Kodu",
    courseName: "Ders Adı",
    semester: "Dönem",
    actions: "İşlemler",
    edit: "Düzenle",
    delete: "Sil",
    confirmDelete: "Silmek istediğinize emin misiniz?",
    cancel: "İptal",
    yes: "Evet, Sil",
    loading: "Yükleniyor...",
    loadingCourses: "Dersler yükleniyor...",
    refreshCourses: "Dersleri Yenile",
    noCourses: "Hiç ders bulunamadı.",
    createFirst: "İlk dersinizi oluşturun!",
    courseDeleted: "Ders başarıyla silindi.",
    error: "Hata",
    deleteError: "Ders silinirken bir hata oluştu.",
    timeDetails: "Ders Zamanı: {day}, {start} - {end}",
    networkError: "Ağ hatası. Lütfen bağlantınızı kontrol edin.",
    noLessonTimes: "Belirlenmiş ders zamanı yok",
    filter: "Filtrele",
    sortBy: "Sırala",
    ascending: "Artan",
    descending: "Azalan",
    days: {
      MONDAY: "Pazartesi",
      TUESDAY: "Salı",
      WEDNESDAY: "Çarşamba",
      THURSDAY: "Perşembe",
      FRIDAY: "Cuma",
      SATURDAY: "Cumartesi",
      SUNDAY: "Pazar"
    }
  },
  en: {
    courses: "Courses",
    description: "Manage all your courses, edit them or create new ones.",
    createNewCourse: "Create New Course",
    dashboard: "Back to Dashboard",
    search: "Search courses...",
    allCourses: "All Courses",
    courseCode: "Course Code",
    courseName: "Course Name",
    semester: "Semester",
    actions: "Actions",
    edit: "Edit",
    delete: "Delete",
    confirmDelete: "Are you sure you want to delete?",
    cancel: "Cancel",
    yes: "Yes, Delete",
    loading: "Loading...",
    loadingCourses: "Loading courses...",
    refreshCourses: "Refresh Courses",
    noCourses: "No courses found.",
    createFirst: "Create your first course!",
    courseDeleted: "Course successfully deleted.",
    error: "Error",
    deleteError: "Error deleting the course.",
    timeDetails: "Time: {day}, {start} - {end}",
    networkError: "Network error. Please check your connection.",
    noLessonTimes: "No lesson times defined",
    filter: "Filter",
    sortBy: "Sort by",
    ascending: "Ascending",
    descending: "Descending",
    days: {
      MONDAY: "Monday",
      TUESDAY: "Tuesday",
      WEDNESDAY: "Wednesday",
      THURSDAY: "Thursday",
      FRIDAY: "Friday",
      SATURDAY: "Saturday",
      SUNDAY: "Sunday"
    }
  }
};

export default function CoursesPage() {
  const { token, apiUrl, user, teacherId } = useAuth()
  const router = useRouter()
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [language, setLanguage] = useState<'tr' | 'en'>('tr')
  
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ visible: boolean, message: string, type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success'
  })
  const [sortField, setSortField] = useState<'code' | 'name' | 'semester'>('code')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  // Düzenleme modalı için state'ler
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [updatedCourse, setUpdatedCourse] = useState<{
    code: string;
    name: string;
    semester: string;
    lesson_times: {
      day: string;
      start_time: string;
      end_time: string;
      lesson_number: number;
    }[];
  } | null>(null)

  // Çeviriler
  const t = translations[language]

  // Lisan değiştirme
  const toggleLanguage = () => {
    setLanguage(prev => prev === 'tr' ? 'en' : 'tr')
  }

  // Bildirimi göster
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type })
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 5000)
  }

  // Client tarafında render garantisi
  useEffect(() => {
    setMounted(true)
  }, [])

  // Dersleri getir
  const fetchCourses = async () => {
    setLoading(true)

    if (!teacherId) {
      setError("Öğretmen ID'si bulunamadı. Lütfen tekrar giriş yapın.")
      setLoading(false)
      return
    }

    console.log("Fetching courses with teacherId:", teacherId)

    try {
      const response = await fetch(`${apiUrl}/api/teachers/${teacherId}/courses`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        }
      })

      if (!response.ok) {
        let errorMsg = `HTTP Hata: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.detail || errorData.message || errorMsg;
        } catch(e) { /* JSON parse error */ }
        throw new Error(errorMsg)
      }

      const data = await response.json()
      console.log("Fetched Courses:", data);
      setCourses(data)
    } catch (error: any) {
      console.error("Dersler yüklenirken hata:", error)
      setError(error.message || t.networkError)
    } finally {
      setLoading(false)
    }
  }

  // Sayfaya ilk girişte dersleri yükle
  useEffect(() => {
    if (token && teacherId) {
      fetchCourses()
    }
  }, [token, apiUrl, teacherId])

  // Ders silme işlemi
  const deleteCourse = async (id: number) => {
    if (!token) return

    setIsDeleting(true)
    try {
      const response = await fetch(`${apiUrl}/api/courses/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP Hata: ${response.status}`)
      }

      // Başarılı silme işleminden sonra listeyi güncelle
      setCourses(prevCourses => prevCourses.filter(course => course.id !== id))
      showToast(t.courseDeleted, 'success')
    } catch (error) {
      console.error("Ders silinirken hata:", error)
      showToast(t.deleteError, 'error')
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  // Arama ve sıralama için filtrelenmiş dersleri hesapla
  const filteredCourses = courses
    .filter(course => {
      const searchLower = searchTerm.toLowerCase()
      return (
        course.code.toLowerCase().includes(searchLower) ||
        course.name.toLowerCase().includes(searchLower) ||
        course.semester.toLowerCase().includes(searchLower)
      )
    })
    .sort((a, b) => {
      const fieldA = a[sortField].toLowerCase()
      const fieldB = b[sortField].toLowerCase()
      
      if (sortDirection === 'asc') {
        return fieldA.localeCompare(fieldB)
      } else {
        return fieldB.localeCompare(fieldA)
      }
    })

  // Sıralama yönünü değiştir
  const toggleSort = (field: 'code' | 'name' | 'semester') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Düzenleme modalını açma
  const openEditModal = (course: Course) => {
    setEditingCourse(course)
    // Ders bilgilerini form için hazırla
    setUpdatedCourse({
      code: course.code,
      name: course.name,
      semester: course.semester,
      lesson_times: course.lesson_times?.length 
        ? [...course.lesson_times] 
        : [{ day: "MONDAY", start_time: "09:00", end_time: "10:00", lesson_number: 1 }]
    })
    setIsEditing(false)
  }

  // Ders zamanı ekleme
  const addLessonTime = () => {
    if (updatedCourse) {
      setUpdatedCourse({
        ...updatedCourse,
        lesson_times: [
          ...updatedCourse.lesson_times,
          { day: "MONDAY", start_time: "09:00", end_time: "10:00", lesson_number: updatedCourse.lesson_times.length + 1 }
        ]
      })
    }
  }

  // Ders zamanı kaldırma
  const removeLessonTime = (index: number) => {
    if (updatedCourse) {
      const updatedTimes = [...updatedCourse.lesson_times]
      updatedTimes.splice(index, 1)
      // Ders numaralarını güncelle
      updatedTimes.forEach((time, idx) => {
        time.lesson_number = idx + 1
      })
      setUpdatedCourse({
        ...updatedCourse,
        lesson_times: updatedTimes
      })
    }
  }

  // Ders zamanı güncelleme
  const updateLessonTime = (index: number, field: string, value: string) => {
    if (updatedCourse) {
      const updatedTimes = [...updatedCourse.lesson_times]
      updatedTimes[index] = {
        ...updatedTimes[index],
        [field]: value
      }
      setUpdatedCourse({
        ...updatedCourse,
        lesson_times: updatedTimes
      })
    }
  }

  // Dersi güncelleme
  const updateCourse = async () => {
    if (!token || !editingCourse || !updatedCourse) return

    setIsEditing(true)
    try {
      const response = await fetch(`${apiUrl}/api/courses/${editingCourse.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(updatedCourse)
      })

      if (!response.ok) {
        throw new Error(`HTTP Hata: ${response.status}`)
      }

      const updatedData = await response.json()
      
      // Ders listesini güncelle
      setCourses(prevCourses => 
        prevCourses.map(course => 
          course.id === editingCourse.id ? updatedData : course
        )
      )
      
      // Modalı kapat ve başarı mesajı göster
      setEditingCourse(null)
      showToast("Ders başarıyla güncellendi", 'success')
    } catch (error) {
      console.error("Ders güncellenirken hata:", error)
      showToast("Ders güncellenirken bir hata oluştu", 'error')
    } finally {
      setIsEditing(false)
    }
  }

  // Henüz istemci tarafında yüklenmemişse, boş döndür (hydration hatalarından kaçınmak için)
  if (!mounted) return null

  return (
    <div className="container mx-auto px-4 py-8 bg-white dark:bg-gray-900 min-h-screen">
      {/* Dil değiştirme butonu */}
      <button 
        onClick={toggleLanguage}
        className="fixed top-4 right-4 p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all z-40"
        aria-label="Change language"
      >
        <Globe className="h-5 w-5 text-gray-700 dark:text-gray-300" />
      </button>

      {/* Toast bildirimi */}
      {toast.visible && (
        <div 
          className={`fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-md z-50 ${
            toast.type === 'success' 
              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100' 
              : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100'
          } shadow-lg`}
        >
          <div className="flex items-center">
            {toast.type === 'success' ? (
              <div className="mr-2 rounded-full bg-green-200 dark:bg-green-800 p-1">
                <svg className="h-3 w-3 text-green-600 dark:text-green-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                </svg>
              </div>
            ) : (
              <div className="mr-2 rounded-full bg-red-200 dark:bg-red-800 p-1">
                <svg className="h-3 w-3 text-red-600 dark:text-red-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
                </svg>
              </div>
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Ders silme onay modalı */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t.confirmDelete}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {courses.find(c => c.id === deleteId)?.name}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => deleteCourse(deleteId)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? t.loading : t.yes}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ders düzenleme modalı */}
      {editingCourse && updatedCourse && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                {t.edit}: {editingCourse.name}
              </h3>
              <button 
                onClick={() => setEditingCourse(null)}
                className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Ders Kodu */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t.courseCode}
                </label>
                <input 
                  type="text"
                  value={updatedCourse.code}
                  onChange={(e) => setUpdatedCourse({...updatedCourse, code: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              
              {/* Ders Adı */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t.courseName}
                </label>
                <input 
                  type="text"
                  value={updatedCourse.name}
                  onChange={(e) => setUpdatedCourse({...updatedCourse, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              
              {/* Dönem */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t.semester}
                </label>
                <input 
                  type="text"
                  value={updatedCourse.semester}
                  onChange={(e) => setUpdatedCourse({...updatedCourse, semester: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              
              {/* Ders Zamanları */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Ders Zamanları
                  </label>
                  <button
                    type="button"
                    onClick={addLessonTime}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-800/30"
                  >
                    <PlusCircle className="h-4 w-4 mr-1" />
                    Zaman Ekle
                  </button>
                </div>
                
                {updatedCourse.lesson_times.map((time, index) => (
                  <div key={index} className="p-3 mb-3 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800/70">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Ders #{index + 1}</span>
                      <button
                        onClick={() => removeLessonTime(index)}
                        className="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Gün */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Gün
                        </label>
                        <select
                          value={time.day}
                          onChange={(e) => updateLessonTime(index, 'day', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        >
                          {Object.keys(t.days).map(day => (
                            <option key={day} value={day}>
                              {t.days[day as keyof typeof t.days]}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Başlangıç Saati */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Başlangıç Saati
                        </label>
                        <input 
                          type="time"
                          value={time.start_time}
                          onChange={(e) => updateLessonTime(index, 'start_time', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      
                      {/* Bitiş Saati */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Bitiş Saati
                        </label>
                        <input 
                          type="time"
                          value={time.end_time}
                          onChange={(e) => updateLessonTime(index, 'end_time', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Butonlar */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setEditingCourse(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={updateCourse}
                  disabled={isEditing}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
                >
                  {isEditing ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Kaydet
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Üst Bölüm - Başlık ve Butonlar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.courses}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t.description}</p>
        </div>
        <div className="flex mt-4 md:mt-0 space-x-3">
          <Link
            href="/dashboard/teacher"
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 inline-flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t.dashboard}
          </Link>
          <Link
            href="/dashboard/teacher/courses/new"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 inline-flex items-center"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            {t.createNewCourse}
          </Link>
        </div>
      </div>

      {/* Arama ve Filtreleme */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 pl-10 pr-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border"
            placeholder={t.search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => toggleSort('code')}
            className={`inline-flex items-center px-3 py-2 border ${
              sortField === 'code' ? 'border-blue-500 dark:border-blue-400 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800'
            } rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700`}
          >
            {t.courseCode}
            {sortField === 'code' && (
              sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
            )}
          </button>

          <button
            onClick={() => toggleSort('name')}
            className={`inline-flex items-center px-3 py-2 border ${
              sortField === 'name' ? 'border-blue-500 dark:border-blue-400 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800'
            } rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700`}
          >
            {t.courseName}
            {sortField === 'name' && (
              sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
            )}
          </button>

          <button
            onClick={() => toggleSort('semester')}
            className={`inline-flex items-center px-3 py-2 border ${
              sortField === 'semester' ? 'border-blue-500 dark:border-blue-400 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800'
            } rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700`}
          >
            {t.semester}
            {sortField === 'semester' && (
              sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
            )}
          </button>

          <button
            onClick={fetchCourses}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
            title={t.refreshCourses}
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Dersler Listesi */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">{t.loadingCourses}</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 p-4 rounded-md">
          <p>{error}</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <Book className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t.noCourses}</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{searchTerm ? "Arama kriterlerine uygun ders bulunamadı." : ""}</p>
          {!searchTerm && (
            <Link
              href="/dashboard/teacher/courses/new"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              {t.createFirst}
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map(course => (
            <div key={course.id} className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-5">
                <div className="flex justify-between">
                  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    {course.code}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {course.semester}
                  </div>
                </div>
                <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">{course.name}</h3>
                
                <div className="mt-4 space-y-2">
                  {course.lesson_times && course.lesson_times.length > 0 ? (
                    course.lesson_times.map((time, idx) => (
                      <div key={idx} className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <Calendar className="h-4 w-4 mr-1 flex-shrink-0" />
                        <span>{t.days[time.day as keyof typeof t.days]}</span>
                        <Clock className="h-4 w-4 mx-1 flex-shrink-0" />
                        <span>{time.start_time} - {time.end_time}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500 dark:text-gray-400 italic">{t.noLessonTimes}</div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {course.teacher?.user?.first_name} {course.teacher?.user?.last_name}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openEditModal(course)}
                      className="inline-flex items-center p-1.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                      title={t.edit}
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(course.id)}
                      className="inline-flex items-center p-1.5 text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded-md hover:bg-red-200 dark:hover:bg-red-800/30"
                      title={t.delete}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 