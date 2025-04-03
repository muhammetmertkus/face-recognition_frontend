"use client"

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { formatDate, cn } from '@/lib/utils';
import {
  Calendar, Book, Users, Clock, ArrowRight, Plus, Loader2, BarChart, AlertCircle, CheckCircle, Info, Smile
} from 'lucide-react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { initReactI18next, useTranslation } from "react-i18next";

// --- Tür Tanımları ---

// API'den gelen ders zamanı tipi
interface LessonTime {
  id: number;
  course_id: number;
  created_at: string;
  day: string;
  end_time: string;
  start_time: string;
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
};

// Yoklama detayı tipi (history/page.tsx'den alındı)
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
    // student objesi eklenebilir eğer endpoint veriyorsa
};

// API'den gelen yoklama kaydı tipi (history/page.tsx'den alındı)
type AttendanceRecord = {
    id: number;
    course_id: number;
    date: string;
    lesson_number: number;
    present_students?: { id: number; first_name: string; last_name: string; email: string; student_number: string; }[];
    absent_students?: { id: number; first_name: string; last_name: string; email: string; student_number: string; }[];
    total_students?: number | null;
    recognized_students?: number | null;
    unrecognized_students?: number | null;
    photo_path?: string;
    type?: string;
    emotion_statistics?: Record<string, number> | null;
    created_at: string;
    updated_at: string;
    created_by?: number;
};

// Ders Bazlı Ortalama Katılım Tipi (Grafik için)
interface CourseAttendanceAvg {
  name: string; // Ders kodu veya adı
  averageAttendance: number; // Ortalama katılım yüzdesi
}

// Yaklaşan dersleri saklamak için tip
interface UpcomingLessonInfo {
    course: ApiCourse;
    date: Date;
    startTime: string;
    endTime: string;
}

// Mobil kart görünümü için ders tipi
interface LessonCardItem {
  id: number; // Hata düzeltmesi için eklendi
  course_id: number;
  day: string;
  start_time: string;
  end_time: string;
  lesson_number: number;
  // created_at?: string; // Opsiyonel olarak eklenebilir
  // updated_at?: string; // Opsiyonel olarak eklenebilir
  courseName: string;
  courseCode: string;
}

// Ders Bazlı Duygu Grafiği için Veri Tipi
interface CourseEmotionChartItem {
  courseName: string;
  happy?: number;
  sad?: number;
  angry?: number;
  neutral?: number;
  surprise?: number;
  fear?: number;
  disgust?: number;
  unknown?: number;
  // Yeni duygular eklenirse buraya da eklenmeli
}

// --- Sabitler ---
const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
const TIME_SLOTS = [
  { start: "08:00", end: "09:00" }, { start: "09:00", end: "10:00" }, { start: "10:00", end: "11:00" },
  { start: "11:00", end: "12:00" }, { start: "12:00", end: "13:00" }, // 12-13 eklendi
  { start: "13:00", end: "14:00" }, { start: "14:00", end: "15:00" },
  { start: "15:00", end: "16:00" }, { start: "16:00", end: "17:00" },
  { start: "17:00", end: "18:00" }, { start: "18:00", end: "19:00" }, { start: "19:00", end: "20:00" } // Akşam saatleri eklendi
];

const EMOTION_COLORS: { [key: string]: string } = {
  happy: '#22c55e', // green-500
  sad: '#3b82f6', // blue-500
  angry: '#ef4444', // red-500
  neutral: '#a1a1aa', // zinc-400
  surprise: '#f59e0b', // amber-500
  fear: '#a855f7', // purple-500
  disgust: '#78716c', // stone-500
  unknown: '#64748b', // slate-500
};

