"use client"

import React, { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import {
  Camera, Upload, Image, RefreshCcw, Check, X, UserCheck, UserX,
  AlertCircle, ChevronDown, CalendarIcon, Clock, ArrowLeft, Save, Loader2
} from 'lucide-react'

// Type definitions (same as before)
type Course = {
  id: number;
  code: string;
  name: string;
  semester: string;
}

type FormData = {
  courseId: number | null;
  date: string;
  lessonNumber: number;
  type: 'FACE' | 'EMOTION' | 'FACE_EMOTION';
}

type ProcessedStudent = {
  student_id: number;
  status: 'PRESENT' | 'ABSENT';
  confidence: number;
  emotion?: string;
  estimated_age?: number;
  estimated_gender?: string;
  first_name?: string;
  last_name?: string;
  student_number?: string;
}

type AttendanceResult = {
  attendance_id: number;
  recognized_count: number;
  unrecognized_count: number;
  emotion_statistics?: {
    [key: string]: number;
  };
  results: ProcessedStudent[];
}

export default function NewAttendancePage() {
  const { token, apiUrl, user, teacherId } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State variables (same as before)
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [streamActive, setStreamActive] = useState(false)
  const [photoTaken, setPhotoTaken] = useState<string | null>(null)
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [attendanceResult, setAttendanceResult] = useState<AttendanceResult | null>(null)

  const [formData, setFormData] = useState<FormData>({
    courseId: null,
    date: new Date().toISOString().split('T')[0],
    lessonNumber: 1,
    type: 'FACE'
  })

  const mediaStreamRef = useRef<MediaStream | null>(null)

  // useEffect hooks for fetching data and handling URL params (same as before)
  useEffect(() => {
    const courseId = searchParams.get('course')
    const date = searchParams.get('date')
    if (courseId) {
      setFormData(prev => ({ ...prev, courseId: parseInt(courseId) }))
    }
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setFormData(prev => ({ ...prev, date }))
    }
  }, [searchParams])

  useEffect(() => {
    const fetchCourses = async () => {
      if (!token || !teacherId) return
      try {
        setLoading(true)
        const response = await fetch(`${apiUrl}/api/teachers/${teacherId}/courses`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        })
        if (!response.ok) {
          throw new Error(`Kurslar yüklenirken hata: ${response.status}`)
        }
        const data = await response.json()
        setCourses(data)
      } catch (error) {
        console.error('Kurslar yüklenirken hata:', error)
        setError('Kurslar yüklenemedi. Lütfen daha sonra tekrar deneyin.')
      } finally {
        setLoading(false)
      }
    }
    fetchCourses()
  }, [token, apiUrl, teacherId])

  // Event Handlers (same logic as before)
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'courseId' || name === 'lessonNumber'
        ? (value ? parseInt(value) : null) // Handle empty string for courseId
        : value
    }))
    setError(null); // Clear potential form error on change
  }

  const toggleCamera = async () => {
    setError(null)
    console.log("toggleCamera called. Current state: isCameraOpen =", isCameraOpen); // Log 1

    if (isCameraOpen) {
      console.log("Closing camera..."); // Log 2
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
        mediaStreamRef.current = null
        console.log("Stream tracks stopped."); // Log 3
      }
      setIsCameraOpen(false)
      setStreamActive(false)
      console.log("Camera state set to closed."); // Log 4
      return
    }

    try {
      console.log("Attempting to open camera..."); // Log 5
      setIsCameraOpen(true)
      setStreamActive(false)
      setPhotoTaken(null)
      setImagePreview(null)
      setUploadedImage(null)

      console.log("Requesting user media..."); // Log 6
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Veya sadece { video: true } deneyin
        audio: false
      })
      console.log("getUserMedia successful, stream obtained:", stream); // Log 7

      if (videoRef.current) {
        console.log("videoRef is available. Setting srcObject."); // Log 8
        videoRef.current.srcObject = stream
        mediaStreamRef.current = stream

        videoRef.current.onloadedmetadata = () => {
            console.log("EVENT: onloadedmetadata fired. Setting streamActive = true"); // Log 9
            setStreamActive(true)
        };
         videoRef.current.onerror = (e) => {
             console.error("EVENT: videoRef onerror:", e); // Video element hatasını yakala
             setError("Video elementi yüklenirken bir hata oluştu.");
             setIsCameraOpen(false);
             setStreamActive(false);
         };

      } else {
         console.warn("videoRef.current is null when trying to set srcObject!"); // Log 10
         // Stream'i daha sonra ayarlamayı dene veya hata ver
         setIsCameraOpen(false); // Hata durumu
         setError("Video elementi bulunamadı.");
      }
    } catch (err: any) {
      console.error("ERROR in toggleCamera catch block:", err); // Log 11
      console.error("Error Name:", err.name); // Hatanın adını logla
      console.error("Error Message:", err.message); // Hatanın mesajını logla

      let userFriendlyError = 'Kamera erişim hatası. Lütfen kamera izinlerini kontrol edin.';
       if (err.name === 'NotAllowedError') {
         userFriendlyError = 'Kamera erişimine izin verilmedi. Lütfen tarayıcı ayarlarından izin verin.';
       } else if (err.name === 'NotFoundError') {
         userFriendlyError = 'Kullanılabilir kamera bulunamadı. Cihazınızda arka kamera olmayabilir veya tarayıcı kamerayı göremiyor.';
       } else if (err.name === 'NotReadableError') {
         userFriendlyError = 'Kamera başka bir uygulama tarafından kullanılıyor veya donanımsal bir sorun var.';
       } else if (err.name === 'OverconstrainedError') {
           userFriendlyError = 'İstenen kamera ayarları (örn. arka kamera) desteklenmiyor.';
       }
      setError(userFriendlyError);
      setIsCameraOpen(false);
      setStreamActive(false);
      console.log("Camera state reset due to error."); // Log 12
    }
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && streamActive) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      if (!context) return

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      const photoData = canvas.toDataURL('image/jpeg')
      setPhotoTaken(photoData)
      setError(null)

      // Kamerayı kapat
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
        mediaStreamRef.current = null
      }
      setStreamActive(false)
      // setIsCameraOpen(false); // Keep camera state true to show the captured photo context, or set false if preferred
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null); // Clear previous errors
    if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
      setError('Lütfen sadece JPEG veya PNG formatındaki dosyaları yükleyin.')
      setUploadedImage(null)
      setImagePreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input
      return
    }
     // Size Check (e.g., 5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        setError('Dosya boyutu çok büyük (Maksimum 5MB).');
        setUploadedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input
        return;
    }


    setUploadedImage(file)
    setPhotoTaken(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Kamera açıksa kapat
    if (isCameraOpen && mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
      setIsCameraOpen(false)
      setStreamActive(false)
    }
  }

  const resetImage = () => {
    setPhotoTaken(null)
    setImagePreview(null)
    setUploadedImage(null)
    setError(null)
    if (isCameraOpen && mediaStreamRef.current) { // If camera was open for capture, close it
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
        mediaStreamRef.current = null
        setIsCameraOpen(false)
        setStreamActive(false)
    }
     if (fileInputRef.current) { // Reset file input value
        fileInputRef.current.value = "";
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const createAttendance = async () => {
    if (!token) {
      setError('Oturum süresi dolmuş olabilir. Lütfen tekrar giriş yapın.')
      return
    }
    if (!formData.courseId) {
      setError('Lütfen bir ders seçin.')
      return
    }
    if (!photoTaken && !uploadedImage) {
      setError('Lütfen bir fotoğraf çekin veya yükleyin.')
      return
    }

    setProcessing(true)
    setError(null)
    setSuccess(false)
    setAttendanceResult(null)

    try {
      const attendanceFormDataAPI = new FormData() // Use a different name to avoid conflict
      attendanceFormDataAPI.append('course_id', formData.courseId.toString())
      attendanceFormDataAPI.append('date', formData.date)
      attendanceFormDataAPI.append('lesson_number', formData.lessonNumber.toString())
      attendanceFormDataAPI.append('type', formData.type)

      if (uploadedImage) {
        attendanceFormDataAPI.append('file', uploadedImage)
      } else if (photoTaken) {
        const blob = await (await fetch(photoTaken)).blob()
        const file = new File([blob], `capture_${Date.now()}.jpg`, { type: "image/jpeg" })
        attendanceFormDataAPI.append('file', file)
      }

      const response = await fetch(`${apiUrl}/api/attendance/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: attendanceFormDataAPI
      })

      const responseData = await response.json(); // Always try to parse JSON

      if (!response.ok) {
        let errorMessage = 'Yoklama oluşturulurken bir hata oluştu.'
        // Try to get a more specific error message from the API response
        if (responseData && (responseData.detail || responseData.message)) {
             errorMessage = responseData.detail || responseData.message;
        } else {
             // Fallback based on status code
             if (response.status === 400) errorMessage = "Geçersiz istek. Lütfen girdiğiniz bilgileri kontrol edin.";
             if (response.status === 401) errorMessage = "Yetkisiz işlem. Lütfen tekrar giriş yapın.";
             if (response.status === 404) errorMessage = "İlgili kurs bulunamadı.";
             if (response.status === 500) errorMessage = "Sunucu hatası. Lütfen daha sonra tekrar deneyin.";
        }
        throw new Error(errorMessage)
      }

      // Check if the result structure is as expected
      if (!responseData || !responseData.results) {
          throw new Error("API'den beklenen yoklama sonucu alınamadı.");
      }

      setAttendanceResult(responseData)
      setSuccess(true)
      resetImage(); // Clear the image after successful submission

    } catch (error: any) {
      console.error('Yoklama oluşturma hatası:', error)
      setError(error.message || 'Yoklama oluşturulurken bilinmeyen bir hata oluştu.')
      setSuccess(false) // Ensure success is false on error
      setAttendanceResult(null);
    } finally {
      setProcessing(false)
    }
  }

  const resetForm = () => {
    setSuccess(false)
    setAttendanceResult(null)
    resetImage() // Use the resetImage function here too
    // Optionally reset course selection or keep it
    // setFormData(prev => ({ ...prev, courseId: null }))
  }

  // --- JSX Structure ---
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Yeni Yoklama</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Ders için fotoğraf çekerek veya yükleyerek yoklama alın
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Geri Dön
        </button>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
          <span>Dersler yükleniyor...</span>
        </div>
      )}

      {/* Main Content Area (conditionally rendered) */}
      {!loading && (
        <>
          {/* --- Error Display Area (Top Level) --- */}
          {/* Show general form/API errors here only if NOT in success state */}
          {error && !success && !(photoTaken || imagePreview || isCameraOpen) && (
            <div className="mb-6 rounded-md bg-red-50 p-4 dark:bg-red-900/20">
              <div className="flex">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400 dark:text-red-500" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Hata</h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</div>
                </div>
              </div>
            </div>
          )}

          {/* --- Success Screen --- */}
          {success && attendanceResult ? (
             <div className="rounded-lg border bg-white p-6 shadow-md dark:border-gray-700 dark:bg-gray-800">
              {/* Success Header */}
              <div className="mb-6 flex items-center justify-center">
                <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
                  <Check className="h-8 w-8 text-green-500 dark:text-green-400" />
                </div>
              </div>
              <h2 className="mb-4 text-center text-2xl font-bold text-gray-900 dark:text-white">
                Yoklama Başarıyla Oluşturuldu!
              </h2>

               {/* Attendance Summary */}
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Toplam Öğrenci</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {attendanceResult.results.length} {/* Use results array length */}
                  </p>
                </div>
                <div className="rounded-lg bg-green-50 p-4 text-center dark:bg-green-900/20">
                  <p className="text-sm text-green-600 dark:text-green-400">Var Olan</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                    {attendanceResult.results.filter(s => s.status === 'PRESENT').length}
                  </p>
                </div>
                <div className="rounded-lg bg-red-50 p-4 text-center dark:bg-red-900/20">
                  <p className="text-sm text-red-600 dark:text-red-400">Yok Olan</p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                     {attendanceResult.results.filter(s => s.status === 'ABSENT').length}
                  </p>
                </div>
              </div>

               {/* Emotion Stats (if available) */}
              {attendanceResult.emotion_statistics && Object.keys(attendanceResult.emotion_statistics).length > 0 && (
                <div className="mb-6">
                  <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                    Duygu Analizi
                  </h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {Object.entries(attendanceResult.emotion_statistics).map(([emotion, count]) => (
                      <div key={emotion} className="rounded-lg bg-blue-50 p-3 text-center dark:bg-blue-900/20">
                        <p className="text-sm capitalize text-blue-600 dark:text-blue-400">{emotion}</p>
                        <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{count}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Student List Table */}
              <div className="mb-6">
                <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                  Öğrenci Listesi
                </h3>
                <div className="overflow-x-auto rounded-lg border dark:border-gray-700">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 sm:px-6">
                          Öğrenci
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 sm:px-6">
                          Durum
                        </th>
                        <th scope="col" className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 sm:table-cell sm:px-6">
                          Güven Oranı
                        </th>
                        {/* Conditional Headers */}
                        {attendanceResult.results.some(s => s.emotion || s.estimated_age || s.estimated_gender) && (
                            <>
                             <th scope="col" className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 md:table-cell sm:px-6">
                                Duygu
                             </th>
                              <th scope="col" className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 lg:table-cell sm:px-6">
                                Yaş (Tahmini)
                             </th>
                              <th scope="col" className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 lg:table-cell sm:px-6">
                                Cinsiyet
                             </th>
                            </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                      {attendanceResult.results.length > 0 ? (
                           attendanceResult.results.map((student) => (
                            <tr key={student.student_id}>
                            <td className="whitespace-nowrap px-4 py-4 sm:px-6">
                                <div className="flex items-center">
                                <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gray-200 dark:bg-gray-700">
                                    {/* Placeholder Icon or Initials */}
                                    <div className="flex h-full w-full items-center justify-center">
                                    <span className="text-xs font-medium uppercase text-gray-600 dark:text-gray-300">
                                        {student.first_name?.[0]}{student.last_name?.[0] || '?'}
                                    </span>
                                    </div>
                                </div>
                                <div className="ml-3">
                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {student.first_name || 'Bilinmeyen'} {student.last_name || `(${student.student_id})`}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {student.student_number || '-'}
                                    </div>
                                </div>
                                </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 sm:px-6">
                                <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                                student.status === 'PRESENT'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                {student.status === 'PRESENT' ? 'Var' : 'Yok'}
                                </span>
                            </td>
                            <td className="hidden whitespace-nowrap px-4 py-4 text-sm text-gray-500 dark:text-gray-400 sm:table-cell sm:px-6">
                                {student.confidence ? `%${Math.round(student.confidence * 100)}` : '-'}
                            </td>
                             {/* Conditional Data Cells */}
                             {attendanceResult.results.some(s => s.emotion || s.estimated_age || s.estimated_gender) && (
                                <>
                                <td className="hidden whitespace-nowrap px-4 py-4 text-sm capitalize text-gray-500 dark:text-gray-400 md:table-cell sm:px-6">
                                    {student.emotion || '-'}
                                </td>
                                <td className="hidden whitespace-nowrap px-4 py-4 text-sm text-gray-500 dark:text-gray-400 lg:table-cell sm:px-6">
                                    {student.estimated_age || '-'}
                                </td>
                                <td className="hidden whitespace-nowrap px-4 py-4 text-sm text-gray-500 dark:text-gray-400 lg:table-cell sm:px-6">
                                    {student.estimated_gender === 'Woman' ? 'Kadın' :
                                    student.estimated_gender === 'Man' ? 'Erkek' : (student.estimated_gender || '-')}
                                </td>
                                </>
                             )}
                            </tr>
                        ))
                      ) : (
                         <tr>
                           <td colSpan={attendanceResult.results.some(s => s.emotion || s.estimated_age || s.estimated_gender) ? 6 : 3} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                            Yoklama sonucu bulunamadı.
                           </td>
                         </tr>
                      )}

                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex justify-center space-x-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Yeni Yoklama
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/dashboard/teacher/attendance/history?course=${formData.courseId}`)} // Use actual courseId from result if needed
                  disabled={!formData.courseId} // Disable if no course selected initially
                  className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-800"
                >
                  Yoklama Geçmişi
                </button>
              </div>
            </div>
          ) : (
            // --- Yoklama Formu (Varsayılan Ekran) ---
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {/* Sol Kolon - Form Alanları */}
              <div className="lg:col-span-1">
                <div className="rounded-lg border bg-white p-6 shadow-md dark:border-gray-700 dark:bg-gray-800">
                  <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Yoklama Bilgileri</h2>
                  <div className="space-y-4">
                    {/* Ders Seçimi */}
                    <div>
                      <label htmlFor="courseId" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Ders *
                      </label>
                      <div className="relative">
                        <select
                          id="courseId"
                          name="courseId"
                          value={formData.courseId || ''}
                          onChange={handleFormChange}
                          className={cn(
                            "block w-full rounded-md border py-2 pl-3 pr-10 shadow-sm focus:outline-none focus:ring-blue-500 sm:text-sm",
                            "border-gray-300 bg-white text-gray-900 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white",
                            !formData.courseId && "text-gray-500" // Placeholder style
                          )}
                          required
                        >
                          <option value="" disabled>Ders Seçin...</option>
                          {courses.map((course) => (
                            <option key={course.id} value={course.id}>
                              {course.code} - {course.name}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                     {/* Tarih */}
                    <div>
                      <label htmlFor="date" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Yoklama Tarihi *
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <CalendarIcon className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="date"
                          id="date"
                          name="date"
                          value={formData.date}
                          onChange={handleFormChange}
                          className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                          required
                        />
                      </div>
                    </div>
                     {/* Ders Saati */}
                    <div>
                      <label htmlFor="lessonNumber" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Ders Saati *
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <Clock className="h-4 w-4 text-gray-400" />
                        </div>
                        <select
                          id="lessonNumber"
                          name="lessonNumber"
                          value={formData.lessonNumber}
                          onChange={handleFormChange}
                          className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                          required
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => ( // Expanded hours
                            <option key={num} value={num}>
                              {num}. Ders
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                     {/* Yoklama Tipi */}
                    <div>
                      <label htmlFor="type" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Yoklama Tipi *
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['FACE', 'EMOTION', 'FACE_EMOTION'] as const).map((typeValue) => (
                          <label key={typeValue} className={cn(
                              "flex cursor-pointer flex-col items-center justify-center rounded-md border p-2 shadow-sm transition-colors hover:border-blue-500 dark:hover:border-blue-400",
                              formData.type === typeValue
                                ? "border-blue-500 ring-1 ring-blue-500 dark:border-blue-400 dark:ring-blue-400"
                                : "border-gray-300 dark:border-gray-600"
                            )}
                          >
                            <input
                              type="radio"
                              name="type"
                              value={typeValue}
                              checked={formData.type === typeValue}
                              onChange={handleFormChange}
                              className="sr-only"
                            />
                            <div className={cn(
                                "flex flex-col items-center",
                                formData.type === typeValue ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                              )}
                            >
                              <div className="relative h-5 w-5">
                                <UserCheck className="h-full w-full" />
                                {typeValue === 'EMOTION' && <span className="absolute -right-1.5 -top-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-orange-500 text-[8px] font-bold text-white">E</span>}
                                {typeValue === 'FACE_EMOTION' && <span className="absolute -right-1.5 -top-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-purple-500 text-[8px] font-bold text-white">+</span>}
                              </div>
                              <span className="mt-1 text-center text-xs leading-tight">
                                {typeValue === 'FACE' ? 'Yüz' : typeValue === 'EMOTION' ? 'Duygu' : 'Kombine'}
                              </span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sağ Kolon - Kamera/Resim */}
              <div className="lg:col-span-2">
                <div className="rounded-lg border bg-white p-6 shadow-md dark:border-gray-700 dark:bg-gray-800">
                  <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Sınıf Fotoğrafı</h2>

                  {/* Fotoğraf veya Kamera Önizleme Alanı */}
                  <div className="relative mb-4 h-96 overflow-hidden rounded-lg border bg-gray-100 dark:border-gray-600 dark:bg-gray-700">
                     {/* 1. Kamera Aktifse Video Göster */}
                      {/* --- DEĞİŞİKLİK BURADA BAŞLIYOR --- */}
                      {/* Fotoğraf veya Kamera Önizleme Alanı */}
                      <div className="relative mb-4 h-96 overflow-hidden rounded-lg border bg-gray-100 dark:border-gray-600 dark:bg-gray-700">

                        {/* 1. Video Elementini Kamera Açıkken Render Et */}
                        {isCameraOpen && (
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            // İsteğe bağlı: Stream aktif olana kadar görsel olarak gizle
                            // className={cn(
                            //   "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
                            //   !streamActive ? "opacity-0" : "opacity-100" // Stream gelince görünür yap
                            // )}
                            // Veya basitçe her zaman görünür tut:
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        )}

                        {/* 2. Kamera Kapalı AMA Fotoğraf Çekilmişse Göster */}
                        {!isCameraOpen && photoTaken && ( // Koşul !isCameraOpen olarak güncellendi
                          <img
                            src={photoTaken}
                            alt="Çekilen fotoğraf"
                            className="absolute inset-0 h-full w-full object-contain"
                          />
                        )}

                        {/* 3. Kamera Kapalı, Fotoğraf Çekilmemiş AMA Resim Yüklenmişse Göster */}
                        {!isCameraOpen && !photoTaken && imagePreview && ( // Koşul !isCameraOpen olarak güncellendi
                          <img
                            src={imagePreview}
                            alt="Yüklenen resim"
                            className="absolute inset-0 h-full w-full object-contain"
                          />
                        )}

                        {/* 4. Hiçbiri Yoksa Placeholder Göster (Kamera kapalıyken) */}
                        {!isCameraOpen && !photoTaken && !imagePreview && ( // Koşul !isCameraOpen olarak güncellendi
                          <div className="flex h-full flex-col items-center justify-center p-4">
                            <Image className="mb-4 h-16 w-16 text-gray-400 dark:text-gray-500" />
                            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                              Sınıf fotoğrafı çekmek veya yüklemek için aşağıdaki butonları kullanın.
                            </p>
                          </div>
                        )}

                        {/* 5. Yükleme Göstergesi (Kamera açılıyor ama stream henüz aktif değilken) */}
                        {isCameraOpen && !streamActive && !error && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                                <Loader2 className="h-8 w-8 animate-spin text-white" />
                            </div>
                        )}

                      </div>
                      {/* --- DEĞİŞİKLİK BURADA BİTİYOR --- */}
                     {/* 2. Kamera Aktif Değil AMA Fotoğraf Çekilmişse Göster */}
                    {!streamActive && photoTaken && (
                      <img
                        src={photoTaken}
                        alt="Çekilen fotoğraf"
                        className="absolute inset-0 h-full w-full object-contain"
                      />
                    )}
                     {/* 3. Kamera Aktif Değil, Fotoğraf Çekilmemiş AMA Resim Yüklenmişse Göster */}
                    {!streamActive && !photoTaken && imagePreview && (
                      <img
                        src={imagePreview}
                        alt="Yüklenen resim"
                        className="absolute inset-0 h-full w-full object-contain"
                      />
                    )}
                     {/* 4. Hiçbiri Yoksa Placeholder Göster */}
                    {!streamActive && !photoTaken && !imagePreview && (
                      <div className="flex h-full flex-col items-center justify-center p-4">
                        <Image className="mb-4 h-16 w-16 text-gray-400 dark:text-gray-500" />
                        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                          Sınıf fotoğrafı çekmek veya yüklemek için aşağıdaki butonları kullanın.
                        </p>
                      </div>
                    )}
                     {/* Kamera açılırken yükleme göstergesi */}
                    {isCameraOpen && !streamActive && !error && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                            <Loader2 className="h-8 w-8 animate-spin text-white" />
                        </div>
                    )}
                  </div>

                  {/* Gizli canvas ve dosya input */}
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/jpeg,image/png"
                    className="hidden"
                  />

                  {/* Butonlar */}
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    {!photoTaken && !imagePreview ? (
                      <>
                        <button
                          type="button"
                          onClick={toggleCamera}
                          disabled={processing}
                          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          {isCameraOpen ? 'Kamerayı Kapat' : 'Kamera Aç'}
                        </button>

                        {streamActive && (
                          <button
                            type="button"
                            onClick={capturePhoto}
                            disabled={processing}
                            className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-800"
                          >
                            <Camera className="mr-2 h-4 w-4" />
                            Fotoğraf Çek
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={triggerFileInput}
                           disabled={processing}
                          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Fotoğraf Yükle
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Show Yoklama Oluştur button only when image is ready */}
                         <button
                          type="button"
                          onClick={createAttendance}
                          disabled={processing || (!formData.courseId)} // Also disable if course not selected
                          className={cn(
                            "inline-flex items-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2",
                             processing || !formData.courseId ? "bg-gray-400 cursor-not-allowed dark:bg-gray-600" : "bg-green-600 hover:bg-green-700 focus:ring-green-500 dark:bg-green-700 dark:hover:bg-green-800",
                            "disabled:opacity-70"
                          )}
                        >
                          {processing ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              İşleniyor...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Yoklama Oluştur
                            </>
                          )}
                        </button>

                         <button
                          type="button"
                          onClick={resetImage}
                          disabled={processing}
                          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                        >
                          <X className="mr-2 h-4 w-4" />
                          İptal / Değiştir
                        </button>

                      </>
                    )}
                  </div>
                   {/* Hata Mesajı (Resim/Kamera ile ilgili) */}
                    {error && (photoTaken || imagePreview || isCameraOpen) && (
                        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
                    )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}


// Helper to add cn if not present (if using Shadcn UI)
const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');