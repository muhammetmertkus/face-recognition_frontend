"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray, ControllerRenderProps } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/providers/auth-provider'
// Shadcn UI bileşenleri yerine doğrudan HTML kullanacağız
import { PlusCircle, Trash2, ArrowLeft, Loader2, Globe, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from 'next-themes'

// Ders zamanı şeması
const lessonTimeSchema = z.object({
  day: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"], {
    required_error: "Gün seçimi zorunludur.",
  }),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: "Saat HH:MM formatında olmalıdır (örn: 09:00).",
  }),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: "Saat HH:MM formatında olmalıdır (örn: 17:30).",
  }),
  // lesson_number backend'de otomatik atanabilir veya frontend'de index+1 olarak gönderilebilir
}).refine(data => data.start_time < data.end_time, {
  message: "Bitiş saati başlangıç saatinden sonra olmalıdır.",
  path: ["end_time"], // Hatanın hangi alana ait olduğunu belirt
});

// Ders oluşturma formu şeması
const createCourseSchema = z.object({
  code: z.string().min(3, { message: "Ders kodu en az 3 karakter olmalıdır." }).max(10, { message: "Ders kodu en fazla 10 karakter olabilir."}),
  name: z.string().min(5, { message: "Ders adı en az 5 karakter olmalıdır." }).max(100),
  semester: z.string().min(5, { message: "Dönem bilgisi en az 5 karakter olmalıdır." }).max(50),
  description: z.string().max(500).optional(),
  lesson_times: z.array(lessonTimeSchema).min(1, { message: "En az bir ders zamanı eklemelisiniz." }),
})

type CreateCourseValues = z.infer<typeof createCourseSchema>

