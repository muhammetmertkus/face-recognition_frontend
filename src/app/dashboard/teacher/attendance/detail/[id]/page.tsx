"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import {
  Calendar,
  Clock,
  ArrowLeft,
  Download,
  FileText,
  Check,
  X,
  User,
  UserCheck,
  UserX,
  Loader2,
  Edit,
  Save,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react'

type Student = {
  id: number;
  student_number: string;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
};

type AttendanceDetail = {
  id: number;
  attendance_id: number;
  student_id: number;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  confidence: number | null;
  emotion: string | null;
  estimated_age: number | null;
  estimated_gender: string | null;
  created_at: string;
  updated_at: string;
  student: Student;
};

type AttendanceRecord = {
  id: number;
  course_id: number;
  date: string;
  lesson_number: number;
  type: string;
  photo_path: string;
  total_students: number;
  recognized_students: number;
  unrecognized_students: number;
  emotion_statistics: {
    [key: string]: number;
  };
  created_by: number;
  created_at: string;
  updated_at: string;
  details: AttendanceDetail[];
};

export default function AttendanceDetailPage() {
  const { token, apiUrl } = useAuth()
  const params = useParams()
  const router = useRouter()
  const attendanceId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showImage, setShowImage] = useState(false)
  const [editing, setEditing] = useState<{ [key: number]: boolean }>({})
  const [updatedStatus, setUpdatedStatus] = useState<{ [key: number]: string }>({})
  const [updating, setUpdating] = useState<{ [key: number]: boolean }>({})
  const [updateSuccess, setUpdateSuccess] = useState<{ [key: number]: boolean }>({})

  // Tüm yoklama kayıtlarını getir
  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!token) return
      
      if (!attendanceId || attendanceId === 'undefined') {
        setLoading(false);
        setError('Geçersiz yoklama ID. Lütfen geçerli bir yoklama seçin.');
        return;
      }

      try {
        setLoading(true)
        const response = await fetch(`${apiUrl}/api/attendance/${attendanceId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`Yoklama detayları yüklenirken hata: ${response.status}`)
        }

        const data = await response.json()
        setAttendance(data)
      } catch (error) {
        console.error('Yoklama detayları yüklenirken hata:', error)
        setError('Yoklama detayları yüklenemedi. Lütfen daha sonra tekrar deneyin.')
      } finally {
        setLoading(false)
      }
    }

    fetchAttendanceData()
  }, [token, apiUrl, attendanceId])

  // Tarih dönüştürme: 2024-03-15 -> 15.03.2024
  const formatDate = (dateString: string) => {
    if (!dateString) return '-'; // undefined veya null ise güvenli bir değer döndür
    try {
      const [year, month, day] = dateString.split('-')
      if (!year || !month || !day) return dateString; // eksik veri varsa orijinal string'i döndür
      return `${day}.${month}.${year}`
    } catch (error) {
      console.error('Tarih biçimlendirme hatası:', error);
      return dateString; // hata durumunda orijinal string'i döndür
    }
  }

  // Türkçe gün adı dönüştürme
  const getDayName = (dateString: string) => {
    if (!dateString) return '-'; // undefined veya null ise güvenli bir değer döndür
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return '-'; // Geçersiz tarih kontrolü
      const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
      return days[date.getDay()]
    } catch (error) {
      console.error('Gün adı belirleme hatası:', error);
      return '-';
    }
  }

  // Arama filtreleme
  const filteredStudents = attendance?.details.filter(detail => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    return (
      detail.student.user.first_name.toLowerCase().includes(searchLower) ||
      detail.student.user.last_name.toLowerCase().includes(searchLower) ||
      detail.student.student_number.toLowerCase().includes(searchLower) ||
      `${detail.student.user.first_name} ${detail.student.user.last_name}`.toLowerCase().includes(searchLower)
    )
  }) || []

  // Düzenleme modunu aç/kapat
  const toggleEdit = (studentId: number) => {
    setEditing(prev => {
      const newState = { ...prev }
      newState[studentId] = !prev[studentId]
      
      // İlk durum değerini ayarla
      if (newState[studentId]) {
        const student = attendance?.details.find(d => d.student_id === studentId)
        if (student) {
          setUpdatedStatus(prev => ({
            ...prev,
            [studentId]: student.status
          }))
        }
      }
      
      return newState
    })
    
    // Güncelleme işlemi bitti mi mesajını temizle
    setUpdateSuccess(prev => {
      const newState = { ...prev }
      delete newState[studentId]
      return newState
    })
  }

  // Öğrenci durumunu güncelle
  const updateStudentStatus = async (studentId: number) => {
    if (!token || !attendance) return
    
    setUpdating(prev => ({ ...prev, [studentId]: true }))
    
    try {
      const response = await fetch(`${apiUrl}/api/attendance/${attendance.id}/students/${studentId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          status: updatedStatus[studentId]
        })
      })

      if (!response.ok) {
        throw new Error(`Öğrenci durumu güncellenirken hata: ${response.status}`)
      }

      const updatedStudent = await response.json()
      
      // Yoklama verilerini güncelle
      setAttendance(prev => {
        if (!prev) return prev
        
        return {
          ...prev,
          details: prev.details.map(detail => 
            detail.student_id === studentId ? { ...detail, status: updatedStudent.status } : detail
          )
        }
      })
      
      // Güncelleme başarılı mesajını göster
      setUpdateSuccess(prev => ({ ...prev, [studentId]: true }))
      
      // Düzenleme modunu kapat
      setTimeout(() => {
        setEditing(prev => {
          const newState = { ...prev }
          delete newState[studentId]
          return newState
        })
      }, 2000)
      
    } catch (error) {
      console.error('Öğrenci durumu güncellenirken hata:', error)
      alert('Öğrenci durumu güncellenemedi. Lütfen daha sonra tekrar deneyin.')
    } finally {
      setUpdating(prev => {
        const newState = { ...prev }
        delete newState[studentId]
        return newState
      })
    }
  }

  // İstatistikleri hesapla
  const stats = {
    present: attendance?.details.filter(d => d.status === 'PRESENT').length || 0,
    absent: attendance?.details.filter(d => d.status === 'ABSENT').length || 0,
    late: attendance?.details.filter(d => d.status === 'LATE').length || 0,
    excused: attendance?.details.filter(d => d.status === 'EXCUSED').length || 0,
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Başlık */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Geri Dön
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Yoklama Detayları</h1>
          {attendance && (
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              {formatDate(attendance.date)} ({getDayName(attendance.date)}) - {attendance.lesson_number}. Ders
            </p>
          )}
        </div>
        
        {attendance?.photo_path && (
          <button
            onClick={() => setShowImage(!showImage)}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <ImageIcon className="mr-2 h-4 w-4" />
            {showImage ? 'Fotoğrafı Gizle' : 'Fotoğrafı Göster'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
          <span>Veriler yükleniyor...</span>
        </div>
      ) : error ? (
        <div className="mb-6 rounded-md bg-red-50 p-4 dark:bg-red-900/20">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 dark:text-red-500" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Hata</h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</div>
            </div>
          </div>
        </div>
      ) : attendance ? (
        <>
          {/* Fotoğraf Gösterimi (İsteğe bağlı) */}
          {showImage && attendance.photo_path && (
            <div className="mb-6 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
              <img 
                src={`${apiUrl}${attendance.photo_path}`} 
                alt="Yoklama Fotoğrafı" 
                className="mx-auto max-h-[400px] object-contain"
              />
            </div>
          )}
          
          {/* Özet */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">Yoklama Tipi</h3>
              <div className="flex items-center">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                  attendance.type === 'FACE' 
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' 
                    : attendance.type === 'EMOTION'
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                    : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                }`}>
                  {attendance.type === 'FACE' 
                    ? 'Yüz Tanıma' 
                    : attendance.type === 'EMOTION'
                    ? 'Duygu Analizi'
                    : 'Yüz + Duygu'
                  }
                </span>
              </div>
            </div>
            
            <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">Toplam Öğrenci</h3>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{attendance.total_students}</p>
            </div>
            
            <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">Derse Katılım</h3>
              <div className="flex items-center">
                <span className="text-2xl font-semibold text-green-600 dark:text-green-400">{stats.present}</span>
                <span className="mx-1 text-gray-400">/</span>
                <span className="text-2xl font-semibold text-gray-900 dark:text-white">{attendance.total_students}</span>
              </div>
            </div>
            
            <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">Katılım Oranı</h3>
              <div className="flex items-center">
                <div className="relative h-2 w-24 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
                  <div
                    className={`absolute h-2 ${
                      (stats.present / attendance.total_students) >= 0.9
                        ? 'bg-green-500'
                        : (stats.present / attendance.total_students) >= 0.75
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${(stats.present / attendance.total_students) * 100}%` }}
                  ></div>
                </div>
                <span className="ml-2 text-lg font-semibold text-gray-900 dark:text-white">
                  %{Math.round((stats.present / attendance.total_students) * 100)}
                </span>
              </div>
            </div>
            
            <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">Yoklama Zamanı</h3>
              <p className="text-sm text-gray-900 dark:text-white">
                {new Date(attendance.created_at).toLocaleString('tr-TR')}
              </p>
            </div>
          </div>
          
          {/* Duygu İstatistikleri */}
          {(attendance.type === 'EMOTION' || attendance.type === 'FACE_EMOTION') && attendance.emotion_statistics && (
            <div className="mb-6">
              <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Duygu Analizi</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
                {Object.entries(attendance.emotion_statistics).map(([emotion, count]) => (
                  <div key={emotion} className="rounded-lg border bg-white p-4 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="mb-2 text-sm font-medium capitalize text-gray-500 dark:text-gray-400">{emotion}</h3>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">{count}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Öğrenci Listesi */}
          <div className="mb-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Öğrenci Listesi</h2>
              <div className="relative w-64">
                <input
                  type="text"
                  placeholder="Öğrenci ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                />
              </div>
            </div>
            
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Öğrenci
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Öğrenci Numarası
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Durum
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Güven Oranı
                      </th>
                      {(attendance.type === 'EMOTION' || attendance.type === 'FACE_EMOTION') && (
                        <>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Duygu
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Tahmini Yaş
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Cinsiyet
                          </th>
                        </>
                      )}
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                    {filteredStudents.map((detail) => (
                      <tr key={detail.student_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center">
                            <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gray-200 dark:bg-gray-700">
                              <div className="flex h-full w-full items-center justify-center">
                                <span className="text-xs font-medium uppercase text-gray-600 dark:text-gray-300">
                                  {detail.student.user.first_name[0]}{detail.student.user.last_name[0]}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {detail.student.user.first_name} {detail.student.user.last_name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {detail.student.user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {detail.student.student_number}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          {editing[detail.student_id] ? (
                            <div className="flex items-center space-x-2">
                              <select
                                value={updatedStatus[detail.student_id]}
                                onChange={(e) => setUpdatedStatus(prev => ({
                                  ...prev,
                                  [detail.student_id]: e.target.value
                                }))}
                                className="rounded-md border border-gray-300 bg-white py-1 pl-3 pr-10 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                              >
                                <option value="PRESENT">Var</option>
                                <option value="ABSENT">Yok</option>
                                <option value="LATE">Geç</option>
                                <option value="EXCUSED">İzinli</option>
                              </select>
                              {updating[detail.student_id] ? (
                                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                              ) : updateSuccess[detail.student_id] ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : null}
                            </div>
                          ) : (
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              detail.status === 'PRESENT' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                                : detail.status === 'ABSENT'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                : detail.status === 'LATE'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                            }`}>
                              {detail.status === 'PRESENT' 
                                ? 'Var' 
                                : detail.status === 'ABSENT'
                                ? 'Yok'
                                : detail.status === 'LATE'
                                ? 'Geç'
                                : 'İzinli'
                              }
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {detail.confidence !== null ? `%${Math.round(detail.confidence * 100)}` : '-'}
                        </td>
                        {(attendance.type === 'EMOTION' || attendance.type === 'FACE_EMOTION') && (
                          <>
                            <td className="whitespace-nowrap px-6 py-4 text-sm capitalize text-gray-900 dark:text-white">
                              {detail.emotion || '-'}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                              {detail.estimated_age || '-'}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                              {detail.estimated_gender === 'Woman' ? 'Kadın' : 
                               detail.estimated_gender === 'Man' ? 'Erkek' : '-'}
                            </td>
                          </>
                        )}
                        <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium">
                          {editing[detail.student_id] ? (
                            <button
                              onClick={() => updateStudentStatus(detail.student_id)}
                              disabled={updating[detail.student_id]}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              {updating[detail.student_id] ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleEdit(detail.student_id)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
} 