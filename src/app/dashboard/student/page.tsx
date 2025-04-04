"use client"

import React, { useEffect, useState, useMemo } from 'react'
import { Book, Clock, Calendar, Award, ArrowRight, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/providers/auth-provider'
import { useTranslation } from 'react-i18next'
import { formatDate, cn, getAttendanceStatusColor } from '@/lib/utils'

// Kurs tipi tanımı (API yanıtına uygun)
interface ApiCourse {
  id: number
  code: string
  name: string
  semester: string
  // teacher_id vb. API'den gelebilir ama burada kullanmayacağız
}

// Gösterim için Kurs tipi (hesaplanan attendance_rate ile)
interface DisplayCourse extends ApiCourse {
  attendance_rate: number | null
}

// Yoklama detayı (API yanıtına uygun)
interface AttendanceDetail {
  id: number
  date: string
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
  lesson_number: number
  // Ek alanlar (confidence vb.) API'den gelebilir ama burada kullanmayacağız
  // Hesaplama ve gösterim için course bilgilerini ekleyelim
  course_id: number
  course_name: string
  course_code: string
}

// Yoklama API Yanıtı (Tek ders için)
interface AttendanceResponse {
  attendance_details: Omit<AttendanceDetail, 'course_id' | 'course_name' | 'course_code'>[]
  course_info: {
    id: number
    name: string
    code: string
  }
  // student_info da mevcut ama burada kullanmıyoruz
}

// Yaklaşan ders tipi (Şimdilik kaldırıldı)
// interface UpcomingLesson { ... }

export default function StudentDashboard() {
  // Destructure loading state from useAuth
  const { user, token, apiUrl, loading: authLoading } = useAuth()
  const { t } = useTranslation()
  // Remove separate studentId state, use user?.student_id directly

  // Loading states
  const [isLoadingCourses, setIsLoadingCourses] = useState(true)
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false)

  // Error states
  const [error, setError] = useState<string | null>(null)

  // Data states
  const [courses, setCourses] = useState<DisplayCourse[]>([])
  const [allAttendanceDetails, setAllAttendanceDetails] = useState<AttendanceDetail[]>([])
  // const [upcomingLessons, setUpcomingLessons] = useState<UpcomingLesson[]>([]); // Kaldırıldı

  // Dersleri ve yoklamaları çek
  useEffect(() => {
    // Wait for auth provider to finish loading AND user/token to be available
    if (authLoading || !user?.student_id || !token) {
      // If auth is still loading, just wait.
      // If auth finished but user/token/student_id is missing, handle error or wait state.
      if (!authLoading && user && !user.student_id) {
        console.error("Auth loaded, but user has no student_id.")
        setError(t('dashboard.error.missingStudentId'))
        setIsLoadingCourses(false);
        setIsLoadingAttendance(false);
      } else if (!authLoading && (!user || !token)) {
         // Auth finished, but user/token still missing (e.g., not logged in)
         // This case might be handled by routing, but set loading false just in case.
         setIsLoadingCourses(false);
         setIsLoadingAttendance(false);
      } else {
         // Still waiting for authLoading to become false
         setIsLoadingCourses(true);
         setIsLoadingAttendance(true);
      }
      return;
    }

    // Get studentId directly from user object now that we know it exists
    const currentStudentId = user.student_id;

    const fetchAllData = async () => {
      // Start loading indicators now that we are actually fetching
      setIsLoadingCourses(true);
      setIsLoadingAttendance(true)
      setError(null)
      let fetchedCourses: ApiCourse[] = []
      let fetchedAttendance: AttendanceDetail[] = []

      try {
        // 1. Dersleri Çek (Use currentStudentId)
        const coursesResponse = await fetch(`${apiUrl}/api/students/${currentStudentId}/courses`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        })
        if (!coursesResponse.ok) {
          throw new Error(t('dashboard.error.fetchCourses'))
        }
        fetchedCourses = await coursesResponse.json()
        setIsLoadingCourses(false)

        if (fetchedCourses.length === 0) {
          setIsLoadingAttendance(false)
          setCourses([])
          setAllAttendanceDetails([])
          return // Ders yoksa devam etme
        }

        // 2. Her ders için yoklamayı çek (Use currentStudentId)
        const attendancePromises = fetchedCourses.map(async (course) => {
          try {
            const attendanceResponse = await fetch(`${apiUrl}/api/attendance/course/${course.id}/student/${currentStudentId}`, {
              headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
            })
            if (!attendanceResponse.ok) {
              // Tek bir dersin yoklaması alınamazsa hata logla ama devam et
              console.error(`Failed to fetch attendance for course ${course.id}: ${attendanceResponse.status}`)
              return null // Hatalı ders için null döndür
            }
            const data: AttendanceResponse = await attendanceResponse.json()
            // Gelen yanıta ders bilgilerini ekleyerek AttendanceDetail formatına getir
            return data.attendance_details.map(detail => ({
              ...detail,
              course_id: data.course_info.id,
              course_name: data.course_info.name,
              course_code: data.course_info.code,
            }))
          } catch (err) {
            console.error(`Error fetching attendance for course ${course.id}:`, err)
            return null // Hata durumunda null döndür
          }
        })

        const attendanceResults = await Promise.all(attendancePromises)
        
        // Başarılı ve null olmayan sonuçları birleştir
        fetchedAttendance = attendanceResults.flat().filter((detail): detail is AttendanceDetail => detail !== null)
        setAllAttendanceDetails(fetchedAttendance)

        // 3. Her ders için katılım oranını hesapla ve ders listesini güncelle
        const coursesWithAttendance: DisplayCourse[] = fetchedCourses.map(course => {
          const courseAttendance = fetchedAttendance.filter(att => att.course_id === course.id)
          const total = courseAttendance.length
          const present = courseAttendance.filter(att => att.status === 'PRESENT' || att.status === 'LATE').length // LATE de katılmış sayılabilir?
          const rate = total > 0 ? Math.round((present / total) * 100) : null
          return { ...course, attendance_rate: rate }
        })
        setCourses(coursesWithAttendance)

      } catch (err) {
        console.error("Failed to fetch dashboard data:", err)
        setError(err instanceof Error ? err.message : t('dashboard.error.generic'))
        setIsLoadingCourses(false) // Hata durumunda ikisini de false yap
      } finally {
        // Dersler yüklendi, yoklama yüklemesi de bitti (başarılı veya başarısız)
        setIsLoadingAttendance(false)
      }
    }

    fetchAllData()
    // Add authLoading to dependency array
  }, [authLoading, user, token, apiUrl, t])

  // Hesaplanan İstatistikler (useMemo ile optimize edilebilir)
  const stats = useMemo(() => {
    const totalCourses = courses.length
    const totalClasses = allAttendanceDetails.length
    const attendedClasses = allAttendanceDetails.filter(att => att.status === 'PRESENT' || att.status === 'LATE').length
    // Ortalama katılım: Tüm derslerdeki ortalamaların ortalaması veya genel oran?
    // Şimdilik genel oranı hesaplayalım:
    const averageAttendance = totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 0

    // Alternatif: Ders bazlı oranların ortalaması
    // const validRates = courses.map(c => c.attendance_rate).filter(rate => rate !== null) as number[]
    // const avgRateAlternative = validRates.length > 0 ? Math.round(validRates.reduce((sum, rate) => sum + rate, 0) / validRates.length) : 0

    return {
      totalCourses,
      averageAttendance,
      totalClasses,
      attendedClasses,
    }
  }, [courses, allAttendanceDetails])

  // Son yoklamalar (useMemo ile optimize edilebilir)
  const recentAttendance = useMemo(() => {
    // Tarihe göre tersten sırala (en yeni en üstte)
    return [...allAttendanceDetails]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.lesson_number - a.lesson_number)
      .slice(0, 5) // Son 5 kaydı al
  }, [allAttendanceDetails])

  // Combined loading state: Auth loading OR data fetching loading
  const isLoading = authLoading || isLoadingCourses || isLoadingAttendance;

  // If AuthProvider is loading, show a full page loader
  if (authLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hoş Geldiniz Başlığı Kaldırıldı */}
      {/* 
      <header className="mb-8">
        <h1 className="text-3xl font-bold">{t('dashboard.greeting', { firstName: user?.first_name || t('dashboard.student') })}</h1>
        <p className="mt-2 text-muted-foreground">
          {t('dashboard.subtitle')}
        </p>
      </header>
      */}

      {/* Hata Mesajı */}
      {error && (
        <div className="mb-8 p-4 border border-red-500 bg-red-50 rounded-md text-red-700 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* İstatistik Kartları */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Kartlar - İçerikleri stats'dan alacak şekilde güncellendi */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            {isLoadingCourses ? <Loader2 className="h-6 w-6 animate-spin" /> : <span className="text-2xl font-bold">{stats.totalCourses}</span>}
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <Book className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{t('dashboard.stats.totalCourses')}</p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <span className="text-2xl font-bold">%{stats.averageAttendance}</span>}
            <div className="rounded-full bg-blue-100 p-2 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
              <Award className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{t('dashboard.stats.averageAttendance')}</p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <span className="text-2xl font-bold">{stats.totalClasses}</span>}
            <div className="rounded-full bg-green-100 p-2 text-green-600 dark:bg-green-900 dark:text-green-300">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{t('dashboard.stats.totalClasses')}</p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <span className="text-2xl font-bold">{stats.attendedClasses}</span>}
            <div className="rounded-full bg-yellow-100 p-2 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300">
              <Clock className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{t('dashboard.stats.attendedClasses')}</p>
        </div>
      </div>

      {/* Derslerim */}
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-bold">{t('dashboard.courses.title')}</h2>

        {isLoadingCourses ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="rounded-lg border bg-card p-6 shadow-sm animate-pulse">
                <div className="h-4 w-1/4 rounded bg-muted mb-3"></div>
                <div className="h-6 w-3/4 rounded bg-muted mb-4"></div>
                <div className="h-4 w-1/2 rounded bg-muted mb-5"></div>
                <div className="h-3 w-full rounded bg-muted mb-2"></div>
                <div className="h-2 w-full rounded bg-muted mb-6"></div>
                <div className="h-10 w-full rounded bg-muted"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-dashed border-red-400 bg-red-50 p-8 text-center text-red-700">
            <p>{t('dashboard.courses.error')}</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/50 p-8 text-center dark:border-gray-800">
            <h3 className="mb-2 text-lg font-medium">{t('dashboard.courses.noCoursesTitle')}</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {t('dashboard.courses.noCoursesSubtitle')}
            </p>
            {/* Belki ders ekleme sayfasına link? */}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <div
                key={course.id}
                className="flex flex-col rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-2 text-sm font-medium text-muted-foreground">{course.code}</div>
                <h3 className="mb-3 text-lg font-bold">{course.name}</h3>
                <div className="mb-3 text-sm text-muted-foreground">{course.semester}</div>

                <div className="mt-2 mb-4">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('dashboard.courses.attendanceRate')}:</span>
                    {course.attendance_rate !== null ? (
                      <span className="font-medium">%{course.attendance_rate}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">{t('dashboard.courses.rateNotAvailable')}</span>
                    )}
                  </div>
                  {course.attendance_rate !== null ? (
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-2 rounded-full",
                          course.attendance_rate >= 90
                            ? "bg-green-500"
                            : course.attendance_rate >= 75
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        )}
                        style={{ width: `${course.attendance_rate}%` }}
                      ></div>
                    </div>
                  ) : (
                    <div className="h-2 w-full rounded-full bg-muted"></div> // Oran yoksa boş bar
                  )}
                </div>

                <div className="mt-auto">
                  {/* Link /student/courses/{id} olmalı */}
                  <Link
                    href={`/dashboard/student/attendance?courseId=${course.id}`} // Devamsızlık sayfasına courseId ile git?
                    className="flex w-full items-center justify-center rounded-md border border-primary bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    {t('dashboard.courses.viewDetails')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Yaklaşan Dersler (Şimdilik kaldırıldı/yorumlandı) */}
      {/* <section className="mb-8"> ... </section> */}
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-bold">{t('dashboard.upcoming.title')}</h2>
        <div className="rounded-lg border border-dashed bg-muted/50 p-8 text-center dark:border-gray-800">
          <p className="text-sm text-muted-foreground">
            {t('dashboard.upcoming.notAvailable')}
          </p>
        </div>
      </section>

      {/* Son Yoklamalar */}
      <section>
        <h2 className="mb-4 text-xl font-bold">{t('dashboard.recentAttendance.title')}</h2>
        <div className="rounded-lg border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('dashboard.recentAttendance.course')}</th>
                  <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('dashboard.recentAttendance.date')}</th>
                  <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('dashboard.recentAttendance.status')}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [1, 2, 3].map((item) => (
                    <tr key={item} className="border-b animate-pulse">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="h-4 w-40 rounded bg-muted"></div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="h-4 w-24 rounded bg-muted"></div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="h-4 w-20 rounded bg-muted"></div>
                      </td>
                    </tr>
                  ))
                ) : error ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-red-600">
                      {t('dashboard.recentAttendance.error')}
                    </td>
                  </tr>
                ) : recentAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                      {t('dashboard.recentAttendance.noData')}
                    </td>
                  </tr>
                ) : (
                  recentAttendance.map((attendance) => (
                    <tr key={attendance.id} className="border-b transition-colors hover:bg-muted/50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">{attendance.course_code} - {attendance.course_name}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">{formatDate(new Date(attendance.date))}</td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          getAttendanceStatusColor(attendance.status) // utils fonksiyonu kullanıldı
                        )}>
                          {attendance.status === 'PRESENT' && (
                            <>
                              <CheckCircle className="mr-1 h-3 w-3" />
                              {t('attendance.status.present')}
                            </>
                          )}
                          {attendance.status === 'ABSENT' && (
                            <>
                              <XCircle className="mr-1 h-3 w-3" />
                              {t('attendance.status.absent')}
                            </>
                          )}
                          {attendance.status === 'LATE' && (
                            <>
                              <Clock className="mr-1 h-3 w-3" />
                              {t('attendance.status.late')}
                            </>
                          )}
                          {attendance.status === 'EXCUSED' && (
                            <>
                              {/* İkon eklenebilir */}
                              {t('attendance.status.excused')}
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
