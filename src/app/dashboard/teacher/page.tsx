"use client"

import React, { useEffect, useState } from 'react'
import { Calendar, Book, Users, Clock, ArrowRight, Plus, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/providers/auth-provider'
import apiService from '@/lib/api'
import { formatDate, cn } from '@/lib/utils'
import { Course, Attendance } from '@/lib/mock-db'

// API'den gelen ders zamanı tipi
type LessonTime = {
  day: string;
  start_time: string;
  end_time: string;
  lesson_number: number;
}

// API'den gelen ders tipi
type ApiCourse = {
  id: number;
  code: string;
  name: string;
  semester: string;
  teacher_id: number;
  lesson_times: LessonTime[];
  created_at: string;
  updated_at: string;
}

// Yoklama özeti tipi
interface AttendanceSummary {
  courseId: string
  courseName: string
  totalSessions: number
  totalStudents: number
  averageAttendance: number
}

// Yaklaşan ders tipi
interface UpcomingLesson {
  id: string
  courseId: string
  courseName: string
  date: string
  startTime: string
  room: string
}

// Günler
const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
const DAY_NAMES = {
  MONDAY: "Pazartesi",
  TUESDAY: "Salı",
  WEDNESDAY: "Çarşamba",
  THURSDAY: "Perşembe",
  FRIDAY: "Cuma",
  SATURDAY: "Cumartesi",
  SUNDAY: "Pazar"
};

// Saat aralıkları
const TIME_SLOTS = [
  { start: "08:00", end: "09:00" },
  { start: "09:00", end: "10:00" },
  { start: "10:00", end: "11:00" },
  { start: "11:00", end: "12:00" },
  { start: "13:00", end: "14:00" },
  { start: "14:00", end: "15:00" },
  { start: "15:00", end: "16:00" },
  { start: "16:00", end: "17:00" },
];

export default function TeacherDashboard() {
  const { user, role, apiUrl, token, teacherId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [apiCourses, setApiCourses] = useState<ApiCourse[]>([])
  const [attendanceSummaries, setAttendanceSummaries] = useState<AttendanceSummary[]>([])
  const [upcomingLessons, setUpcomingLessons] = useState<UpcomingLesson[]>([])

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!token || !teacherId || role !== 'TEACHER') {
        if(role === 'TEACHER' && !teacherId) {
          setLoading(true);
        } else {
          setLoading(false);
        }
        return
      }

      setLoading(true)
      try {
        const response = await fetch(`${apiUrl}/api/teachers/${teacherId}/courses`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          }
        })

        if (!response.ok) {
          throw new Error(`HTTP Hata: ${response.status}`)
        }

        const apiCoursesData = await response.json()
        setApiCourses(apiCoursesData)
        
        const transformedCourses = apiCoursesData.map((course: ApiCourse) => ({
          id: String(course.id),
          code: course.code,
          name: course.name,
          description: `${course.name} - ${course.semester}`,
          semester: course.semester,
          studentIds: [],
          teacherId: String(course.teacher_id),
          schedule: course.lesson_times.map((time: LessonTime) => ({
            day: time.day,
            startTime: time.start_time,
            endTime: time.end_time,
            room: 'A101'
          }))
        }))
        
        setCourses(transformedCourses)
        
        const upcomingMockLessons: UpcomingLesson[] = transformedCourses.slice(0, 3).map((course: Course, index: number) => {
          const today = new Date()
          const tomorrow = new Date(today)
          tomorrow.setDate(today.getDate() + index + 1)
          
          return {
            id: `ul${index + 1}`,
            courseId: course.id,
            courseName: course.name,
            date: tomorrow.toISOString().split('T')[0],
            startTime: course.schedule[0]?.startTime || '10:00',
            room: course.schedule[0]?.room || 'A101'
          }
        })
        
        setUpcomingLessons(upcomingMockLessons)
        
        const mockSummaries: AttendanceSummary[] = transformedCourses.map((course: Course) => {
          const totalStudents = 25
          const averageAttendance = Math.floor(70 + Math.random() * 25)
          
          return {
            courseId: course.id,
            courseName: course.name,
            totalSessions: Math.floor(5 + Math.random() * 20),
            totalStudents,
            averageAttendance
          }
        })
        
        setAttendanceSummaries(mockSummaries)
        
      } catch (error) {
        console.error('Dashboard verileri alınamadı:', error)
        setApiCourses([])
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [token, apiUrl, teacherId, role])

  const isTimeSlotOccupied = (day: string, timeSlot: {start: string, end: string}) => {
    return apiCourses.find(course => 
      course.lesson_times.some(
        time => time.day === day && 
        ((time.start_time <= timeSlot.start && time.end_time > timeSlot.start) || 
         (time.start_time < timeSlot.end && time.end_time >= timeSlot.end) ||
         (time.start_time >= timeSlot.start && time.end_time <= timeSlot.end))
      )
    );
  };

  const getCoursesInTimeSlot = (day: string, timeSlot: {start: string, end: string}) => {
    return apiCourses.filter(course => 
      course.lesson_times.some(
        time => time.day === day && 
        ((time.start_time <= timeSlot.start && time.end_time > timeSlot.start) || 
         (time.start_time < timeSlot.end && time.end_time >= timeSlot.end) ||
         (time.start_time >= timeSlot.start && time.end_time <= timeSlot.end))
      )
    );
  };

  const totalStudents = courses.reduce((total, course) => {
    const uniqueStudents = new Set(course.studentIds)
    return total + uniqueStudents.size
  }, 0)

  const averageAttendance = attendanceSummaries.length 
    ? Math.round(attendanceSummaries.reduce((sum, summary) => sum + summary.averageAttendance, 0) / attendanceSummaries.length) 
    : 0

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-56px)] items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (role !== 'TEACHER' || !teacherId) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-semibold">Erişim Yetkiniz Yok</h1>
        <p className="mt-2 text-muted-foreground">Bu sayfayı görüntülemek için öğretmen olarak giriş yapmalısınız.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 flex-1">
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">{apiCourses.length}</span>
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <Book className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Toplam Ders</p>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">
              {totalStudents}
            </span>
            <div className="rounded-full bg-blue-100 p-2 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
              <Users className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Toplam Öğrenci</p>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">{attendanceSummaries.reduce((sum, summary) => sum + summary.totalSessions, 0)}</span>
            <div className="rounded-full bg-green-100 p-2 text-green-600 dark:bg-green-900 dark:text-green-300">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Toplam Ders Saati</p>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">%{averageAttendance}</span>
            <div className="rounded-full bg-yellow-100 p-2 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300">
              <Clock className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Ortalama Katılım</p>
        </div>
      </div>

      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Derslerim</h2>
          <Link
            href="/dashboard/teacher/courses/new"
            className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Yeni Ders Ekle
          </Link>
        </div>

        {loading ? (
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ) : apiCourses.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/50 p-8 text-center dark:border-gray-800">
            <h3 className="mb-2 text-lg font-medium">Henüz dersiniz yok</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Yoklama almak için önce ders eklemelisiniz.
            </p>
            <Link
              href="/dashboard/teacher/courses/new"
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              İlk Dersinizi Ekleyin
            </Link>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-semibold mb-3">Haftalık Ders Programı</h3>
            <div className="overflow-x-auto rounded-lg border shadow-sm mb-6">
              <table className="w-full min-w-[700px] border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <th className="border p-2 text-left font-medium text-sm w-24">Saat</th>
                    {DAYS.map(day => (
                      <th key={day} className="border p-2 text-left font-medium text-sm">
                        {DAY_NAMES[day as keyof typeof DAY_NAMES]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map((timeSlot, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                      <td className="border p-2 text-center font-medium text-xs w-24">
                        {timeSlot.start}<br/>-<br/>{timeSlot.end}
                      </td>
                      {DAYS.map(day => {
                        const coursesInSlot = getCoursesInTimeSlot(day, timeSlot);
                        return (
                          <td 
                            key={day} 
                            className={`border p-2 align-top ${coursesInSlot.length > 0 ? 'bg-blue-50/60 dark:bg-blue-900/30' : ''}`}
                          >
                            {coursesInSlot.map(course => (
                              <div key={course.id} className="text-xs mb-1.5 p-1.5 rounded bg-white dark:bg-gray-700/50 shadow-sm border border-blue-200 dark:border-blue-800">
                                <div className="font-semibold text-gray-800 dark:text-gray-100">{course.name}</div>
                                <div className="text-gray-500 dark:text-gray-400">{course.code}</div>
                                {course.lesson_times
                                  .filter(time => time.day === day && 
                                    ((time.start_time <= timeSlot.start && time.end_time > timeSlot.start) || 
                                     (time.start_time < timeSlot.end && time.end_time >= timeSlot.end) ||
                                     (time.start_time >= timeSlot.start && time.end_time <= timeSlot.end)))
                                  .map((time, tidx) => (
                                    <div key={tidx} className="text-gray-600 dark:text-gray-300">
                                      {time.start_time} - {time.end_time}
                                    </div>
                                  ))
                                }
                              </div>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {apiCourses.map((course) => (
                <div
                  key={course.id}
                  className="flex flex-col rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="mb-2 text-sm font-medium text-muted-foreground">{course.code}</div>
                  <h3 className="mb-3 text-lg font-bold">{course.name}</h3>
                  <div className="mb-3 text-sm">Dönem: {course.semester}</div>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    {course.lesson_times.map((time, index) => (
                      <div key={index} className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4" />
                        {DAY_NAMES[time.day as keyof typeof DAY_NAMES]} {time.start_time} - {time.end_time}
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-auto pt-4">
                    <Link
                      href={`/dashboard/teacher/courses/edit/${course.id}`}
                      className="flex w-full items-center justify-center rounded-md border border-primary bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                    >
                      Detayları Görüntüle
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-xl font-bold">Yaklaşan Dersler</h2>
        <div className="rounded-lg border shadow-sm overflow-x-auto">
          <table className="w-full min-w-[600px] table-auto">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium">Ders</th>
                <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium">Tarih</th>
                <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium">Saat</th>
                <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium">Sınıf</th>
                <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium">İşlem</th>
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
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="h-4 w-20 animate-pulse rounded bg-muted"></div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="h-8 w-28 animate-pulse rounded bg-muted"></div>
                    </td>
                  </tr>
                ))
              ) : upcomingLessons.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-muted-foreground">
                    Yaklaşan ders bulunmuyor
                  </td>
                </tr>
              ) : (
                upcomingLessons.map((lesson) => (
                  <tr key={lesson.id} className="border-b">
                    <td className="whitespace-nowrap px-6 py-4 text-sm">{lesson.courseName}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      {formatDate(new Date(lesson.date))}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">{lesson.startTime}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">{lesson.room}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <Link
                        href={`/dashboard/teacher/attendance/new?course=${lesson.courseId}&date=${lesson.date}`}
                        className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                      >
                        Yoklama Al
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">Yoklama Özeti</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            [1, 2, 3].map((item) => (
              <div key={item} className="rounded-lg border bg-card p-6 shadow-sm">
                <div className="h-5 w-2/3 animate-pulse rounded bg-muted"></div>
                <div className="mt-4 h-4 w-full animate-pulse rounded bg-muted"></div>
                <div className="mt-2 h-4 w-full animate-pulse rounded bg-muted"></div>
                <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-muted"></div>
              </div>
            ))
          ) : attendanceSummaries.length === 0 ? (
            <div className="col-span-3 rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">Henüz yoklama verisi bulunmuyor</p>
            </div>
          ) : (
            attendanceSummaries.map((summary) => (
              <div key={summary.courseId} className="rounded-lg border bg-card p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold">{summary.courseName}</h3>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Toplam Oturum:</span>
                  <span className="font-medium">{summary.totalSessions}</span>
                </div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Öğrenci Sayısı:</span>
                  <span className="font-medium">{summary.totalStudents}</span>
                </div>
                <div className="mb-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Ortalama Katılım:</span>
                  <span className="font-medium">%{summary.averageAttendance}</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-muted">
                  <div 
                    className={cn(
                      "h-2.5 rounded-full", 
                      summary.averageAttendance >= 85 ? "bg-green-500" :
                      summary.averageAttendance >= 70 ? "bg-yellow-500" : "bg-red-500"
                    )}
                    style={{ width: `${summary.averageAttendance}%` }}
                  ></div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
} 