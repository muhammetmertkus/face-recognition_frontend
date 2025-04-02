"use client"

import React, { useEffect, useState } from 'react'
import { Book, Clock, Calendar, Award, ArrowRight, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/providers/auth-provider'
import apiService from '@/lib/api'
import { formatDate, cn, getAttendanceStatusColor } from '@/lib/utils'

// Kurs tipi tanımı
interface Course {
  id: number
  code: string
  name: string
  semester: string
  description?: string
  attendance_rate?: number
}

// Yoklama detayı
interface AttendanceDetail {
  id: number
  date: string
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
  course_name: string
  course_id: number
  lesson_number: number
}

// Yaklaşan ders tipi
interface UpcomingLesson {
  id: number
  course_id: number
  course_name: string
  date: string
  time: string
  classroom: string
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [attendanceDetails, setAttendanceDetails] = useState<AttendanceDetail[]>([])
  const [upcomingLessons, setUpcomingLessons] = useState<UpcomingLesson[]>([])
  const [stats, setStats] = useState({
    totalCourses: 0,
    averageAttendance: 0,
    totalClasses: 0,
    attendedClasses: 0,
  })

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.student_id) return

      try {
        setLoading(true)
        
        // Bu kısımda öğrencinin verilerini getirme işlemleri yapılacak
        // Şimdilik örnek veriler kullanılacak
        
        // Kurslar
        setCourses([
          {
            id: 1,
            code: 'BIL101',
            name: 'Programlama Temelleri',
            semester: '2023-2024 Güz',
            attendance_rate: 95
          },
          {
            id: 2,
            code: 'BIL203',
            name: 'Veri Yapıları',
            semester: '2023-2024 Güz',
            attendance_rate: 82
          },
          {
            id: 3,
            code: 'BIL301',
            name: 'Veritabanı Sistemleri',
            semester: '2023-2024 Güz',
            attendance_rate: 88
          }
        ])
        
        // Yaklaşan dersler
        setUpcomingLessons([
          {
            id: 1,
            course_id: 1,
            course_name: 'Programlama Temelleri',
            date: formatDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
            time: '09:00',
            classroom: 'A-101'
          },
          {
            id: 2,
            course_id: 2,
            course_name: 'Veri Yapıları',
            date: formatDate(new Date(Date.now() + 48 * 60 * 60 * 1000)),
            time: '13:30',
            classroom: 'B-204'
          }
        ])
        
        // Yoklama detayları
        setAttendanceDetails([
          {
            id: 1,
            date: '2023-10-05',
            status: 'PRESENT',
            course_name: 'Programlama Temelleri',
            course_id: 1,
            lesson_number: 1
          },
          {
            id: 2,
            date: '2023-10-12',
            status: 'ABSENT',
            course_name: 'Veri Yapıları',
            course_id: 2,
            lesson_number: 2
          },
          {
            id: 3,
            date: '2023-10-15',
            status: 'PRESENT',
            course_name: 'Veritabanı Sistemleri',
            course_id: 3,
            lesson_number: 3
          },
        ])
        
        // İstatistikler
        setStats({
          totalCourses: 3,
          averageAttendance: 88,
          totalClasses: 24,
          attendedClasses: 21
        })
        
      } catch (error) {
        console.error('Dashboard verileri alınamadı:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [user])

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hoş Geldiniz Başlığı */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Hoş geldiniz, {user?.first_name || 'Öğrenci'}</h1>
        <p className="mt-2 text-muted-foreground">
          Ders ve yoklama durumunuzu buradan takip edebilirsiniz.
        </p>
      </header>

      {/* İstatistik Kartları */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Toplam Ders Sayısı */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">{stats.totalCourses}</span>
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <Book className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Toplam Ders</p>
        </div>

        {/* Ortalama Katılım Oranı */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">%{stats.averageAttendance}</span>
            <div className="rounded-full bg-blue-100 p-2 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
              <Award className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Ortalama Katılım</p>
        </div>

        {/* Toplam Ders Oturumu */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">{stats.totalClasses}</span>
            <div className="rounded-full bg-green-100 p-2 text-green-600 dark:bg-green-900 dark:text-green-300">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Toplam Ders Oturumu</p>
        </div>

        {/* Katıldığı Dersler */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">{stats.attendedClasses}</span>
            <div className="rounded-full bg-yellow-100 p-2 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300">
              <Clock className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Katıldığı Dersler</p>
        </div>
      </div>

      {/* Derslerim */}
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-bold">Derslerim</h2>
        
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="h-5 w-1/3 animate-pulse rounded bg-muted"></div>
                <div className="mt-2 h-8 animate-pulse rounded bg-muted"></div>
                <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-muted"></div>
                <div className="mt-5 h-10 animate-pulse rounded bg-muted"></div>
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/50 p-8 text-center dark:border-gray-800">
            <h3 className="mb-2 text-lg font-medium">Henüz dersiniz yok</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Kayıtlı olduğunuz herhangi bir ders bulunmuyor.
            </p>
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
                <div className="mb-3 text-sm">{course.semester}</div>
                
                <div className="mt-2 mb-4">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-muted-foreground">Katılım Oranı:</span>
                    <span className="font-medium">%{course.attendance_rate}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div 
                      className={cn(
                        "h-2 rounded-full",
                        course.attendance_rate && course.attendance_rate >= 90 
                          ? "bg-green-500" 
                          : course.attendance_rate && course.attendance_rate >= 75 
                            ? "bg-yellow-500" 
                            : "bg-red-500"
                      )}
                      style={{ width: `${course.attendance_rate}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="mt-auto">
                  <Link
                    href={`/dashboard/student/courses/${course.id}`}
                    className="flex w-full items-center justify-center rounded-md border border-primary bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    Detayları Görüntüle
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Yaklaşan Dersler */}
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-bold">Yaklaşan Dersler</h2>
        <div className="rounded-lg border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium">Ders</th>
                  <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium">Tarih</th>
                  <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium">Saat</th>
                  <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium">Derslik</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1, 2].map((item) => (
                    <tr key={item} className="border-b">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="h-4 w-40 animate-pulse rounded bg-muted"></div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="h-4 w-24 animate-pulse rounded bg-muted"></div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="h-4 w-20 animate-pulse rounded bg-muted"></div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="h-4 w-20 animate-pulse rounded bg-muted"></div>
                      </td>
                    </tr>
                  ))
                ) : upcomingLessons.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                      Yaklaşan ders bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  upcomingLessons.map((lesson) => (
                    <tr key={lesson.id} className="border-b">
                      <td className="whitespace-nowrap px-6 py-4 text-sm">{lesson.course_name}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">{lesson.date}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">{lesson.time}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">{lesson.classroom}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Son Yoklamalar */}
      <section>
        <h2 className="mb-4 text-xl font-bold">Son Yoklamalarım</h2>
        <div className="rounded-lg border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium">Ders</th>
                  <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium">Tarih</th>
                  <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium">Durum</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1, 2, 3].map((item) => (
                    <tr key={item} className="border-b">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="h-4 w-40 animate-pulse rounded bg-muted"></div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="h-4 w-24 animate-pulse rounded bg-muted"></div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="h-4 w-20 animate-pulse rounded bg-muted"></div>
                      </td>
                    </tr>
                  ))
                ) : attendanceDetails.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                      Yoklama kaydı bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  attendanceDetails.map((attendance) => (
                    <tr key={attendance.id} className="border-b">
                      <td className="whitespace-nowrap px-6 py-4 text-sm">{attendance.course_name}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">{formatDate(new Date(attendance.date))}</td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          getAttendanceStatusColor(attendance.status)
                        )}>
                          {attendance.status === 'PRESENT' && (
                            <>
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Var
                            </>
                          )}
                          {attendance.status === 'ABSENT' && (
                            <>
                              <XCircle className="mr-1 h-3 w-3" />
                              Yok
                            </>
                          )}
                          {attendance.status === 'LATE' && 'Geç'}
                          {attendance.status === 'EXCUSED' && 'İzinli'}
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