// --- Ana Komponent ---
export default function TeacherDashboard() {
  const { t, i18n } = useTranslation();
  const { user, role, apiUrl, token, teacherId, loading: authLoading, isAuthenticated } = useAuth();

  // State'ler
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [apiCourses, setApiCourses] = useState<ApiCourse[]>([]);
  const [allAttendanceRecords, setAllAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [upcomingLessons, setUpcomingLessons] = useState<UpcomingLessonInfo[]>([]);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [failedAttendanceFetches, setFailedAttendanceFetches] = useState<number[]>([]);

  // Refresh logic (giriş sonrası için)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const needsRefresh = sessionStorage.getItem('needsDashboardRefresh');
      if (needsRefresh === 'true') {
        sessionStorage.removeItem('needsDashboardRefresh');
        window.location.reload();
      }
    }
  }, []);

  // Veri Çekme
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!isAuthenticated || role !== 'TEACHER' || !teacherId || !token) {
        setCoursesLoading(false);
        setAttendanceLoading(false);
        if (!authLoading && isAuthenticated && role === 'TEACHER' && !teacherId) {
            // t() burada henüz hazır olmayabilir, statik mesaj daha güvenli
            setDashboardError("Teacher ID information could not be obtained. Please try logging in again.");
        }
        return;
      }

      setDashboardError(null);
      setCoursesLoading(true);
      setAttendanceLoading(false);
      setApiCourses([]);
      setAllAttendanceRecords([]);
      setUpcomingLessons([]);
      setFailedAttendanceFetches([]);

      let fetchedCourses: ApiCourse[] = [];

      try {
        const coursesResponse = await fetch(`${apiUrl}/api/teachers/${teacherId}/courses`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        });
        if (!coursesResponse.ok) {
          throw new Error(t('dashboard.errors.dataLoadFailed') + ` (HTTP ${coursesResponse.status})`);
        }
        fetchedCourses = await coursesResponse.json();
        setApiCourses(fetchedCourses);
        calculateUpcomingLessons(fetchedCourses);

      } catch (error: any) {
        console.error('Error loading courses:', error);
        setDashboardError(error.message || t('dashboard.errors.dataLoadFailed'));
        setCoursesLoading(false);
        return;
      } finally {
        setCoursesLoading(false);
      }

      if (fetchedCourses.length > 0) {
        setAttendanceLoading(true);
        const attendancePromises = fetchedCourses.map(course =>
          fetch(`${apiUrl}/api/courses/${course.id}/attendance`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
          }).then(async (res) => {
            if (!res.ok) {
              const error = new Error(t('dashboard.errors.fetchFailedPartial', { count: course.id }) + ` (HTTP ${res.status})`);
              (error as any).courseId = course.id;
              let responseBody;
              try { responseBody = await res.text(); } catch (e) {}
              console.warn(`Attendance fetch failed for course ${course.id}. Status: ${res.status}. Body: ${responseBody}`);
              throw error;
            }
            const data: AttendanceRecord[] = await res.json();
            return data.map(rec => ({ ...rec, course_id: course.id }));
          })
        );

        try {
          const results = await Promise.allSettled(attendancePromises);
          const successfulRecords: AttendanceRecord[] = [];
          const failedCourseIds: number[] = [];

          results.forEach(result => {
            if (result.status === 'fulfilled') {
              successfulRecords.push(...result.value);
            } else {
              const reason = result.reason as any;
              const courseId = reason?.courseId;
              if (courseId !== undefined) {
                failedCourseIds.push(courseId);
              }
              console.warn(`Attendance fetch rejected for course ID ${courseId ?? 'Unknown'}:`, reason?.message || reason);
            }
          });

          setAllAttendanceRecords(successfulRecords);
          if (failedCourseIds.length > 0) {
            setFailedAttendanceFetches(failedCourseIds);
            console.warn(t('dashboard.errors.attendanceFetchFailed', { count: failedCourseIds.length }));
          }
        } catch (error) {
          console.error("Error processing attendance results:", error);
          setDashboardError(t('dashboard.errors.alertErrorGeneric'));
        } finally {
          setAttendanceLoading(false);
        }
      } else {
         setAttendanceLoading(false);
      }
    };

    if (!authLoading) {
        if (i18n.isInitialized) {
            fetchDashboardData();
        } else {
            // Eğer i18n geç yükleniyorsa, bir kerelik event listener kullan
            i18n.on('initialized', fetchDashboardData);
            return () => { i18n.off('initialized', fetchDashboardData); }
        }
    }

  }, [authLoading, isAuthenticated, role, teacherId, token, apiUrl, t, i18n]);

  // --- Yardımcı Fonksiyonlar ---

  // Saat "HH:MM" formatını dakikaya çevir
  const timeToMinutes = useCallback((time: string | null | undefined): number => {
    if (!time || typeof time !== 'string' || !time.includes(':')) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return (isNaN(hours) ? 0 : hours) * 60 + (isNaN(minutes) ? 0 : minutes);
  }, []);

  // Yaklaşan dersleri hesapla
  const calculateUpcomingLessons = useCallback((courses: ApiCourse[]) => {
    const now = new Date();
    const currentDayIndex = (now.getDay() + 6) % 7; // Pazartesi = 0
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Gelecek 7 gün sınırı

    let potentialUpcoming: UpcomingLessonInfo[] = [];

    courses.forEach(course => {
      if (!course.lesson_times || course.lesson_times.length === 0) return;

      course.lesson_times.forEach(time => {
        const lessonDayIndex = DAYS.indexOf(time.day);
        if (lessonDayIndex < 0) return; // Geçersiz gün

        const lessonStartTimeMinutes = timeToMinutes(time.start_time);

        // Bu haftaki sonraki dersleri bul
        let daysUntilLesson = lessonDayIndex - currentDayIndex;
        if (daysUntilLesson < 0 || (daysUntilLesson === 0 && lessonStartTimeMinutes <= currentTimeMinutes)) {
          // Eğer ders bugündeyse ve geçtiyse veya geçmiş bir günse, sonraki haftaya bak
          daysUntilLesson += 7;
        }

        const lessonDate = new Date(now);
        lessonDate.setDate(now.getDate() + daysUntilLesson);
        lessonDate.setHours(Math.floor(lessonStartTimeMinutes / 60), lessonStartTimeMinutes % 60, 0, 0);

        // Sadece gelecek 7 gün içindekileri ekle
        if (lessonDate <= oneWeekLater) {
          potentialUpcoming.push({
            course,
            date: lessonDate,
            startTime: time.start_time,
            endTime: time.end_time
          });
        }
      });
    });

    // Yaklaşanları tarihe göre sırala ve ilk 5 tanesini al
    potentialUpcoming.sort((a, b) => a.date.getTime() - b.date.getTime());
    setUpcomingLessons(potentialUpcoming.slice(0, 5));
  }, [timeToMinutes]);

  // --- Dinamik Saat Dilimleri (Sadece ders olan saatleri göster) ---
  const dynamicTimeSlots = useMemo(() => {
      if (!apiCourses || apiCourses.length === 0) return [];

      const activeHours = new Set<number>();

      apiCourses.forEach(course => {
          course.lesson_times.forEach(time => {
              const startMinutes = timeToMinutes(time.start_time);
              const endMinutes = timeToMinutes(time.end_time);
              // Dersin bittiği dakikadan bir önceki dakikayı içeren saat dilimi
              const lastMinute = endMinutes > 0 ? endMinutes - 1 : 0;

              const startHour = Math.floor(startMinutes / 60);
              const endHourInclusive = Math.floor(lastMinute / 60);

              for (let h = startHour; h <= endHourInclusive; h++) {
                  // Sadece belirli bir saat aralığını (örn: 8-20) dahil et
                  if (h >= 8 && h < 20) {
                       activeHours.add(h);
                  }
              }
          });
      });

      const sortedHours = Array.from(activeHours).sort((a, b) => a - b);

      return sortedHours.map(hour => ({
          start: `${String(hour).padStart(2, '0')}:00`,
          end: `${String(hour + 1).padStart(2, '0')}:00`,
      }));
  }, [apiCourses, timeToMinutes]);

  // --- İstatistik Hesaplamaları (useMemo ile) ---

  // Genel katılım istatistikleri
  const attendanceStats = useMemo(() => {
    if (allAttendanceRecords.length === 0) {
      return { averageAttendanceRate: 0, totalSessions: 0 };
    }

    let totalPresentSum = 0;
    let totalExpectedSum = 0;
    let totalSessions = 0;

    allAttendanceRecords.forEach(rec => {
        let presentCount = 0;
        let totalCount = 0;
        let sessionValid = false; // Bu oturum hesaplamaya uygun mu?

        // Öncelikli Yöntem: present_students ve total_students kullan
        if (rec.present_students != null && rec.total_students != null && rec.total_students > 0) {
            presentCount = rec.present_students.length;
            totalCount = rec.total_students;
            sessionValid = true;
        }
        // Yedek Yöntem: total_students yoksa veya geçersizse, present + absent dizilerini kullan
        else if (rec.present_students != null && rec.absent_students != null) {
            presentCount = rec.present_students.length;
            const calculatedTotal = rec.present_students.length + rec.absent_students.length;
            if (calculatedTotal > 0) {
                totalCount = calculatedTotal;
                sessionValid = true;
            }
        }
        // Diğer yedekler (recognized_students vs.) API yanıtında olsa da kafa karıştırmamak için şimdilik eklemiyorum.
        // 'details' alanı API yanıtında olmadığı için kaldırıldı.

        // Eğer oturum hesaplamaya uygunsa toplamlara ekle
        if (sessionValid) {
            totalPresentSum += presentCount;
            totalExpectedSum += totalCount;
            totalSessions++;
        }
    });

    const averageAttendanceRate = totalExpectedSum > 0 ? Math.round((totalPresentSum / totalExpectedSum) * 100) : 0;

    return { averageAttendanceRate, totalSessions };
  }, [allAttendanceRecords]);

  // Ders bazlı katılım verileri
  const courseAttendanceData: CourseAttendanceAvg[] = useMemo(() => {
    if (allAttendanceRecords.length === 0 || apiCourses.length === 0) return [];

    // Group records by course_id
    const recordsByCourse: { [key: number]: AttendanceRecord[] } = {};
    allAttendanceRecords.forEach(record => {
      if (!recordsByCourse[record.course_id]) {
        recordsByCourse[record.course_id] = [];
      }
      recordsByCourse[record.course_id].push(record);
    });

    return Object.entries(recordsByCourse).map(([courseIdStr, records]) => {
      const courseId = parseInt(courseIdStr, 10);
      const course = apiCourses.find(c => c.id === courseId);

      let presentSum = 0;
      let expectedSum = 0;
      let validSessionsInCourse = 0;

      records.forEach(record => {
        let presentInRecord = 0;
        let expectedInRecord = 0;
        let sessionValid = false;

        // Öncelikli Yöntem: present_students ve total_students kullan
        if (record.present_students != null && record.total_students != null && record.total_students > 0) {
          presentInRecord = record.present_students.length;
          expectedInRecord = record.total_students;
          sessionValid = true;
        }
        // Yedek Yöntem: total_students yoksa veya geçersizse, present + absent dizilerini kullan
        else if (record.present_students != null && record.absent_students != null) {
          presentInRecord = record.present_students.length;
          const calculatedTotal = record.present_students.length + record.absent_students.length;
          if (calculatedTotal > 0) {
            expectedInRecord = calculatedTotal;
            sessionValid = true;
          }
        }

        if (sessionValid) {
          presentSum += presentInRecord;
          expectedSum += expectedInRecord;
          validSessionsInCourse++;
        }
      });

      const averageAttendance = expectedSum > 0 ? Math.round((presentSum / expectedSum) * 100) : 0;

      return {
        name: course?.code || `Ders ${courseId}`,
        averageAttendance: averageAttendance,
      };
    }).filter(data => data.averageAttendance != null);
  }, [allAttendanceRecords, apiCourses]);

  // --- Ders Bazlı Duygu İstatistikleri (Yığılmış Çubuk Grafik için) ---
  const courseEmotionChartData = useMemo(() => {
    if (allAttendanceRecords.length === 0 || apiCourses.length === 0) return [];

    // 1. Veriyi ders ID'sine göre grupla ve her ders için duygu sayılarını topla
    const statsByCourse: { [key: number]: { [emotion: string]: number } } = {};
 
    allAttendanceRecords.forEach(record => {
      if (!record.course_id) return; // Kurs ID yoksa atla

      if (!statsByCourse[record.course_id]) {
        statsByCourse[record.course_id] = {}; // Bu ders için ilk kayıt
      }

      if (record.emotion_statistics) {
        Object.entries(record.emotion_statistics).forEach(([emotion, count]) => {
          const lowerCaseEmotion = emotion.toLowerCase();
          statsByCourse[record.course_id][lowerCaseEmotion] = (statsByCourse[record.course_id][lowerCaseEmotion] || 0) + count;
        });
      }
    });
 
    // 2. Veriyi Recharts Stacked Bar Chart formatına dönüştür
    const chartData = apiCourses
      .map(course => {
        const courseEmotions = statsByCourse[course.id];
        if (!courseEmotions || Object.keys(courseEmotions).length === 0) {
           // Bu ders için duygu verisi yoksa, grafikte göstermemek için null döndür
           return null;
        }
 
        // CourseEmotionChartItem tipinde nesne oluştur
        const dataPoint: CourseEmotionChartItem = {
          courseName: course.code, // Kısa etiket için kod kullan
        };
 
        // Bilinen tüm duygu türleri için değeri ekle (varsa 0)
        Object.keys(EMOTION_COLORS).forEach(emotionKey => {
           if (emotionKey in dataPoint) { // Tip güvenliği için kontrol (opsiyonel)
              (dataPoint as any)[emotionKey] = courseEmotions[emotionKey] || 0;
           } else {
              // Eğer EMOTION_COLORS'de olup CourseEmotionChartItem'da olmayan bir anahtar varsa
              // buraya düşer, bu durumu ele almak isteyebilirsiniz.
              // Şimdilik bilinenleri atamak için `as any` kullanıyoruz.
              // Daha güvenli yol: `CourseEmotionChartItem` tanımını tam tutmak.
               (dataPoint as any)[emotionKey] = courseEmotions[emotionKey] || 0;
           }
        });
 
        return dataPoint;
      })
      .filter(data => data !== null); // Duygu verisi olmayan dersleri filtrele
 
      // Filtrelenmiş verinin tipini doğrula
      return chartData as CourseEmotionChartItem[]; // Doğru tipi kullan
 
  }, [allAttendanceRecords, apiCourses]);

  // --- Haftalık Program Yardımcıları ---

  // Verilen zaman aralığında ders var mı? (useCallback ile optimize edilebilir)
  const isTimeSlotOccupied = useCallback((day: string, timeSlot: {start: string, end: string}) => {
      const slotStartMinutes = timeToMinutes(timeSlot.start);
      const slotEndMinutes = timeToMinutes(timeSlot.end);
      // API'den gelen gün adı (büyük harf İngilizce) ile doğrudan karşılaştır
      return apiCourses.some(course =>
        course.lesson_times.some(time => {
          if (time.day !== day) return false;
          const lessonStartMinutes = timeToMinutes(time.start_time);
          const lessonEndMinutes = timeToMinutes(time.end_time);
          // Ders, zaman aralığıyla kesişiyor mu?
          return lessonStartMinutes < slotEndMinutes && lessonEndMinutes > slotStartMinutes;
        })
      );
  }, [apiCourses, timeToMinutes]);

  // Verilen zaman aralığındaki dersleri getir (useCallback ile optimize edilebilir)
  const getCoursesInTimeSlot = useCallback((day: string, timeSlot: {start: string, end: string}) => {
      const slotStartMinutes = timeToMinutes(timeSlot.start);
      const slotEndMinutes = timeToMinutes(timeSlot.end);
      // API'den gelen gün adı (büyük harf İngilizce) ile doğrudan karşılaştır
    return apiCourses.filter(course => 
        course.lesson_times.some(time => {
          if (time.day !== day) return false;
          const lessonStartMinutes = timeToMinutes(time.start_time);
          const lessonEndMinutes = timeToMinutes(time.end_time);
          return lessonStartMinutes < slotEndMinutes && lessonEndMinutes > slotStartMinutes;
        })
      );
  }, [apiCourses, timeToMinutes]);

  // --- Render Logic ---

  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100vh-150px)] items-center justify-center text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">{t('loading')}</p>
      </div>
    );
  }

  if (!isAuthenticated || role !== 'TEACHER') {
    return (
      <div className="flex min-h-[calc(100vh-150px)] flex-col items-center justify-center text-center">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h1 className="mt-4 text-2xl font-semibold text-destructive">{t('dashboard.errors.accessDenied')}</h1>
        <p className="mt-2 text-muted-foreground">{t('dashboard.errors.accessDeniedMsg')}</p>
        <Link href="/auth/login" className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            {t('dashboard.buttons.login')}
        </Link>
      </div>
    );
  }

   if (!teacherId && !authLoading) {
      return (
         <div className="flex min-h-[calc(100vh-150px)] flex-col items-center justify-center text-center">
           <AlertCircle className="h-12 w-12 text-yellow-500" />
           <h1 className="mt-4 text-2xl font-semibold text-yellow-700">{t('dashboard.errors.teacherInfoNotFound')}</h1>
           <p className="mt-2 text-muted-foreground">{t('dashboard.errors.teacherInfoNotFoundMsg')}</p>
           <button
             onClick={() => window.location.reload()}
             className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
           >
             {t('dashboard.buttons.tryAgain')}
           </button>
         </div>
       );
   }

  if (dashboardError) {
    return (
      <div className="flex min-h-[calc(100vh-150px)] flex-col items-center justify-center text-center">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h1 className="mt-4 text-2xl font-semibold text-destructive">{t('dashboard.errors.dataLoadFailed')}</h1>
        <p className="mt-2 text-muted-foreground">{dashboardError}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t('dashboard.buttons.tryAgain')}
        </button>
      </div>
    );
  }

  if (coursesLoading) {
     return (
       <div className="flex min-h-[calc(100vh-150px)] items-center justify-center text-center">
         <Loader2 className="h-12 w-12 animate-spin text-primary" />
         <p className="ml-4 text-lg text-muted-foreground">{t('dashboard.loading.courses')}</p>
       </div>
     );
   }

  // Ana içeriği Suspense ile sarmala
  return (
    <Suspense fallback={
      <div className="flex min-h-[calc(100vh-150px)] items-center justify-center text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">{t('loading')}</p>
      </div>
    }>
      <div className="container mx-auto px-4 py-8 flex-1 space-y-8">
        {/* İstatistik Kartları */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Toplam Ders Kartı */}
          <div className="rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{apiCourses.length}</span>
              <div className="rounded-full bg-primary/10 p-3 text-primary">
                <Book className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-2 text-sm font-medium text-muted-foreground">{t('dashboard.stats.totalCourses')}</p>
          </div>

          {/* Ortalama Katılım Kartı */}
          <div className="rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {attendanceLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : allAttendanceRecords.length > 0 ? (
                  `${attendanceStats.averageAttendanceRate}%`
                ) : (
                  <span className='text-gray-400 dark:text-gray-500'>{t('dashboard.stats.notAvailable')}</span>
                )}
              </span>
              <div className="rounded-full bg-yellow-100 p-3 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300">
                <CheckCircle className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-2 text-sm font-medium text-muted-foreground">{t('dashboard.stats.avgAttendance')}</p>
            {failedAttendanceFetches.length > 0 && !attendanceLoading && (
               <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">{t('dashboard.stats.dataMissing', { count: failedAttendanceFetches.length })}</p>
            )}
          </div>

          {/* Toplam Yoklama Oturumu Kartı */}
          <div className="rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {attendanceLoading ? (
                   <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : allAttendanceRecords.length > 0 ? (
                   attendanceStats.totalSessions
                ) : (
                   <span className='text-gray-400 dark:text-gray-500'>{t('dashboard.stats.notAvailable')}</span>
                )}
              </span>
              <div className="rounded-full bg-green-100 p-3 text-green-600 dark:bg-green-900 dark:text-green-300">
                <Calendar className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-2 text-sm font-medium text-muted-foreground">{t('dashboard.stats.totalSessions')}</p>
             {failedAttendanceFetches.length > 0 && !attendanceLoading && (
               <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">{t('dashboard.stats.dataMissing', { count: failedAttendanceFetches.length })}</p>
            )}
          </div>
        </div>

         {/* Yoklama verisi yükleniyor bilgisi */}
         {attendanceLoading && (
           <div className="flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
             {t('dashboard.loading.attendance')}...
          </div>
         )}
         {/* Yoklama verisi yükleme hataları uyarısı */}
         {failedAttendanceFetches.length > 0 && !attendanceLoading && (
           <div className="flex items-center rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
             <AlertCircle className="mr-2 h-4 w-4 flex-shrink-0" />
             <span>{t('dashboard.errors.partialAttendanceError', { count: failedAttendanceFetches.length })}</span>
            </div>
         )}


        {/* ----- Responsive Ders Programı ----- */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('dashboard.schedule.title')}</h2>

          {/* --- Tablo Görünümü (Orta ve Geniş Ekranlar) --- */}
          <div className="hidden md:block">
            {apiCourses.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-10 text-center">
                   <Calendar className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                   <p className="mt-4 font-medium text-muted-foreground">{t('dashboard.schedule.noCoursesYet')}</p>
                   <Link href="/dashboard/teacher/courses/new" className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                      <Plus className="mr-2 h-4 w-4" /> {t('dashboard.buttons.addFirstCourse')}
                   </Link>
                </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <table className="w-full min-w-[700px] border-collapse bg-white dark:bg-gray-800">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50">
                      <th className="border-b border-gray-200 dark:border-gray-700 p-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 w-20">{t('dashboard.schedule.hour')}</th>
                      {DAYS.map(day => (
                        <th key={day} className="border-b border-gray-200 dark:border-gray-700 p-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 min-w-[100px]">
                          {t(`days.${day}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {dynamicTimeSlots.length === 0 && apiCourses.length > 0 ? (
                        <tr>
                            <td colSpan={DAYS.length + 1} className="p-4 text-center text-muted-foreground">
                                {t('dashboard.schedule.noCoursesInView')}
                            </td>
                        </tr>
                    ) : (dynamicTimeSlots.map((timeSlot, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors duration-150">
                        <td className="border-r border-gray-200 dark:border-gray-700 p-2 text-center font-medium text-xs text-gray-500 dark:text-gray-400 w-20">
                          {timeSlot.start}<br/>-<br/>{timeSlot.end}
                        </td>
                        {DAYS.map(day => {
                          const coursesInSlot = getCoursesInTimeSlot(day, timeSlot);
                          return (
                            <td
                              key={`${day}-${timeSlot.start}`}
                              className={cn(
                                  "border-r border-gray-200 dark:border-gray-700 p-1 align-top transition-colors duration-150 min-w-[100px]",
                                  coursesInSlot.length > 0 ? 'bg-primary/5 dark:bg-primary/10' : '',
                              )}
                              style={{ minHeight: '60px' }}
                            >
                              {coursesInSlot.map(course => (
                                <div key={course.id} className="text-xs mb-1 p-1.5 rounded bg-white dark:bg-gray-700/60 shadow-sm border border-primary/20 dark:border-primary/30 hover:shadow-md transition-shadow duration-150">
                                  <div className="block group">
                                    <div className="font-semibold text-gray-800 dark:text-gray-100 group-hover:text-primary dark:group-hover:text-primary-light truncate">{course.name}</div>
                                    <div className="text-gray-500 dark:text-gray-400 text-[11px]">{course.code}</div>
                                  {course.lesson_times
                                      .filter(time => time.day === day && timeToMinutes(time.start_time) < timeToMinutes(timeSlot.end) && timeToMinutes(time.end_time) > timeToMinutes(timeSlot.start))
                                    .map((time, tidx) => (
                                        <div key={tidx} className="text-gray-600 dark:text-gray-300 text-[10px]">
                                        {time.start_time} - {time.end_time}
                                      </div>
                                    ))
                                  }
                                  </div>
                                </div>
                              ))}
                            </td>
                          );
                        })}
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* --- Kart Görünümü (Küçük Ekranlar) --- */}
          <div className="block md:hidden space-y-4">
             {apiCourses.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-6 text-center">
                   <Calendar className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                   <p className="mt-3 font-medium text-muted-foreground">{t('dashboard.schedule.noCoursesYet')}</p>
                   <Link href="/dashboard/teacher/courses/new" className="mt-3 inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                      <Plus className="mr-1.5 h-3 w-3" /> {t('dashboard.buttons.addFirstCourse')}
                   </Link>
                </div>
             ) : (
                DAYS.map(day => {
                  // O güne ait dersleri ve zamanlarını filtrele ve sırala
                  const lessonsForDay: LessonCardItem[] = apiCourses
                    .flatMap(course =>
                      course.lesson_times
                        .filter(time => time.day === day)
                        .map(time => ({
                          id: time.id,
                          course_id: time.course_id,
                          day: time.day,
                          start_time: time.start_time,
                          end_time: time.end_time,
                          lesson_number: time.lesson_number,
                          courseName: course.name,
                          courseCode: course.code
                        }))
                    )
                    .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

                  if (lessonsForDay.length === 0) {
                    return null; // O gün ders yoksa kart oluşturma
                  }

                  return (
                    <div key={day} className="rounded-lg border bg-card shadow-sm dark:bg-gray-800 dark:border-gray-700">
                      <h3 className="text-base font-semibold px-4 py-2 border-b bg-gray-50 dark:bg-gray-700/50 dark:border-gray-700 rounded-t-lg">{t(`days.${day}`)}</h3>
                      <ul className="divide-y dark:divide-gray-700/60 p-3 space-y-2">
                        {lessonsForDay.map((lesson) => (
                          <li key={lesson.id} className="pt-2 first:pt-0">
                            <p className="font-medium text-sm text-gray-800 dark:text-gray-100">{lesson.courseName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{lesson.courseCode}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                              <Clock className="inline-block h-3 w-3 mr-1 align-[-1px]"/>
                              {lesson.start_time} - {lesson.end_time}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })
             )}
          </div>
        </div>

        {/* Ders Bazlı Katılım Grafiği (Programın altına taşındı) */}
        <div className="lg:col-span-3"> {/* Tam genişlik alması için lg:col-span-3 */} 
           <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('dashboard.attendanceChart.title')}</h2>
           <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-card dark:bg-gray-800 p-4 shadow-sm h-[400px]">
             {attendanceLoading ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                  <p>{t('dashboard.loading.attendance')}</p>
                </div>
             ) : courseAttendanceData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <RechartsBarChart
                   data={courseAttendanceData}
                   margin={{ top: 5, right: 5, left: -25, bottom: 50 }} // Sol marjini azalttık, alt marjini artırdık
                 >
                   <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} vertical={false}/>
                   <XAxis
                      dataKey="name" // Ders kodunu göster
                      angle={-60} // Etiketleri daha fazla eğ
                      textAnchor="end"
                      height={60} // Etiketler için daha fazla yer
                      interval={0} // Tüm etiketleri göster
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} // Stil
                      dy={5} // Dikey kaydırma
                    />
                   <YAxis
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      width={40} // Y ekseni için yer
                    />
                   <Tooltip
                     formatter={(value: number) => [`${value}%`, t('dashboard.attendanceChart.tooltipLabel')]}
                     contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem' }}
                     labelStyle={{ color: 'hsl(var(--foreground))' }}
                     itemStyle={{ color: '#8884d8' }}
                   />
                   <Bar dataKey="averageAttendance" fill="#8884d8" name={t('dashboard.attendanceChart.barName')} barSize={20} radius={[4, 4, 0, 0]} />
                 </RechartsBarChart>
               </ResponsiveContainer>
             ) : (
               <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                 <BarChart className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                 <p className="font-medium">{t('dashboard.attendanceChart.noData')}</p>
                 <p className="text-sm">
                    {allAttendanceRecords.length > 0
                        ? t('dashboard.attendanceChart.insufficientDataMsg')
                        : t('dashboard.attendanceChart.noDataMsg')
                    }
                 </p>
                  {failedAttendanceFetches.length > 0 && (
                     <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">{t('dashboard.errors.fetchFailedPartial', { count: failedAttendanceFetches.length })}</p>
                  )}
               </div>
             )}
           </div>
              </div>
              
        {/* Yaklaşan Dersler Bölümü */}
        <section>
           <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('dashboard.upcoming.title')}</h2>
           {apiCourses.length > 0 && upcomingLessons.length === 0 && !coursesLoading && (
               <p className="text-muted-foreground">{t('dashboard.upcoming.none')}</p>
           )}
           {apiCourses.length === 0 && !coursesLoading && (
               <p className="text-muted-foreground">{t('dashboard.upcoming.noneDueToEmptySchedule')}</p>
           )}
           {upcomingLessons.length > 0 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                 {upcomingLessons.map(({ course, date, startTime, endTime }, index) => (
                  <div
                    key={`${course.id}-${index}`}
                    className="flex flex-col rounded-lg border border-gray-200 dark:border-gray-700 bg-card dark:bg-gray-800 p-4 shadow-sm transition-shadow hover:shadow-lg"
                  >
                    <div className="mb-2 flex justify-between items-center">
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">{course.code}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(date.toISOString().split('T')[0])}</span>
                    </div>
                    <h3 className="mb-1 text-base font-semibold text-gray-900 dark:text-white truncate">{course.name}</h3>
                    <p className="text-xs text-muted-foreground mb-3">{course.semester}</p>

                    <div className="flex items-center text-sm text-muted-foreground mb-1">
                      <Calendar className="mr-1.5 h-4 w-4 flex-shrink-0" />
                      {t(`days.${DAYS[(date.getDay() + 6) % 7]}`)}
                        </div>
                    <div className="flex items-center text-sm text-muted-foreground mb-4">
                      <Clock className="mr-1.5 h-4 w-4 flex-shrink-0" />
                      {startTime} - {endTime}
                    </div>
                    
                    <div className="mt-auto">
                      <Link
                         href={`/dashboard/teacher/attendance/new?courseId=${course.id}&date=${date.toISOString().split('T')[0]}&startTime=${startTime}`}
                         className={cn(
                            "flex w-full items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90",
                            !course.id && "cursor-not-allowed opacity-50"
                          )}
                          aria-disabled={!course.id}
                          onClick={(e) => {
                            if (!course.id) {
                              e.preventDefault();
                              alert(t('dashboard.errors.takeAttendanceAlert'));
                            }
                          }}
                          title={`${t('dashboard.buttons.takeAttendance')}: ${course.name} (${formatDate(date.toISOString().split('T')[0])} ${startTime})`}
                       >
                         <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                         {t('dashboard.buttons.takeAttendance')}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
          )}
        </section>

         {/* Hızlı Linkler */}
         <div className="flex flex-wrap gap-x-4 gap-y-2 mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
           <Link href="/dashboard/teacher/courses" className="text-sm font-medium text-primary hover:underline inline-flex items-center">
              <Book className="mr-1 h-4 w-4"/> {t('dashboard.quickLinks.manageCourses')}
           </Link>
           <Link href="/dashboard/teacher/students" className="text-sm font-medium text-primary hover:underline inline-flex items-center">
              <Users className="mr-1 h-4 w-4"/> {t('dashboard.quickLinks.manageStudents')}
           </Link>
           <Link href="/dashboard/teacher/attendance/history" className="text-sm font-medium text-primary hover:underline inline-flex items-center">
              <Calendar className="mr-1 h-4 w-4"/> {t('dashboard.quickLinks.attendanceHistory')}
         </Link>
         </div>

          {/* --- Derslere Göre Duygu Dağılım Grafiği --- */}
          <div className="lg:col-span-3 mt-8">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('dashboard.emotionChart.title')}</h2>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-card dark:bg-gray-800 p-4 shadow-sm h-[450px] flex items-center justify-center"> {/* Yüksekliği artırdık */} 
               {attendanceLoading ? (
                 <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
                   <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                   <p>{t('dashboard.loading.attendanceAndEmotion')}</p>
                 </div>
               ) : courseEmotionChartData && courseEmotionChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart
                      data={courseEmotionChartData}
                      margin={{ top: 5, right: 5, left: -15, bottom: 50 }} // Alt marj artırıldı, sol azaltıldı
                      barCategoryGap={"15%"} // Barlar arası boşluk
                    >
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} vertical={false} />
                      <XAxis
                        dataKey="courseName"
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        interval={0}
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        dy={5}
                      />
                      <YAxis
                         allowDecimals={false} // Tam sayı göster
                         tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                         width={35}
                      />
                      <Tooltip
                         cursor={{ fill: 'hsla(var(--muted)/0.1)' }}
                         contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem' }}
                         labelStyle={{ color: 'hsl(var(--foreground))' , fontWeight: 'bold'}}
                         itemSorter={(item) => -(item.value || 0)} // Değere göre ters sırala (en yüksek üstte)
                      />
                      {/* Legend'ı dinamik yap */}
                       <Legend wrapperStyle={{paddingTop: '20px'}} formatter={(value, entry) => t(`emotions.${entry.dataKey}`)} />
                       {/* EMOTION_COLORS anahtarları üzerinden dön */}
                      {Object.keys(EMOTION_COLORS).map((key) => (
                          <Bar
                              key={key}
                              dataKey={key}
                              stackId="a" // Aynı stackId'ye sahip barlar yığılır
                              name={t(`emotions.${key}`)} // Legend ve Tooltip için isim
                              fill={EMOTION_COLORS[key] || EMOTION_COLORS.unknown}
                              radius={[2, 2, 0, 0]} // Hafif yuvarlak köşeler
                           />
                      ))}
                    </RechartsBarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
                    <Smile className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                    <p className="font-medium">{t('dashboard.emotionChart.noData')}</p>
                    <p className="text-sm">{t('dashboard.emotionChart.noDataMsg')}</p>
                    {failedAttendanceFetches.length > 0 && (
                       <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">{t('dashboard.errors.partialEmotionError', { count: failedAttendanceFetches.length })}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
      </div>
    </Suspense>
  );
} 