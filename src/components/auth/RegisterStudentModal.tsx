"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Loader2, CheckCircle2, AlertCircle, Camera, Upload, Trash2, User, Mail, Lock, Hash, GraduationCap, BookCopy, UserPlus } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

// --- Types and Schemas ---

// API'den gelen kurs nesnesi tipi
interface Course {
  id: number;
  code: string;
  name: string;
  semester: string;
  teacher_id: number;
  // API yanıtına göre diğer alanlar eklenebilir
}

// Kayıt formu şeması
const studentRegisterSchema = z.object({
  first_name: z.string().min(1, { message: 'Ad alanı gereklidir' }),
  last_name: z.string().min(1, { message: 'Soyad alanı gereklidir' }),
  email: z.string().email({ message: 'Geçerli bir e-posta adresi giriniz' }),
  password: z.string().min(6, { message: 'Şifre en az 6 karakter olmalıdır' }),
  student_number: z.string().min(1, { message: 'Öğrenci numarası gereklidir' }),
  department: z.string().min(1, { message: 'Bölüm adı gereklidir' }),
});

type StudentRegisterValues = z.infer<typeof studentRegisterSchema>;

// Bileşen Props
interface RegisterStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiUrl: string;
  t: any; // Çeviri objesi
}

// --- Component ---

