"use client"

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import {
  User,
  Mail,
  Key,
  School,
  GraduationCap,
  Save,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  X,
  Camera,
  Upload,
  Image as ImageIcon,
  AlertCircle,
  RefreshCcw,
  BookOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Define the Course type
type Course = {
  id: number
  code: string
  name: string
  semester: string
  teacher_id: number
}

// Define the Student type (based on registration response structure)
type Student = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  student_number: string;
  department: string;
  role: string;
  created_at: string;
  updated_at: string;
  face_photo_url: string | null;
}

// Define the Registration Response type
type RegistrationResponse = {
  message: string;
  student: Student;
}

// Define the Face Upload Response type
type FaceUploadResponse = {
  face_photo_url: string;
  message: string;
  student_id: number;
}

// Define the Course Enrollment Response type
type EnrollmentResponse = {
  course_id: number;
  created_at: string;
  id: number; // Enrollment ID
  student_id: number;
  updated_at: string;
}

export default function NewStudentPage() {
  const { token, apiUrl } = useAuth()
  const router = useRouter()

  // --- State Definitions ---

  // Form data
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    student_number: '',
    department: ''
  })

  // Photo state
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [streamActive, setStreamActive] = useState(false)
  const mediaStreamRef = useRef<MediaStream | null>(null) // To hold the camera stream

  // UI and Process state
  const [loading, setLoading] = useState(false) // Overall loading state for the entire process
  const [success, setSuccess] = useState(false) // Overall success state
  const [error, setError] = useState<string | null>(null) // Overall error message

  const [studentId, setStudentId] = useState<number | null>(null) // Store the ID of the newly created student

  // Step-specific states
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  const [facePhotoUploading, setFacePhotoUploading] = useState(false)
  const [facePhotoSuccess, setFacePhotoSuccess] = useState(false)
  const [facePhotoError, setFacePhotoError] = useState<string | null>(null)

  const [enrollmentLoading, setEnrollmentLoading] = useState(false)
  const [enrollmentSuccess, setEnrollmentSuccess] = useState(false)
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null)

  // Course state
  const [selectedCourses, setSelectedCourses] = useState<number[]>([])
  const [availableCourses, setAvailableCourses] = useState<Course[]>([])
  const [loadingCourses, setLoadingCourses] = useState(false)

  // --- Effects ---

  // Fetch available courses on mount
  useEffect(() => {
    const fetchCourses = async () => {
      if (!token) return

      try {
        setLoadingCourses(true)
        const response = await fetch(`${apiUrl}/api/courses/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`Dersler yüklenirken hata oluştu: ${response.status}`)
        }

        const data: Course[] = await response.json()
        setAvailableCourses(data)
      } catch (error) {
        console.error('Dersler yüklenirken hata:', error)
        setError('Dersler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.')
      } finally {
        setLoadingCourses(false)
      }
    }

    fetchCourses()
  }, [token, apiUrl])

  // Cleanup camera stream on unmount or when camera closes
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // --- Event Handlers ---

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Toggle course selection
  const toggleCourseSelection = (courseId: number) => {
    setSelectedCourses(prev =>
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    )
  }

  // --- Camera and Photo Upload Logic ---

  const stopCameraStream = () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
        mediaStreamRef.current = null
      }
      if (videoRef.current) {
          videoRef.current.srcObject = null;
      }
      setStreamActive(false)
      setIsCameraOpen(false); // Ensure camera state is synced
  }

  // Toggle camera on/off
  const toggleCamera = async () => {
    if (isCameraOpen || streamActive) {
      stopCameraStream();
    } else {
      try {
        setError(null); // Clear previous errors
        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" }, // Prefer front camera
          audio: false
        })

        if (videoRef.current) {
          // Reset photo state if camera is opened
          setPhotoPreview(null)
          setPhotoFile(null)

          videoRef.current.srcObject = stream
          mediaStreamRef.current = stream // Store the stream reference
          setIsCameraOpen(true)
          setStreamActive(true) // Mark stream as active for video display
        } else {
            // If video ref not ready, stop the stream
            stream.getTracks().forEach(track => track.stop());
            throw new Error("Video element not ready.");
        }
      } catch (err) {
        console.error('Kamera açılırken hata:', err)
        setError('Kamera erişim hatası. Lütfen tarayıcı ayarlarınızdan kamera izinlerini kontrol edin.')
        setIsCameraOpen(false)
        setStreamActive(false)
      }
    }
  }

  // Capture photo from camera stream
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && streamActive) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')

      if (!context) {
          console.error("Canvas context alınamadı.");
          setError("Fotoğraf çekilirken bir hata oluştu (canvas context).");
          return;
      }

      // Set canvas dimensions to match video frame
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Draw the current video frame onto the canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Get the image data as a Base64 string for preview
      const photoDataUrl = canvas.toDataURL('image/jpeg')
      setPhotoPreview(photoDataUrl)

      // Convert canvas content to Blob, then to File
      canvas.toBlob(blob => {
        if (blob) {
          // Create a File object
          const timestamp = new Date().toISOString().replace(/[-:.]/g, "");
          const fileName = `student_face_${timestamp}.jpg`;
          const file = new File([blob], fileName, { type: "image/jpeg" })
          setPhotoFile(file)
        } else {
            console.error("Canvas toBlob başarısız oldu.");
            setError("Fotoğraf verisi oluşturulurken hata oluştu.");
        }
      }, 'image/jpeg', 0.9) // Use JPEG format with 90% quality

      // Stop the camera stream after taking the photo
      stopCameraStream();
    }
  }

  // Trigger the hidden file input
  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  // Handle file selection from input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
      setError('Lütfen sadece JPEG veya PNG formatında bir resim dosyası seçin.')
      setPhotoFile(null)
      setPhotoPreview(null)
      e.target.value = '' // Reset file input
      return
    }

    // Validate file size (e.g., max 5MB)
    const maxSizeInBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
        setError('Dosya boyutu çok büyük. Lütfen 5MB\'dan küçük bir dosya seçin.');
        setPhotoFile(null);
        setPhotoPreview(null);
        e.target.value = ''; // Reset file input
        return;
    }

    setPhotoFile(file)
    setError(null); // Clear previous errors

    // Create preview URL
    const reader = new FileReader()
    reader.onloadend = () => { // Use onloadend for reliability
      setPhotoPreview(reader.result as string)
    }
    reader.onerror = () => {
        console.error("Dosya okuma hatası");
        setError("Seçilen dosyanın önizlemesi oluşturulamadı.");
        setPhotoPreview(null);
    }
    reader.readAsDataURL(file)

    // Stop camera if it was active
    if (isCameraOpen || streamActive) {
      stopCameraStream();
    }
  }

  // Reset photo state
  const resetPhoto = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
    // Also reset the file input value so the same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    // If camera was open, ensure it's ready to be opened again
    if (isCameraOpen) {
        stopCameraStream(); // Ensure stream is stopped
        setIsCameraOpen(false); // Reset camera button state
    }
  }

  // --- Form Validation ---
  const isFormValid = (): boolean => {
    setError(null); // Clear previous validation errors

    if (!formData.email || !formData.password || !formData.first_name || !formData.last_name || !formData.student_number || !formData.department) {
      setError('Lütfen tüm öğrenci bilgi alanlarını doldurun.')
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Lütfen geçerli bir e-posta adresi girin.')
      return false
    }

    if (formData.password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.')
      return false
    }

    if (!photoFile) {
      setError('Lütfen öğrencinin yüz fotoğrafını yükleyin veya çekin.')
      return false
    }

    if (selectedCourses.length === 0) {
      setError('Lütfen öğrenciyi kaydetmek için en az bir ders seçin.')
      return false
    }

    return true
  }


  // --- API Call Functions ---

  // Step 1: Register Student
  const registerStudent = async (): Promise<number | null> => {
    if (!token) {
        setError('Kimlik doğrulama bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
        return null;
    }
    setRegistrationLoading(true);
    setRegistrationSuccess(false);
    setRegistrationError(null);

    try {
      const response = await fetch(`${apiUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          role: 'STUDENT' // Ensure role is set correctly
        })
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Try to get specific error from API response
        const message = responseData?.detail || responseData?.message || `Öğrenci kaydı başarısız: ${response.status}`;
        throw new Error(message);
      }

      // Check if student data and ID exist in the response
      if (!responseData.student || typeof responseData.student.id !== 'number') {
        console.error("API Response:", responseData); // Log unexpected response
        throw new Error("API yanıtında geçerli öğrenci ID bulunamadı.");
      }

      setRegistrationSuccess(true);
      return responseData.student.id; // Return the new student's ID

    } catch (error: any) {
      console.error('Öğrenci Kayıt Hatası:', error);
      const errorMessage = error.message || 'Öğrenci kaydı sırasında bilinmeyen bir hata oluştu.';
      setRegistrationError(errorMessage);
      setError(errorMessage); // Set overall error as well
      return null; // Indicate failure
    } finally {
      setRegistrationLoading(false);
    }
  }

  // Step 2: Upload Face Photo
  const uploadFacePhoto = async (sId: number): Promise<boolean> => {
    if (!token || !photoFile) {
        setError('Yüz fotoğrafı yüklemek için kimlik doğrulama veya dosya eksik.');
        return false;
    }

    setFacePhotoUploading(true);
    setFacePhotoSuccess(false);
    setFacePhotoError(null);

    const faceFormData = new FormData();
    faceFormData.append('file', photoFile); // API expects 'file' field

    try {
      const response = await fetch(`${apiUrl}/api/students/${sId}/face`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
           // 'Content-Type': 'multipart/form-data' is set automatically by fetch for FormData
           'Accept': 'application/json'
        },
        body: faceFormData
      });

      const responseData = await response.json();

      if (!response.ok) {
        const message = responseData?.detail || responseData?.message || `Yüz fotoğrafı yüklenemedi: ${response.status}`;
        throw new Error(message);
      }

      // Optional: Check response structure if needed
      // if (!responseData.face_photo_url) {
      //   throw new Error("API yanıtında yüz fotoğrafı URL'si bulunamadı.");
      // }

      setFacePhotoSuccess(true);
      return true; // Indicate success

    } catch (error: any) {
      console.error('Yüz Fotoğrafı Yükleme Hatası:', error);
      const errorMessage = error.message || 'Yüz fotoğrafı yüklenirken bilinmeyen bir hata oluştu.';
      setFacePhotoError(errorMessage);
      setError(errorMessage); // Set overall error
      return false; // Indicate failure
    } finally {
      setFacePhotoUploading(false);
    }
  }

  // Step 3: Enroll Student in Courses
  const enrollInCourses = async (sId: number): Promise<boolean> => {
      if (!token || selectedCourses.length === 0) {
          setError('Ders kaydı için kimlik doğrulama veya seçili ders eksik.');
          return false;
      }

      setEnrollmentLoading(true);
      setEnrollmentSuccess(false);
      setEnrollmentError(null);

      let allEnrollmentsSuccessful = true;
      const errorMessages: string[] = [];

      // Use Promise.allSettled to wait for all requests, even if some fail
      const enrollmentPromises = selectedCourses.map(courseId => {
          return fetch(`${apiUrl}/api/courses/${courseId}/students`, {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
              },
              body: JSON.stringify({ student_id: sId }) // Send student_id in body
          }).then(async response => {
              const responseData = await response.json();
              if (!response.ok) {
                  const message = responseData?.detail || responseData?.message || `Derse (${courseId}) kayıt başarısız: ${response.status}`;
                  // Return a rejected promise with the error message
                  return Promise.reject({ courseId, message });
              }
              // Return a resolved promise with the success data (optional)
              return Promise.resolve({ courseId, data: responseData });
          }).catch(error => {
              // Catch network errors or other exceptions during fetch
              const message = error?.message || `Derse (${courseId}) kayıt sırasında ağ hatası veya bilinmeyen hata.`;
              return Promise.reject({ courseId, message });
          });
      });

      const results = await Promise.allSettled(enrollmentPromises);

      // Process results
      results.forEach(result => {
          if (result.status === 'rejected') {
              allEnrollmentsSuccessful = false;
              console.error(`Ders ${result.reason.courseId} kaydı hatası:`, result.reason.message);
              errorMessages.push(`Ders ${result.reason.courseId}: ${result.reason.message}`);
          }
      });

      if (allEnrollmentsSuccessful) {
          setEnrollmentSuccess(true);
          return true; // All successful
      } else {
          const combinedErrorMessage = errorMessages.join('; ');
          setEnrollmentError(combinedErrorMessage || 'Bir veya daha fazla derse kayıt sırasında hata oluştu.');
          setError(combinedErrorMessage || 'Bir veya daha fazla derse kayıt sırasında hata oluştu.'); // Set overall error
          return false; // Indicate partial or total failure
      }
      // Note: finally block is not needed here as loading state is set at the beginning
      // and success/error state handles the end. We will reset loading in handleSubmit.
  }


  // --- Main Submit Handler ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null) // Clear previous overall errors
    setSuccess(false) // Reset success state

    // 1. Validate form
    if (!isFormValid()) {
      return // Validation errors are set by isFormValid
    }

    setLoading(true) // Start overall loading indicator

    // Reset step-specific states before starting
    setRegistrationLoading(false); setRegistrationSuccess(false); setRegistrationError(null);
    setFacePhotoUploading(false); setFacePhotoSuccess(false); setFacePhotoError(null);
    setEnrollmentLoading(false); setEnrollmentSuccess(false); setEnrollmentError(null);
    setStudentId(null);

    let currentStudentId: number | null = null;
    let faceUploaded = false;
    let coursesEnrolled = false;

    try {
      // --- Step 1: Register Student ---
      currentStudentId = await registerStudent();
      if (!currentStudentId) {
        // Error handled and set within registerStudent
        throw new Error(registrationError || "Öğrenci kaydı başarısız oldu."); // Stop process
      }
      setStudentId(currentStudentId); // Store ID for potential later use or display

      // --- Step 2: Upload Face Photo ---
      // Check photoFile again just in case, though validation should catch it
      if (!photoFile) throw new Error("Yüz fotoğrafı dosyası bulunamadı (handleSubmit).");

      faceUploaded = await uploadFacePhoto(currentStudentId);
      if (!faceUploaded) {
        // Error handled and set within uploadFacePhoto
        throw new Error(facePhotoError || "Yüz fotoğrafı yüklenemedi."); // Stop process
      }

      // --- Step 3: Enroll in Courses ---
      // Check selectedCourses again
      if (selectedCourses.length === 0) throw new Error("Seçili ders bulunamadı (handleSubmit).");

      coursesEnrolled = await enrollInCourses(currentStudentId);
      if (!coursesEnrolled) {
        // Error handled and set within enrollInCourses
        throw new Error(enrollmentError || "Derslere kayıt işlemi tamamlanamadı."); // Stop process
      }

      // --- All Steps Successful ---
      if (currentStudentId && faceUploaded && coursesEnrolled) {
        setSuccess(true) // Set overall success
        // Optionally clear form here or wait for user action (reset button)
      } else {
          // This case should theoretically not be reached due to earlier throws
          // but acts as a safeguard.
          throw new Error("Öğrenci ekleme işlemi bilinmeyen bir nedenle tamamlanamadı.");
      }

    } catch (error: any) {
      console.error('Genel Kayıt Süreci Hatası:', error)
      // Set the overall error state if not already set by sub-functions
      if (!error) {
          setError(error.message || 'Öğrenci ekleme işlemi sırasında beklenmedik bir hata oluştu.')
      }
    } finally {
      setLoading(false) // Stop overall loading indicator regardless of outcome
      // Loading states for individual steps are handled within their functions
      setRegistrationLoading(false);
      setFacePhotoUploading(false);
      setEnrollmentLoading(false);
    }
  }


  // Reset the entire form and state
  const resetForm = () => {
    setFormData({
      email: '', password: '', first_name: '', last_name: '',
      student_number: '', department: ''
    })
    resetPhoto() // Use the existing photo reset function
    setSelectedCourses([])
    setSuccess(false)
    setError(null)
    setStudentId(null)

    // Reset step states
    setRegistrationLoading(false); setRegistrationSuccess(false); setRegistrationError(null);
    setFacePhotoUploading(false); setFacePhotoSuccess(false); setFacePhotoError(null);
    setEnrollmentLoading(false); setEnrollmentSuccess(false); setEnrollmentError(null);

    // Stop camera if open
    if (isCameraOpen || streamActive) {
        stopCameraStream();
    }
  }

  // --- Render ---
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Yeni Öğrenci Ekle</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Sisteme yeni bir öğrenci ekleyin, yüzünü kaydedin ve derslere atayın.
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/teacher/students')}
          className="flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Öğrenci Listesine Dön
        </button>
      </div>

      {/* Overall Success Message */}
      {success && (
        <div className="mb-6 rounded-md bg-green-50 p-4 dark:bg-green-900/20">
          <div className="flex">
            <div className="flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-green-400 dark:text-green-300" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-200">Öğrenci Başarıyla Eklendi</h3>
              <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                 <p>Öğrenci başarıyla kaydedildi, yüz fotoğrafı yüklendi ve seçilen derslere atandı.</p>
                {/* Display Student ID if available */}
                 {studentId && <p className="mt-1">Oluşturulan Öğrenci ID: {studentId}</p>}
              </div>
              <div className="mt-4">
                 <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center rounded-md bg-green-100 px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:bg-green-800/30 dark:text-green-200 dark:hover:bg-green-700/30"
                >
                  <RefreshCcw className="mr-2 inline h-4 w-4" />
                  Yeni Öğrenci Ekle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

     {/* Overall Error Message */}
      {error && !success && ( // Show general error only if not in success state
        <div className="mb-6 rounded-md bg-red-50 p-4 dark:bg-red-900/20">
          <div className="flex">
            <div className="flex-shrink-0">
                 <AlertCircle className="h-5 w-5 text-red-400 dark:text-red-300" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Hata Oluştu</h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                {/* Display the most relevant error message */}
                {error}
                {/* Optionally display specific step errors if needed for detailed feedback */}
                {/* {registrationError && <p>Kayıt Hatası: {registrationError}</p>} */}
                {/* {facePhotoError && <p>Yüz Fotoğrafı Hatası: {facePhotoError}</p>} */}
                {/* {enrollmentError && <p>Ders Kayıt Hatası: {enrollmentError}</p>} */}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form and Photo Area (Hide if overall success) */}
      {!success && (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* --- Form Section --- */}
          <div className="md:col-span-2">
            <div className="rounded-lg border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">Öğrenci Bilgileri</h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Input Fields Grid */}
                <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
                   {/* First Name */}
                    <div>
                        <label htmlFor="first_name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Adı *
                        </label>
                        <div className="relative rounded-md shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <User className="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </div>
                        <input
                            type="text"
                            id="first_name"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleInputChange}
                            required
                            className="block w-full rounded-md border-gray-300 bg-white py-2.5 pl-10 pr-3 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary dark:focus:ring-primary sm:text-sm"
                            placeholder="Adı"
                        />
                        </div>
                    </div>

                    {/* Last Name */}
                    <div>
                        <label htmlFor="last_name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Soyadı *
                        </label>
                        <div className="relative rounded-md shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <User className="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </div>
                        <input
                            type="text"
                            id="last_name"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleInputChange}
                            required
                            className="block w-full rounded-md border-gray-300 bg-white py-2.5 pl-10 pr-3 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary dark:focus:ring-primary sm:text-sm"
                            placeholder="Soyadı"
                        />
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        E-posta *
                        </label>
                        <div className="relative rounded-md shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Mail className="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </div>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                            className="block w-full rounded-md border-gray-300 bg-white py-2.5 pl-10 pr-3 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary dark:focus:ring-primary sm:text-sm"
                            placeholder="ornek@email.com"
                        />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Şifre * (min. 6 karakter)
                        </label>
                        <div className="relative rounded-md shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Key className="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </div>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            required
                            minLength={6}
                            className="block w-full rounded-md border-gray-300 bg-white py-2.5 pl-10 pr-3 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary dark:focus:ring-primary sm:text-sm"
                            placeholder="••••••••"
                        />
                        </div>
                    </div>

                    {/* Student Number */}
                    <div>
                        <label htmlFor="student_number" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Öğrenci Numarası *
                        </label>
                        <div className="relative rounded-md shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <School className="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </div>
                        <input
                            type="text"
                            id="student_number"
                            name="student_number"
                            value={formData.student_number}
                            onChange={handleInputChange}
                            required
                             className="block w-full rounded-md border-gray-300 bg-white py-2.5 pl-10 pr-3 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary dark:focus:ring-primary sm:text-sm"
                            placeholder="Örn: 202412345"
                        />
                        </div>
                    </div>

                    {/* Department */}
                    <div>
                        <label htmlFor="department" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Bölüm *
                        </label>
                        <div className="relative rounded-md shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <GraduationCap className="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </div>
                        <input
                            type="text"
                            id="department"
                            name="department"
                            value={formData.department}
                            onChange={handleInputChange}
                            required
                            className="block w-full rounded-md border-gray-300 bg-white py-2.5 pl-10 pr-3 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary dark:focus:ring-primary sm:text-sm"
                            placeholder="Bilgisayar Mühendisliği"
                        />
                        </div>
                    </div>
                </div>

                {/* Course Selection */}
                <div className="pt-4">
                  <h3 className="mb-3 text-base font-medium text-gray-900 dark:text-white">Derslere Kaydet *</h3>
                    {loadingCourses ? (
                        <div className="flex items-center justify-center rounded border border-dashed border-gray-300 py-6 dark:border-gray-600">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
                        <span className="text-gray-600 dark:text-gray-400">Dersler yükleniyor...</span>
                        </div>
                    ) : availableCourses.length === 0 ? (
                        <div className="rounded-md border border-yellow-300 bg-yellow-50 p-4 text-center text-yellow-700 dark:border-yellow-600/50 dark:bg-yellow-900/20 dark:text-yellow-200">
                        <BookOpen className="mx-auto mb-2 h-6 w-6" />
                        <p>Sistemde henüz kayıtlı ders bulunmuyor. Önce ders eklemelisiniz.</p>
                        </div>
                    ) : (
                        <div className="max-h-60 overflow-y-auto rounded-md border border-gray-300 p-2 dark:border-gray-600">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {availableCourses.map(course => (
                            <div
                                key={course.id}
                                className={`flex cursor-pointer items-center rounded-md border p-3 shadow-sm transition-colors duration-150 ease-in-out ${
                                selectedCourses.includes(course.id)
                                    ? 'border-primary bg-primary/10 dark:border-primary/50 dark:bg-primary/20 ring-1 ring-primary'
                                    : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700/60'
                                }`}
                                onClick={() => toggleCourseSelection(course.id)}
                                role="checkbox"
                                aria-checked={selectedCourses.includes(course.id)}
                                tabIndex={0} // Make it focusable
                                onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { toggleCourseSelection(course.id); e.preventDefault(); } }} // Keyboard accessibility
                            >
                                <input
                                type="checkbox"
                                checked={selectedCourses.includes(course.id)}
                                readOnly // Control selection via div click
                                className="pointer-events-none h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:ring-offset-gray-800"
                                tabIndex={-1} // Not focusable directly
                                />
                                <div className="ml-3 min-w-0 flex-1">
                                <label className="cursor-pointer select-none text-sm font-medium text-gray-900 dark:text-white">
                                    {course.code} - {course.name}
                                </label>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{course.semester}</p>
                                </div>
                            </div>
                            ))}
                        </div>
                        </div>
                    )}
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    // Disable if overall loading, or during any step, or if validation fails
                    disabled={loading || registrationLoading || facePhotoUploading || enrollmentLoading || !photoFile || selectedCourses.length === 0}
                    className={cn(
                      "inline-flex items-center justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800",
                      (loading || !photoFile || selectedCourses.length === 0 || loadingCourses) // Also disable if courses are loading
                        ? "bg-gray-400 cursor-not-allowed dark:bg-gray-600"
                        : "bg-primary hover:bg-primary/90 focus:ring-primary"
                    )}
                  >
                    {loading ? ( // Show specific step or general loading
                       <>
                           <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                           {registrationLoading ? 'Kaydediliyor...' :
                            facePhotoUploading ? 'Yüz Yükleniyor...' :
                            enrollmentLoading ? 'Derslere Atanıyor...' :
                            'İşleniyor...' }
                       </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Öğrenciyi Kaydet ve Ata
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* --- Photo Section --- */}
          <div className="md:col-span-1">
            <div className="rounded-lg border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Yüz Fotoğrafı *</h2>

              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Yoklama için öğrencinin yüz fotoğrafını ekleyin. Kamera ile çekebilir veya dosya yükleyebilirsiniz.
                </p>

                {/* Photo Preview / Camera Area */}
                <div className="aspect-square w-full overflow-hidden rounded-lg border bg-gray-100 dark:border-gray-600 dark:bg-gray-700">
                  {streamActive ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline // Important for mobile
                      muted // Usually needed for autoplay
                      className="h-full w-full object-cover" // Cover ensures it fills the area
                    />
                  ) : photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Öğrenci yüz önizlemesi"
                      className="h-full w-full object-contain" // Contain ensures the whole image is visible
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                      <ImageIcon className="mb-2 h-16 w-16 text-gray-400 dark:text-gray-500" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Fotoğraf çekmek veya yüklemek için aşağıdaki butonları kullanın.
                      </p>
                    </div>
                  )}
                </div>

                {/* Hidden canvas and file input */}
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png" // Specify accepted formats
                  className="hidden"
                  aria-hidden="true"
                />

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {!photoPreview && !streamActive && ( // Initial state: Show Camera Open and Upload
                     <>
                        <button
                            type="button"
                            onClick={toggleCamera}
                            className="inline-flex flex-grow items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                        >
                            <Camera className="mr-2 h-4 w-4" />
                            Kamera Aç
                        </button>
                        <button
                            type="button"
                            onClick={triggerFileInput}
                            className="inline-flex flex-grow items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            Fotoğraf Yükle
                        </button>
                     </>
                  )}

                  {streamActive && ( // Camera is active: Show Capture and Close Camera
                     <>
                        <button
                            type="button"
                            onClick={capturePhoto}
                            className="inline-flex flex-grow items-center justify-center rounded-md border border-transparent bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-800"
                        >
                            <Camera className="mr-2 h-4 w-4" />
                            Fotoğraf Çek
                        </button>
                         <button
                            type="button"
                            onClick={toggleCamera} // Use toggleCamera to stop stream
                            className="inline-flex flex-grow items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                        >
                            <X className="mr-2 h-4 w-4" />
                            Kamerayı Kapat
                        </button>
                     </>
                  )}

                  {photoPreview && !streamActive && ( // Photo selected/captured: Show Reset
                    <button
                      type="button"
                      onClick={resetPhoto}
                      className="inline-flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Fotoğrafı Değiştir / Sıfırla
                    </button>
                  )}
                </div>

                <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  <p>En iyi sonuçlar için, öğrencinin yüzünün net göründüğü, iyi aydınlatılmış, doğrudan karşıdan çekilmiş bir fotoğraf kullanın. Gözlük, şapka veya yüzü kapatan aksesuarlar tanımayı zorlaştırabilir.</p>
                  <p className="mt-1">Desteklenen formatlar: JPG, PNG. Maksimum boyut: 5MB.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )} {/* End of !success condition */}
    </div> // End of container
  )
}