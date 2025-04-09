"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation'; // Yönlendirme için eklendi
import { Book, Clock, Calendar, Award, ArrowRight, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { useTranslation } from 'react-i18next';
import { formatDate, cn, getAttendanceStatusColor } from '@/lib/utils';

// --- Interface Tanımları ---
interface ApiCourse {
  id: number;
  code: string;
  name: string;
  semester: string;
}

interface DisplayCourse extends ApiCourse {
  attendance_rate: number | null;
}

interface AttendanceDetail {
  id: number;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  lesson_number: number;
  course_id: number;
  course_name: string;
  course_code: string;
}

interface AttendanceResponse {
  attendance_details: Omit<AttendanceDetail, 'course_id' | 'course_name' | 'course_code'>[];
  course_info: {
    id: number;
    name: string;
    code: string;
  };
}

// --- Ana Component ---
export default function StudentDashboard() {
  const { user, token, apiUrl, loading: authLoading, role } = useAuth();
  const { t } = useTranslation();
  const router = useRouter(); // Yönlendirme için router hook'u

  // --- State Tanımları ---
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<DisplayCourse[]>([]);
  const [allAttendanceDetails, setAllAttendanceDetails] = useState<AttendanceDetail[]>([]);

  // --- Ana useEffect (Auth Kontrolü ve Veri Çekme) ---
  useEffect(() => {
    // 1. Auth Yükleniyor mu Kontrolü
    if (authLoading) {
      console.log("StudentDashboard Effect: Auth yükleniyor...");
      setIsLoadingData(true); // Auth yüklenirken veri yükleme de gösterilebilir
      return; // Auth yüklenene kadar bekle
    }

    // 2. Auth Yüklendi, Yetkilendirme Kontrolleri
    if (!user || !token) {
      console.log("StudentDashboard Effect: Auth yüklendi, kullanıcı/token yok. Login'e yönlendiriliyor.");
      router.replace('/auth/login');
      return;
    }

    if (role !== 'STUDENT') {
      console.log(`StudentDashboard Effect: Kullanıcı rolü "${role}" STUDENT değil. Login'e yönlendiriliyor.`);
      router.replace('/auth/login');
      return;
    }

    if (!user.student_id) {
        console.error("StudentDashboard Effect: Kullanıcı STUDENT ama student_id eksik!");
        setError(t('dashboard.error.missingStudentId'));
        setIsLoadingData(false); // Hata durumunda veri yüklemeyi durdur
        return;
    }

    // --- Tüm Kontroller Başarılı, Veri Çek --- 
    console.log("StudentDashboard Effect: Auth ve Yetki kontrolleri başarılı. Veri çekme işlemi başlıyor.");
    const currentStudentId = user.student_id;

    const fetchAllData = async () => {
      setIsLoadingData(true);
      setError(null);
      let fetchedCourses: ApiCourse[] = [];
      let fetchedAttendance: AttendanceDetail[] = [];

      try {
        console.log(`Öğrenci ${currentStudentId} için dersler çekiliyor`);
        const coursesResponse = await fetch(`${apiUrl}/api/students/${currentStudentId}/courses`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        });
        if (!coursesResponse.ok) {
          throw new Error(`${t('dashboard.error.fetchCourses')} (Status: ${coursesResponse.status})`);
        }
        fetchedCourses = await coursesResponse.json();
        console.log("Çekilen dersler:", fetchedCourses);

        if (fetchedCourses.length === 0) {
          console.log("Ders bulunamadı.");
          setCourses([]);
          setAllAttendanceDetails([]);
        } else {
          console.log("Dersler için yoklamalar çekiliyor...");
          const attendancePromises = fetchedCourses.map(async (course) => {
             try {
                const attendanceResponse = await fetch(`${apiUrl}/api/attendance/course/${course.id}/student/${currentStudentId}`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
                });
                if (!attendanceResponse.ok) {
                    console.error(`${course.id} ID'li ders için yoklama çekilemedi: ${attendanceResponse.status}`);
                    return null;
                }
                const data: AttendanceResponse = await attendanceResponse.json();
                return data.attendance_details.map(detail => ({
                    ...detail,
                    course_id: data.course_info.id,
                    course_name: data.course_info.name,
                    course_code: data.course_info.code,
                }));
             } catch (err) {
                console.error(`${course.id} ID'li ders için yoklama çekilirken hata:`, err);
                return null;
             }
          });
          const attendanceResults = await Promise.all(attendancePromises);
          fetchedAttendance = attendanceResults.flat().filter((detail): detail is AttendanceDetail => detail !== null);
          console.log("Çekilen yoklamalar:", fetchedAttendance);
          setAllAttendanceDetails(fetchedAttendance);

          const coursesWithAttendance: DisplayCourse[] = fetchedCourses.map(course => {
            const courseAttendance = fetchedAttendance.filter(att => att.course_id === course.id);
            const total = courseAttendance.length;
            const present = courseAttendance.filter(att => att.status === 'PRESENT' || att.status === 'LATE').length;
            const rate = total > 0 ? Math.round((present / total) * 100) : null;
            return { ...course, attendance_rate: rate };
          });
          setCourses(coursesWithAttendance);
          console.log("Yoklama oranları ile dersler:", coursesWithAttendance);
        }

      } catch (err) {
        console.error("Dashboard verisi çekilirken hata:", err);
        setError(err instanceof Error ? err.message : t('dashboard.error.generic'));
        setCourses([]);
        setAllAttendanceDetails([]);
      } finally {
        setIsLoadingData(false);
        console.log("Veri çekme denemesi tamamlandı.");
      }
    };

    fetchAllData(); // Yetki kontrolleri geçildiyse doğrudan çağır

  // Bağımlılıklar güncellendi: Artık auth yüklemesi bittiğinde ve user/token/role değiştiğinde çalışacak.
  }, [authLoading, user, token, role, apiUrl, t, router]); 

  // --- Hesaplanan Değerler (useMemo) ---
  const stats = useMemo(() => {
    const totalCourses = courses.length;
    const totalClasses = allAttendanceDetails.length;
    const attendedClasses = allAttendanceDetails.filter(att => att.status === 'PRESENT' || att.status === 'LATE').length;
    const averageAttendance = totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 0;
    return { totalCourses, averageAttendance, totalClasses, attendedClasses };
  }, [courses, allAttendanceDetails]);

  const recentAttendance = useMemo(() => {
    return [...allAttendanceDetails]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.lesson_number - a.lesson_number)
      .slice(0, 5);
  }, [allAttendanceDetails]);

  // --- Render Mantığı ---

  // Durum 1: Auth hala yükleniyor MU veya veri yükleniyor MU?
  // Auth yüklenirken de, veri çekilirken de yükleme göster.
  if (authLoading || isLoadingData) { 
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  // Durum 2: Auth yüklendi, veri yükleme bitti AMA user/token/role yok (redirect gerçekleşmiş olmalı ama garanti)
  // VEYA student_id yok (hata state'i set edilmiş olmalı)
  if (!user || !token || role !== 'STUDENT' || !user.student_id) {
     // Bu duruma normalde yukarıdaki useEffect içindeki redirect'ler nedeniyle gelinmemeli.
     // Eğer gelinirse, bir hata mesajı veya boş ekran gösterilebilir, ya da tekrar login'e yönlendirilebilir.
     // Şimdilik sadece hatayı gösterelim (varsa)
     return (
       <div className="container mx-auto px-4 py-8">
         {error && (
           <div className="mb-8 p-4 border border-red-500 bg-red-50 rounded-md text-red-700 flex items-center dark:bg-red-900/20 dark:border-red-700 dark:text-red-300">
             <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0" />
             {error || t('dashboard.errors.accessDeniedMsg')} {/* Genel erişim hatası göster */} 
           </div>
         )}
         {/* Opsiyonel: Login'e dön butonu */} 
         <Link href="/auth/login" className="text-primary hover:underline">{t('dashboard.buttons.login')}</Link>
       </div>
     );
  }

  // Durum 3: Yetkilendirme tamamlandı, veri yüklendi (veya yüklenirken hata oluştu)
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hata Mesajı (Veri çekme hatası) */} 
      {error && (
        <div className="mb-8 p-4 border border-red-500 bg-red-50 rounded-md text-red-700 flex items-center dark:bg-red-900/20 dark:border-red-700 dark:text-red-300">
          <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* İstatistik Kartları */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
         {/* Kart 1: Toplam Ders */}
        <div className="rounded-lg border bg-card p-6 shadow-sm dark:border-gray-800">
          <div className="flex items-center justify-between">
            {isLoadingData && courses.length === 0 ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <span className="text-2xl font-bold">{stats.totalCourses}</span>}
            <div className="rounded-full bg-primary/10 p-2 text-primary dark:bg-primary/20"><Book className="h-6 w-6" /></div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{t('dashboard.stats.totalCourses')}</p>
        </div>
         {/* Kart 2: Ortalama Katılım */}
        <div className="rounded-lg border bg-card p-6 shadow-sm dark:border-gray-800">
          <div className="flex items-center justify-between">
            {isLoadingData ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <span className="text-2xl font-bold">%{stats.averageAttendance}</span>}
            <div className="rounded-full bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"><Award className="h-6 w-6" /></div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{t('dashboard.stats.averageAttendance')}</p>
        </div>
         {/* Kart 3: Toplam Ders Saati */}
        <div className="rounded-lg border bg-card p-6 shadow-sm dark:border-gray-800">
          <div className="flex items-center justify-between">
            {isLoadingData ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <span className="text-2xl font-bold">{stats.totalClasses}</span>}
            <div className="rounded-full bg-green-100 p-2 text-green-600 dark:bg-green-900/30 dark:text-green-400"><Calendar className="h-6 w-6" /></div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{t('dashboard.stats.totalClasses')}</p>
        </div>
         {/* Kart 4: Katılınan Ders Saati */}
        <div className="rounded-lg border bg-card p-6 shadow-sm dark:border-gray-800">
          <div className="flex items-center justify-between">
            {isLoadingData ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <span className="text-2xl font-bold">{stats.attendedClasses}</span>}
            <div className="rounded-full bg-yellow-100 p-2 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"><Clock className="h-6 w-6" /></div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{t('dashboard.stats.attendedClasses')}</p>
        </div>
      </div>

      {/* Derslerim */}
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">{t('dashboard.courses.title')}</h2>
        {/* Veri yükleniyorsa İskelet Göster */}
        {isLoadingData ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="rounded-lg border bg-card p-6 shadow-sm animate-pulse dark:border-gray-800">
                <div className="h-4 w-1/4 rounded bg-muted mb-3 dark:bg-gray-700"></div>
                <div className="h-6 w-3/4 rounded bg-muted mb-4 dark:bg-gray-700"></div>
                <div className="h-4 w-1/2 rounded bg-muted mb-5 dark:bg-gray-700"></div>
                <div className="h-3 w-full rounded bg-muted mb-2 dark:bg-gray-700"></div>
                <div className="h-2 w-full rounded bg-muted mb-6 dark:bg-gray-700"></div>
                <div className="h-10 w-full rounded bg-muted dark:bg-gray-700"></div>
              </div>
            ))}
          </div>
        // Yükleme bitti, hata yok AMA kurs da yoksa
        ) : !error && courses.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/50 p-8 text-center dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-2 text-lg font-medium">{t('dashboard.courses.noCoursesTitle')}</h3>
            <p className="mb-4 text-sm text-muted-foreground">{t('dashboard.courses.noCoursesSubtitle')}</p>
          </div>
        // Yükleme bitti ve kurslar varsa
        ) : !error && courses.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              // --- Kurs Kartı JSX ---
              <div key={course.id} className="flex flex-col rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:hover:border-gray-700">
                 <div className="mb-1 text-sm font-medium text-muted-foreground">{course.code}</div>
                 <h3 className="mb-2 text-lg font-semibold">{course.name}</h3>
                 <div className="mb-4 text-sm text-muted-foreground">{course.semester}</div>
                 <div className="mt-auto space-y-3">
                   <div> {/* Yoklama Oranı */}
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('dashboard.courses.attendanceRate')}:</span>
                        {course.attendance_rate !== null ? <span className="font-medium text-foreground">%{course.attendance_rate}</span> : <span className="text-xs text-muted-foreground italic">{t('dashboard.courses.rateNotAvailable')}</span>}
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted dark:bg-gray-700">
                        {course.attendance_rate !== null && <div className={cn("h-2 rounded-full", course.attendance_rate >= 90 ? "bg-green-500" : course.attendance_rate >= 75 ? "bg-yellow-500" : "bg-red-500")} style={{ width: `${course.attendance_rate}%` }}></div>}
                      </div>
                   </div>
                   <div> {/* Detayları Gör Butonu */}
                      <Link href={`/dashboard/student/attendance?courseId=${course.id}`} className={cn("flex w-full items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors", "border-primary bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground", "dark:bg-primary/20 dark:hover:bg-primary dark:hover:text-primary-foreground")}>
                        {t('dashboard.courses.viewDetails')}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                   </div>
                 </div>
              </div>
              // --- Kurs Kartı JSX Sonu ---
            ))}
          </div>
        ) : null /* Hata durumu yukarıda zaten ele alınıyor */}
      </section>

      {/* Yaklaşan Dersler (Bu kısım placeholder, istersen doldurabilirsin) */}
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">{t('dashboard.upcoming.title')}</h2>
        <div className="rounded-lg border border-dashed bg-muted/50 p-8 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-muted-foreground">{t('dashboard.upcoming.notAvailable')}</p>
        </div>
      </section>

      {/* Son Yoklamalar */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">{t('dashboard.recentAttendance.title')}</h2>
        <div className="rounded-lg border shadow-sm overflow-hidden dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full table-auto text-sm">
              <thead className="bg-muted/50 dark:bg-gray-800/50">
                <tr>
                  <th className="whitespace-nowrap px-6 py-3 text-left font-medium text-muted-foreground uppercase tracking-wider">{t('dashboard.recentAttendance.course')}</th>
                  <th className="whitespace-nowrap px-6 py-3 text-left font-medium text-muted-foreground uppercase tracking-wider">{t('dashboard.recentAttendance.date')}</th>
                  <th className="whitespace-nowrap px-6 py-3 text-left font-medium text-muted-foreground uppercase tracking-wider">{t('dashboard.recentAttendance.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-gray-800">
                {/* Veri yükleniyorsa İskelet Göster */}
                {isLoadingData ? (
                  [1, 2, 3].map((item) => (
                    <tr key={item} className="animate-pulse">
                      <td className="whitespace-nowrap px-6 py-4"><div className="h-4 w-40 rounded bg-muted dark:bg-gray-700"></div></td>
                      <td className="whitespace-nowrap px-6 py-4"><div className="h-4 w-24 rounded bg-muted dark:bg-gray-700"></div></td>
                      <td className="whitespace-nowrap px-6 py-4"><div className="h-5 w-20 rounded-full bg-muted dark:bg-gray-700"></div></td>
                    </tr>
                  ))
                // Yükleme bitti, hata yok AMA veri yoksa
                ) : !error && recentAttendance.length === 0 ? (
                   <tr>
                     <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground">
                       {courses.length === 0 ? t('dashboard.recentAttendance.noCourses') : t('dashboard.recentAttendance.noData')}
                     </td>
                   </tr>
                // Yükleme bitti ve veri varsa
                ) : !error && recentAttendance.length > 0 ? (
                  recentAttendance.map((attendance) => (
                    // --- Yoklama Satırı JSX ---
                    <tr key={attendance.id} className="transition-colors hover:bg-muted/50 dark:hover:bg-gray-800/50">
                      <td className="whitespace-nowrap px-6 py-4 text-foreground">{attendance.course_code} - {attendance.course_name}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">{formatDate(new Date(attendance.date))}</td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", getAttendanceStatusColor(attendance.status))}>
                          {attendance.status === 'PRESENT' && ( <><CheckCircle className="mr-1.5 h-3.5 w-3.5" /> {t('attendance.status.present')} </> )}
                          {attendance.status === 'ABSENT' && ( <><XCircle className="mr-1.5 h-3.5 w-3.5" /> {t('attendance.status.absent')} </> )}
                          {attendance.status === 'LATE' && ( <><Clock className="mr-1.5 h-3.5 w-3.5" /> {t('attendance.status.late')} </> )}
                          {attendance.status === 'EXCUSED' && ( <>{/* İkon eklenebilir */} {t('attendance.status.excused')} </> )}
                        </span>
                      </td>
                    </tr>
                    // --- Yoklama Satırı JSX Sonu ---
                  ))
                ) : null /* Hata durumu yukarıda zaten ele alınıyor */}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}