// Çeviriler
const translations = {
  tr: {
    newCourse: "Yeni Ders Oluştur",
    description: "Yeni bir ders eklemek için aşağıdaki bilgileri doldurun.",
    courseCode: "Ders Kodu",
    courseCodePlaceholder: "örn: BM301",
    courseName: "Ders Adı",
    courseNamePlaceholder: "örn: Veritabanı Yönetim Sistemleri",
    semester: "Dönem",
    semesterPlaceholder: "örn: 2024-2025 Güz",
    descriptionLabel: "Açıklama (İsteğe Bağlı)",
    descriptionPlaceholder: "Ders hakkında kısa bir açıklama...",
    lessonTimes: "Ders Zamanları",
    day: "Gün",
    selectDay: "Gün Seçin",
    startTime: "Başlangıç Saati",
    endTime: "Bitiş Saati",
    addNewLessonTime: "Yeni Ders Zamanı Ekle",
    deleteLessonTime: "Ders zamanını sil",
    createCourse: "Dersi Oluştur",
    creating: "Oluşturuluyor...",
    goBack: "Geri Dön",
    success: "Başarılı!",
    courseCreatedSuccess: '"{name}" dersi başarıyla oluşturuldu.',
    error: "Hata",
    loginRequired: "Giriş yapmanız gerekiyor.",
    courseCreationError: "Ders Oluşturulamadı",
    unknownError: "Bilinmeyen bir hata oluştu.",
    createNew: "Yeni Ders Oluştur",
    viewAllCourses: "Tüm Dersleri Görüntüle",
    successMessage: "Ders başarıyla oluşturuldu!",
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
    newCourse: "Create New Course",
    description: "Fill in the information below to create a new course.",
    courseCode: "Course Code",
    courseCodePlaceholder: "eg: CS101",
    courseName: "Course Name",
    courseNamePlaceholder: "eg: Database Management Systems",
    semester: "Semester",
    semesterPlaceholder: "eg: 2024-2025 Fall",
    descriptionLabel: "Description (Optional)",
    descriptionPlaceholder: "A brief description about the course...",
    lessonTimes: "Lesson Times",
    day: "Day",
    selectDay: "Select Day",
    startTime: "Start Time",
    endTime: "End Time",
    addNewLessonTime: "Add New Lesson Time",
    deleteLessonTime: "Delete lesson time",
    createCourse: "Create Course",
    creating: "Creating...",
    goBack: "Go Back",
    success: "Success!",
    courseCreatedSuccess: 'Course "{name}" was successfully created.',
    error: "Error",
    loginRequired: "You need to be logged in.",
    courseCreationError: "Failed to Create Course",
    unknownError: "An unknown error occurred.",
    createNew: "Create New Course",
    viewAllCourses: "View All Courses",
    successMessage: "Course successfully created!",
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

export default function NewCoursePage() {
  const { user, token, apiUrl } = useAuth() // token ve apiUrl context'ten alınır
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [language, setLanguage] = useState<'tr' | 'en'>('tr')
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [createdCourse, setCreatedCourse] = useState<{id: number, name: string} | null>(null)
  
  // Toast bildirimlerini manuel yönetme
  const [toast, setToast] = useState<{ 
    visible: boolean, 
    title: string, 
    message: string, 
    variant: 'success' | 'error' | 'info' 
  }>({ visible: false, title: '', message: '', variant: 'info' });

  // Çeviriler
  const t = translations[language];

  // Günler listesi 
  const daysOfWeek = [
    { value: "MONDAY", label: t.days.MONDAY },
    { value: "TUESDAY", label: t.days.TUESDAY },
    { value: "WEDNESDAY", label: t.days.WEDNESDAY },
    { value: "THURSDAY", label: t.days.THURSDAY },
    { value: "FRIDAY", label: t.days.FRIDAY },
    { value: "SATURDAY", label: t.days.SATURDAY },
    { value: "SUNDAY", label: t.days.SUNDAY },
  ]

  // Light/dark modu için client tarafında render'ı garanti et
  useEffect(() => {
    setMounted(true)
  }, [])

  const form = useForm<CreateCourseValues>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: {
      code: "",
      name: "",
      semester: "",
      description: "",
      lesson_times: [{ day: "MONDAY", start_time: "", end_time: "" }], // Varsayılan olarak Pazartesi
    },
  })

  // Ders başarıyla oluşturulduktan sonra formu sıfırla
  const resetForm = () => {
    form.reset({
      code: "",
      name: "",
      semester: "",
      description: "",
      lesson_times: [{ day: "MONDAY", start_time: "", end_time: "" }]
    });
  };

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lesson_times",
  });

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'tr' ? 'en' : 'tr');
  };

  const showToast = (title: string, message: string, variant: 'success' | 'error' | 'info' = 'info') => {
    setToast({ visible: true, title, message, variant });
    // 5 saniye sonra toast'u kapat
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 5000);
  };

  const onSubmit = async (values: CreateCourseValues) => {
    if (!token) {
      showToast(t.error, t.loginRequired, "error");
      return;
    }
    setIsLoading(true)

    // İsteği hazırla - belirtilen formatta
    const payload = {
      ...values,
      teacher_id: user?.id || 5, // Kullanıcı ID'si yoksa varsayılan 5 kullan
      lesson_times: values.lesson_times.map((lt, index) => ({
        ...lt,
        lesson_number: index + 1, // Index'e göre ders numarası ata
      })),
    };

    try {
      const response = await fetch(`${apiUrl}/api/courses/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        let errorData
        try {
            errorData = await response.json()
        } catch (e) {
            errorData = { message: `HTTP ${response.status}: ${response.statusText}` }
        }
        throw new Error(errorData.message || errorData.detail || t.unknownError);
      }

      const course = await response.json()
      
      // Başarılı oluşturma durumunda state'i güncelle
      setCreatedCourse({id: course.id, name: course.name});
      showToast(t.success, t.courseCreatedSuccess.replace("{name}", course.name), "success");
      
      // Formu sıfırla
      resetForm();

    } catch (error: any) {
      console.error("Ders oluşturma hatası:", error)
      showToast(t.courseCreationError, error.message || t.unknownError, "error");
    } finally {
      setIsLoading(false)
    }
  }

  // Sayfanın henüz client tarafında yüklenmediği durumda
  if (!mounted) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-white dark:bg-gray-900 min-h-screen">
      {/* Dil değiştirme butonu */}
      <button 
        onClick={toggleLanguage}
        className="fixed top-4 right-4 p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all z-50"
        aria-label="Change language"
      >
        <Globe className="h-5 w-5 text-gray-700 dark:text-gray-300" />
      </button>

      {/* Basit Toast bildirimi */}
      {toast.visible && (
        <div 
          className={`fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 ${
            toast.variant === 'success' ? 'bg-green-100 dark:bg-green-900 border-green-500 text-green-800 dark:text-green-100' : 
            toast.variant === 'error' ? 'bg-red-100 dark:bg-red-900 border-red-500 text-red-800 dark:text-red-100' : 
            'bg-blue-100 dark:bg-blue-900 border-blue-500 text-blue-800 dark:text-blue-100'
          } border-l-4`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold">{toast.title}</h3>
              <p>{toast.message}</p>
            </div>
            <button 
              onClick={() => setToast(prev => ({ ...prev, visible: false }))}
              className="ml-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Üst Navigasyon */}
      <div className="flex justify-between items-center mb-6">
        <Link href="/dashboard/teacher" className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t.goBack}
        </Link>
        <Link 
          href="/dashboard/teacher/courses" 
          className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
        >
          {t.viewAllCourses}
        </Link>
      </div>

      {/* Başarı mesajı - ders oluşturulduktan sonra gösterilir */}
      {createdCourse && (
        <div className="mb-6 p-4 rounded-md bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200">
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">{t.successMessage}</p>
              <p className="mt-1 text-sm">{t.courseCreatedSuccess.replace("{name}", createdCourse.name)}</p>
              <div className="mt-3 flex space-x-3">
                <button 
                  onClick={() => setCreatedCourse(null)} 
                  className="text-sm text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200 font-medium"
                >
                  {t.createNew}
                </button>
                <Link 
                  href="/dashboard/teacher/courses" 
                  className="text-sm text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200 font-medium"
                >
                  {t.viewAllCourses}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ana kart */}
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.newCourse}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t.description}</p>
        </div>

        <div className="p-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Ders Kodu */}
            <div className="space-y-1">
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.courseCode}</label>
              <input
                id="code"
                {...form.register("code")}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder={t.courseCodePlaceholder}
              />
              {form.formState.errors.code && (
                <p className="text-sm text-red-600 dark:text-red-400">{form.formState.errors.code.message}</p>
              )}
            </div>

            {/* Ders Adı */}
            <div className="space-y-1">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.courseName}</label>
              <input
                id="name"
                {...form.register("name")}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder={t.courseNamePlaceholder}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-600 dark:text-red-400">{form.formState.errors.name.message}</p>
              )}
            </div>

            {/* Dönem */}
            <div className="space-y-1">
              <label htmlFor="semester" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.semester}</label>
              <input
                id="semester"
                {...form.register("semester")}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder={t.semesterPlaceholder}
              />
              {form.formState.errors.semester && (
                <p className="text-sm text-red-600 dark:text-red-400">{form.formState.errors.semester.message}</p>
              )}
            </div>

            {/* Açıklama */}
            <div className="space-y-1">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.descriptionLabel}</label>
              <textarea
                id="description"
                {...form.register("description")}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder={t.descriptionPlaceholder}
              />
              {form.formState.errors.description && (
                <p className="text-sm text-red-600 dark:text-red-400">{form.formState.errors.description.message}</p>
              )}
            </div>

            {/* Ders Zamanları */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.lessonTimes}</label>
              <div className="mt-2 space-y-4">
                {fields.map((fieldItem, index) => (
                  <div key={fieldItem.id} className="p-4 relative bg-gray-50 dark:bg-gray-700/40 rounded-md border border-gray-200 dark:border-gray-600">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Gün */}
                      <div className="space-y-1">
                        <label htmlFor={`lesson_times_${index}_day`} className="block text-xs font-medium text-gray-700 dark:text-gray-300">{t.day}</label>
                        <select
                          id={`lesson_times_${index}_day`}
                          {...form.register(`lesson_times.${index}.day` as const)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        >
                          <option value="" disabled>{t.selectDay}</option>
                          {daysOfWeek.map(day => (
                            <option key={day.value} value={day.value}>
                              {day.label}
                            </option>
                          ))}
                        </select>
                        {form.formState.errors.lesson_times?.[index]?.day && (
                          <p className="text-sm text-red-600 dark:text-red-400">
                            {form.formState.errors.lesson_times[index]?.day?.message}
                          </p>
                        )}
                      </div>

                      {/* Başlangıç Saati */}
                      <div className="space-y-1">
                        <label htmlFor={`lesson_times_${index}_start_time`} className="block text-xs font-medium text-gray-700 dark:text-gray-300">{t.startTime}</label>
                        <input
                          id={`lesson_times_${index}_start_time`}
                          type="time"
                          {...form.register(`lesson_times.${index}.start_time` as const)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                        {form.formState.errors.lesson_times?.[index]?.start_time && (
                          <p className="text-sm text-red-600 dark:text-red-400">
                            {form.formState.errors.lesson_times[index]?.start_time?.message}
                          </p>
                        )}
                      </div>

                      {/* Bitiş Saati */}
                      <div className="space-y-1">
                        <label htmlFor={`lesson_times_${index}_end_time`} className="block text-xs font-medium text-gray-700 dark:text-gray-300">{t.endTime}</label>
                        <input
                          id={`lesson_times_${index}_end_time`}
                          type="time"
                          {...form.register(`lesson_times.${index}.end_time` as const)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                        {form.formState.errors.lesson_times?.[index]?.end_time && (
                          <p className="text-sm text-red-600 dark:text-red-400">
                            {form.formState.errors.lesson_times[index]?.end_time?.message}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Silme Butonu */}
                    {fields.length > 1 && (
                      <button
                        type="button"
                        className="absolute top-2 right-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">{t.deleteLessonTime}</span>
                      </button>
                    )}
                  </div>
                ))}

                {/* Ders Zamanı Ekleme Butonu */}
                <button
                  type="button"
                  className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={() => append({ day: "MONDAY", start_time: "", end_time: "" })}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {t.addNewLessonTime}
                </button>

                {/* Genel lesson_times hata mesajı */}
                {form.formState.errors.lesson_times && 
                 !form.formState.errors.lesson_times.root?.message &&
                 typeof form.formState.errors.lesson_times.message === 'string' && (
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">
                    {form.formState.errors.lesson_times.message}
                  </p>
                )}
              </div>
            </div>

            {/* Gönder Butonu */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 ${
                isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.creating}
                </>
              ) : (
                t.createCourse
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