export const RegisterStudentModal: React.FC<RegisterStudentModalProps> = ({
  isOpen,
  onClose,
  apiUrl,
  t,
}) => {
  // --- State Management ---
  const [step, setStep] = useState(1); // 1: Form, 2: Fotoğraf, 3: Dersler, 4: Özet/Gönderim
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<number[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Loading and Status States
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false); // Genel kayıt süreci yükleniyor mu?
  const [registerError, setRegisterError] = useState<string | null>(null); // Genel hata
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null); // Genel başarı
  const [newStudentId, setNewStudentId] = useState<number | null>(null); // Kaydedilen öğrencinin API'den dönen ID'si

  // Step-specific statuses (daha detaylı geri bildirim için)
  const [registrationStepStatus, setRegistrationStepStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [facePhotoStepStatus, setFacePhotoStepStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [enrollmentStepStatus, setEnrollmentStepStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');


  // React Hook Form
  const {
    register,
    handleSubmit,
    control,
    reset: resetForm,
    formState: { errors },
  } = useForm<StudentRegisterValues>({
    resolver: zodResolver(studentRegisterSchema),
  });

  // --- Effects ---

  // Modal açıldığında dersleri çek
  useEffect(() => {
    if (isOpen) {
      fetchCourses();
    }
    // Kapanışta state'leri sıfırlamak için onClose içinde çağrılacak resetModalState kullanılır
  }, [isOpen]);

  // --- Functions ---

  // Dersleri API'den çekme
  const fetchCourses = async () => {
    setIsLoadingCourses(true);
    setCoursesError(null);
    try {
      const response = await fetch(`${apiUrl}/api/courses/`, {
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})); // JSON parse hatasını yakala
        throw new Error(errorData.detail || t.errors.fetchCoursesFailed || 'Dersler alınamadı.');
      }
      const data: Course[] = await response.json();
      setCourses(data);
    } catch (error: any) {
      setCoursesError(error.message);
    } finally {
      setIsLoadingCourses(false);
    }
  };

  // Modal kapatıldığında tüm state'leri sıfırlama
  const resetModalState = useCallback(() => {
    setStep(1);
    setCourses([]);
    setSelectedCourses([]);
    setPhotoFile(null);
    setPhotoPreview(null);
    setIsCameraOpen(false);
    stopCameraStream(); // Kamera açıksa kapat
    setIsLoadingCourses(false);
    setCoursesError(null);
    setIsRegistering(false);
    setRegisterError(null);
    setRegisterSuccess(null);
    setNewStudentId(null);
    setRegistrationStepStatus('idle');
    setFacePhotoStepStatus('idle');
    setEnrollmentStepStatus('idle');
    resetForm(); // React Hook Form'u sıfırla
  }, [resetForm]);


  // onClose çağrıldığında state'leri sıfırla
  const handleClose = () => {
    resetModalState();
    onClose();
  };


  // Dosya seçimi
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // TODO: Dosya tipi ve boyut kontrolü (Örn: 5MB)
      if (file.size > 5 * 1024 * 1024) {
          setRegisterError(t.errors.fileSizeError || "Dosya boyutu 5MB'dan büyük olamaz.");
          return;
      }
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
           setRegisterError(t.errors.fileTypeError || 'Sadece JPG veya PNG dosyaları kabul edilir.');
           return;
      }
       setRegisterError(null); // Hata yoksa temizle

      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
        setPhotoFile(file);
        setIsCameraOpen(false); // Dosya seçilince kamerayı kapat
        stopCameraStream();
      };
      reader.readAsDataURL(file);
    }
  };

  // Kamera aç/kapat
  const toggleCamera = async () => {
    if (isCameraOpen) {
      stopCameraStream();
      setIsCameraOpen(false);
    } else {
      setPhotoFile(null); // Kamera açılınca mevcut dosyayı temizle
      setPhotoPreview(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Ensure the video element is ready before playing
          videoRef.current.onloadedmetadata = () => {
             videoRef.current?.play().catch(err => {
                console.error("Video play error:", err);
                // Kullanıcı etkileşimi gerekiyorsa burada bir uyarı gösterilebilir
                setRegisterError(t.errors.cameraPlayError || "Kamera başlatılamadı. Sayfayla etkileşim kurmayı deneyin.");
             });
          };
          setIsCameraOpen(true);
        }
      } catch (err) {
        console.error("Kamera erişim hatası:", err);
        setRegisterError(t.errors.cameraAccessError || "Kamera erişimi reddedildi veya bir hata oluştu.");
      }
    }
  };

  // Kamera stream'ini durdurma
  const stopCameraStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  // Fotoğraf çekme
  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const photo = new File([blob], "webcam-photo.jpg", { type: "image/jpeg" });
           // Boyut kontrolü
           if (photo.size > 5 * 1024 * 1024) {
                setRegisterError(t.errors.fileSizeError || "Çekilen fotoğraf 5MB'dan büyük.");
                resetPhoto(); // Hatalı fotoğrafı temizle
                return;
           }
           setRegisterError(null); // Hata yoksa temizle
          setPhotoFile(photo);
          setPhotoPreview(canvas.toDataURL('image/jpeg'));
          stopCameraStream(); // Foto çekince kamerayı durdur
          setIsCameraOpen(false);
        }
      }, 'image/jpeg');
    }
  };

  // Fotoğrafı sıfırlama
  const resetPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setIsCameraOpen(false);
    stopCameraStream();
     // Gizli input'un değerini de sıfırlayalım ki aynı dosyayı tekrar seçebilsin
    const fileInput = document.getElementById('photo-upload') as HTMLInputElement | null;
    if (fileInput) {
      fileInput.value = '';
    }
  };


  // Ders seçimi
  const handleCourseSelection = (courseId: number) => {
    setSelectedCourses(prev =>
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  // Kayıt işlemini başlatan fonksiyon (form gönderildiğinde)
  const onSubmit = async (data: StudentRegisterValues) => {
     // --- Validasyonlar ---
      setRegisterError(null); // Önceki hataları temizle
     if (!photoFile) {
       setRegisterError(t.errors.photoRequired || "Yüz fotoğrafı yüklenmelidir.");
       return;
     }
     if (selectedCourses.length === 0) {
       setRegisterError(t.errors.courseRequired || "En az bir ders seçilmelidir.");
       return;
     }

     setIsRegistering(true);
     setRegisterSuccess(null);
     setRegistrationStepStatus('loading');
     setFacePhotoStepStatus('idle');
     setEnrollmentStepStatus('idle');
     setNewStudentId(null); // Önceki ID'yi temizle

     let registeredStudentApiId: number | null = null; // Hata durumunda ID'yi tutmak için

     try {
       // --- Adım 1: Öğrenci Kaydı ---
       const registerPayload = {
         ...data,
         role: "STUDENT", // Rolü otomatik ata
       };
       const registerResponse = await fetch(`${apiUrl}/api/auth/register`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Accept': 'application/json',
         },
         body: JSON.stringify(registerPayload),
       });

       const registerResult = await registerResponse.json();

       if (!registerResponse.ok) {
         setRegistrationStepStatus('error');
         throw new Error(registerResult.detail || registerResult.message || t.errors.registerFailed || 'Öğrenci kaydı başarısız oldu.');
       }

       const studentApiId = registerResult.student_id; // Yanıttan student_id alınıyor
       if (!studentApiId) {
           setRegistrationStepStatus('error');
           throw new Error(t.errors.missingStudentId || 'Kayıt yanıtında öğrenci ID bulunamadı.');
       }
       registeredStudentApiId = studentApiId; // ID'yi sakla
       setNewStudentId(studentApiId); // Gelen ID'yi state'e kaydet
       setRegistrationStepStatus('success');
       setFacePhotoStepStatus('loading'); // Fotoğraf yüklemeye geç


       // --- Adım 2: Yüz Fotoğrafı Yükleme ---
       const formData = new FormData();
       formData.append('file', photoFile);

       const faceResponse = await fetch(`${apiUrl}/api/students/${studentApiId}/face`, {
         method: 'POST',
         headers: {
           'Accept': 'application/json',
           // Token gerekip gerekmediği API'ye bağlı, şimdilik eklenmiyor
         },
         body: formData,
       });

        const faceResult = await faceResponse.json();

       if (!faceResponse.ok) {
         setFacePhotoStepStatus('error');
         // Önceki adımlar başarılı olsa bile hata fırlatıp genel hatayı gösterelim
         throw new Error(faceResult.detail || t.errors.photoUploadFailed || 'Yüz fotoğrafı yüklenemedi.');
       }
       setFacePhotoStepStatus('success');
       setEnrollmentStepStatus('loading'); // Ders kaydına geç

       // --- Adım 3: Derslere Kayıt ---
       const enrollmentPromises = selectedCourses.map(courseId =>
         fetch(`${apiUrl}/api/courses/${courseId}/students`, {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'Accept': 'application/json',
             // Token?
           },
           body: JSON.stringify({ student_id: studentApiId }), // Kayıttan gelen student_id kullanılıyor
         })
       );

       const enrollmentResults = await Promise.allSettled(enrollmentPromises);

       const failedEnrollments = enrollmentResults.filter(result => result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.ok));

       if (failedEnrollments.length > 0) {
            setEnrollmentStepStatus('error');
            // Hatalı kayıtların detayını alıp göstermeye çalışalım
            const errorMessages = await Promise.all(
                failedEnrollments.map(async (result) => {
                    if (result.status === 'rejected') {
                        return result.reason?.message || t.errors.unknownEnrollmentError || 'Bilinmeyen ders kayıt hatası';
                    } else if (result.status === 'fulfilled' && !result.value.ok) {
                        try {
                          const errorData = await result.value.json();
                          return errorData.detail || t.errors.enrollmentFailedGeneric || 'Bir derse kayıt başarısız oldu.';
                        } catch (jsonError) {
                           return `${t.errors.enrollmentFailedGeneric} (${result.value.statusText})`;
                        }
                    }
                    return '';
                })
            );
            // Add camera play error to translations - REMOVED
            /*
            const cameraPlayErrorKey = 'cameraPlayError';
            const cameraPlayErrorTr = 'Kamera başlatılamadı. Sayfayla etkileşim kurmayı deneyin.';
            const cameraPlayErrorEn = 'Could not start camera. Try interacting with the page.';
            if (t.errors && !t.errors[cameraPlayErrorKey]) {
                if (language === 'tr') { // Assuming 'language' prop or context exists
                   t.errors[cameraPlayErrorKey] = cameraPlayErrorTr;
                } else {
                   t.errors[cameraPlayErrorKey] = cameraPlayErrorEn;
                }
            }
            */

            const combinedError = `${t.errors.someEnrollmentsFailed || 'Bazı derslere kayıt başarısız oldu:'} ${errorMessages.filter(Boolean).join(', ')}`;
            throw new Error(combinedError); // Genel hatayı tetikle
       }


       // Tüm adımlar başarılı
       setEnrollmentStepStatus('success');
       setRegisterSuccess(t.success.registrationComplete || `Kayıt başarılı! Öğrenci ID: ${studentApiId}`);
       // Başarı sonrası formu sıfırlayabilir veya başka bir adım gösterebiliriz.
       // Şimdilik sadece başarı mesajı gösterelim. Yeni kayıt için modalı kapatıp açması gerekir.

     } catch (error: any) {
       setRegisterError(error.message);
       // Hata durumunda hangi adımda kaldıysa onun status'u 'error' olarak kalır.
       // API'den ID geldiyse ama sonraki adımda hata olduysa bile ID'yi gösterelim
       if (registrationStepStatus === 'loading') setRegistrationStepStatus('error');
       if (facePhotoStepStatus === 'loading') setFacePhotoStepStatus('error');
       if (enrollmentStepStatus === 'loading') setEnrollmentStepStatus('error');

     } finally {
       setIsRegistering(false);
     }
  };

  // --- Render Logic ---

  const renderStepContent = () => {
    // TODO: Adım (step) state'ine göre farklı içerikleri göster
    // Şimdilik tüm adımlar bir arada gösterilecek, daha sonra bölünebilir.
    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* --- Adım 1: Form Alanları --- */}
        <h3 className="text-lg font-medium border-b pb-2 mb-4">{t.modal?.personalInfo || 'Kişisel Bilgiler'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Ad */}
          <div className="space-y-1">
              <label htmlFor="first_name" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.form?.firstName || 'Adı'}</label>
              <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input id="first_name" {...register('first_name')} className={inputStyle(!!errors.first_name)} placeholder={t.placeholders?.firstName || "Ahmet"} />
              </div>
              {errors.first_name && <p className="text-xs text-red-500">{errors.first_name.message}</p>}
          </div>
          {/* Soyad */}
          <div className="space-y-1">
              <label htmlFor="last_name" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.form?.lastName || 'Soyadı'}</label>
              <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input id="last_name" {...register('last_name')} className={inputStyle(!!errors.last_name)} placeholder={t.placeholders?.lastName || "Yılmaz"} />
              </div>
              {errors.last_name && <p className="text-xs text-red-500">{errors.last_name.message}</p>}
          </div>
          {/* E-posta */}
          <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.form?.email || 'E-posta'}</label>
              <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input id="email" type="email" {...register('email')} className={inputStyle(!!errors.email)} placeholder={t.placeholders?.email || "ahmet.yilmaz@ornek.edu.tr"} />
              </div>
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>
          {/* Şifre */}
          <div className="space-y-1">
              <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.form?.password || 'Şifre'}</label>
              <div className="relative">
                   <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  {/* TODO: Şifre gösterme butonu eklenebilir */}
                  <input id="password" type="password" {...register('password')} className={inputStyle(!!errors.password)} placeholder="••••••••" />
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
          </div>
          {/* Öğrenci No */}
          <div className="space-y-1">
              <label htmlFor="student_number" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.form?.studentNumber || 'Öğrenci Numarası'}</label>
              <div className="relative">
                   <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input id="student_number" {...register('student_number')} className={inputStyle(!!errors.student_number)} placeholder={t.placeholders?.studentNumber || "2024123456"} />
              </div>
              {errors.student_number && <p className="text-xs text-red-500">{errors.student_number.message}</p>}
          </div>
           {/* Bölüm */}
          <div className="space-y-1">
              <label htmlFor="department" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.form?.department || 'Bölüm'}</label>
              <div className="relative">
                   <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input id="department" {...register('department')} className={inputStyle(!!errors.department)} placeholder={t.placeholders?.department || "Bilgisayar Mühendisliği"} />
              </div>
              {errors.department && <p className="text-xs text-red-500">{errors.department.message}</p>}
          </div>
        </div>

        {/* --- Adım 2: Yüz Fotoğrafı --- */}
        <h3 className="text-lg font-medium border-b pb-2 mb-4 mt-6">{t.modal?.facePhoto || 'Yüz Fotoğrafı'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Önizleme/Kamera Alanı */}
          <div className="border rounded-lg p-3 aspect-square flex items-center justify-center bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
            {photoPreview ? (
              <Image src={photoPreview} alt={t.alt?.photoPreview || "Fotoğraf Önizlemesi"} layout="fill" objectFit="contain" />
            ) : isCameraOpen ? (
              <video ref={videoRef} className="w-full h-full object-cover" playsInline autoPlay muted /> // autoPlay ve playsInline önemli
            ) : (
              <div className="text-center text-gray-500">
                 <Camera className="mx-auto h-12 w-12 mb-2" />
                 {t.modal?.noPhotoSelected || 'Fotoğraf seçilmedi veya kamera kapalı.'}
              </div>
            )}
            <canvas ref={canvasRef} className="hidden"></canvas> {/* Fotoğraf çekmek için gizli canvas */}
          </div>

          {/* Kontroller */}
          <div className="space-y-3">
             <button
               type="button"
               onClick={toggleCamera}
               className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
             >
               <Camera className="h-4 w-4" />
               {isCameraOpen ? (t.buttons?.closeCamera || 'Kamerayı Kapat') : (t.buttons?.openCamera || 'Kamerayı Aç')}
             </button>
             <label htmlFor="photo-upload" className="w-full cursor-pointer flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
               <Upload className="h-4 w-4" />
               {t.buttons?.uploadPhoto || 'Dosya Yükle (.jpg, .png)'}
             </label>
             <input id="photo-upload" type="file" accept="image/jpeg, image/png" className="hidden" onChange={handleFileChange} />
             {isCameraOpen && (
               <button
                 type="button"
                 onClick={takePhoto}
                 className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
               >
                 <Camera className="h-4 w-4" />
                 {t.buttons?.takePhoto || 'Fotoğraf Çek'}
               </button>
             )}
              {photoPreview && (
               <button
                 type="button"
                 onClick={resetPhoto}
                 className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-500 text-red-500 rounded-md text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
               >
                 <Trash2 className="h-4 w-4" />
                 {t.buttons?.resetPhoto || 'Fotoğrafı Sıfırla'}
               </button>
             )}
              {/* Dosya boyutu/tipi hatası */}
             {registerError && (registerError.includes('5MB') || registerError.includes('JPG') || registerError.includes('PNG')) && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-red-600 dark:text-red-400 pt-1 flex items-center gap-1"
                  >
                     <AlertCircle size={14} /> {registerError}
                 </motion.div>
             )}
          </div>
        </div>
         {/* Yüz fotoğrafı yükleme gerekliliği hatası */}
         {registerError && registerError === (t.errors?.photoRequired || "Yüz fotoğrafı yüklenmelidir.") && (
             <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-600 dark:text-red-400 pt-1 flex items-center gap-1"
              >
                 <AlertCircle size={14} /> {registerError}
             </motion.div>
         )}


        {/* --- Adım 3: Ders Seçimi --- */}
        <h3 className="text-lg font-medium border-b pb-2 mb-4 mt-6">{t.modal?.selectCourses || 'Ders Seçimi'}</h3>
        {isLoadingCourses ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">{t.loading?.courses || 'Dersler yükleniyor...'}</span>
          </div>
        ) : coursesError ? (
          <div className="text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
              <AlertCircle size={16}/> {coursesError}
          </div>
        ) : courses.length > 0 ? (
          <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3 bg-gray-50 dark:bg-gray-700/50">
            {courses.map(course => (
              <div key={course.id} className="flex items-center">
                <input
                  type="checkbox"
                  id={`course-${course.id}`}
                  checked={selectedCourses.includes(course.id)}
                  onChange={() => handleCourseSelection(course.id)}
                  className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary dark:bg-gray-600 dark:border-gray-500"
                />
                <label htmlFor={`course-${course.id}`} className="ml-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                  {course.code} - {course.name} ({course.semester})
                </label>
              </div>
            ))}
          </div>
        ) : (
           <p className="text-sm text-gray-500">{t.modal?.noCoursesAvailable || 'Listelenecek ders bulunamadı.'}</p>
        )}
         {/* Ders seçimi gerekliliği hatası */}
         {registerError && registerError === (t.errors?.courseRequired || "En az bir ders seçilmelidir.") && (
             <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-600 dark:text-red-400 pt-1 flex items-center gap-1"
              >
                 <AlertCircle size={14} /> {registerError}
             </motion.div>
         )}


        {/* --- Adım 4: Gönderim ve Durum --- */}
        <div className="mt-8 pt-4 border-t dark:border-gray-600">
          {/* Genel Hata Mesajı (yukarıda gösterilmeyenler) */}
          {registerError && !(registerError === (t.errors?.photoRequired || "Yüz fotoğrafı yüklenmelidir.") || registerError === (t.errors?.courseRequired || "En az bir ders seçilmelidir.") || registerError.includes('5MB') || registerError.includes('JPG') || registerError.includes('PNG')) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-4 flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300"
            >
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>
                {registerError}
                {/* Hata durumunda öğrenci ID'si alındıysa gösterelim */}
                 {newStudentId && registrationStepStatus === 'success' && ` (Öğrenci ID: ${newStudentId})`}
              </span>
            </motion.div>
          )}

          {/* Genel Başarı Mesajı */}
          {registerSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-4 flex items-start gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300"
            >
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>{registerSuccess}</span>
            </motion.div>
          )}

           {/* Adım Durumları */}
          {isRegistering && !registerSuccess && (
              <div className="space-y-2 mb-4 text-sm">
                   <StepStatusIndicator status={registrationStepStatus} text={t.steps?.registeringStudent || 'Öğrenci kaydediliyor...'} errorText={t.errors?.registerFailedShort || 'Kayıt hatası'}/>
                   <StepStatusIndicator status={facePhotoStepStatus} text={t.steps?.uploadingPhoto || 'Yüz fotoğrafı yükleniyor...'} errorText={t.errors?.photoUploadFailedShort || 'Fotoğraf yükleme hatası'}/>
                   <StepStatusIndicator status={enrollmentStepStatus} text={t.steps?.enrollingCourses || 'Derslere kayıt yapılıyor...'} errorText={t.errors?.enrollmentFailedShort || 'Ders kayıt hatası'}/>
              </div>
          )}


          {/* Ana Kayıt Butonu */}
          {!registerSuccess && ( // Başarılıysa butonu gizle
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isRegistering || isLoadingCourses}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 disabled:opacity-60 disabled:pointer-events-none"
            >
              {isRegistering ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>{t.buttons?.registering || 'Kaydediliyor...'}</span>
                </>
              ) : (
                <>
                   <BookCopy className="h-5 w-5" />
                  <span>{t.buttons?.registerAndEnroll || 'Kaydol ve Derslere Katıl'}</span>
                </>
              )}
            </motion.button>
          )}

          {/* Başarı Sonrası Yeni Kayıt Butonu (Opsiyonel) */}
          {registerSuccess && (
             <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                type="button"
                onClick={resetModalState} // Sadece modal içini sıfırla, kapatma
                className="w-full mt-4 flex items-center justify-center gap-2 rounded-md border border-primary px-4 py-2 text-sm font-semibold text-primary shadow-sm hover:bg-primary/10"
             >
                 <UserPlus className="h-5 w-5"/>
                <span>{t.buttons?.newRegistration || 'Yeni Kayıt Yap'}</span>
             </motion.button>
          )}

        </div>
      </form>
    );
  };

  // Input stilleri için yardımcı fonksiyon
  const inputStyle = (hasError: boolean) => cn(
      "flex h-10 w-full rounded-md border bg-background px-3 py-2 pl-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800",
      hasError
        ? "border-destructive focus-visible:ring-destructive dark:border-destructive"
        : "border-input focus-visible:ring-primary dark:focus-visible:ring-primary"
  );

  // Adım durum göstergesi için yardımcı bileşen
  const StepStatusIndicator: React.FC<{status: 'idle' | 'loading' | 'success' | 'error', text: string, errorText: string}> = ({ status, text, errorText }) => {
        let icon = null;
        let textColor = 'text-gray-500 dark:text-gray-400';
        let statusText = text;

        if (status === 'loading') {
            icon = <Loader2 className="h-4 w-4 animate-spin text-primary mr-2 flex-shrink-0" />;
            textColor = 'text-primary dark:text-primary-400';
        } else if (status === 'success') {
            icon = <CheckCircle2 className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />;
            textColor = 'text-green-600 dark:text-green-400';
        } else if (status === 'error') {
            icon = <AlertCircle className="h-4 w-4 text-red-600 mr-2 flex-shrink-0" />;
            textColor = 'text-red-600 dark:text-red-400';
            statusText = errorText; // Hata durumunda özel metin
        } else { // idle
             icon = <div className="h-4 w-4 mr-2 flex-shrink-0 border rounded-full border-gray-400 dark:border-gray-500"></div>; // Bekleyen adım
             statusText = text; // idle durumunda normal metin
        }

        return (
            <div className={`flex items-center ${textColor}`}>
                {icon}
                <span className="flex-grow">{statusText}</span>
            </div>
        );
    };


  // Modal JSX
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="register-student-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" // Daha koyu overlay
          onClick={handleClose} // Overlay tıklaması
        >
          <motion.div
            key="register-student-modal-content"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 18, stiffness: 250 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" // flex-col eklendi
            onClick={(e) => e.stopPropagation()} // İçeriğe tıklayınca kapanmasın
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 rounded-t-xl z-10">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t.registerTitle || 'Öğrenci Kayıt Formu'}
              </h2>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleClose}
                className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                aria-label={t.buttons?.close || 'Kapat'}
              >
                <X className="h-5 w-5" />
              </motion.button>
            </div>

            {/* Content - Scrollable */}
            <div className="p-6 overflow-y-auto flex-grow">
                 <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                     {t.registerDescription || 'Hesabınızı oluşturmak için lütfen aşağıdaki bilgileri doldurun.'}
                 </p>
                 {renderStepContent()}
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 