"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useTranslation } from 'react-i18next';
import { BookOpen, Loader2, AlertTriangle, PlusCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

// Ders verisi için interface
interface Course {
    id: number;
    name: string;
    code: string;
    semester: string;
    // Gerekirse diğer alanlar eklenebilir (teacher_id vb.)
}

export default function StudentCoursesPage() {
    const { t } = useTranslation();
    const { user, token } = useAuth();
    const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
    const [allCourses, setAllCourses] = useState<Course[]>([]);
    const [isLoadingEnrolled, setIsLoadingEnrolled] = useState(true);
    const [isLoadingAll, setIsLoadingAll] = useState(true);
    const [errorEnrolled, setErrorEnrolled] = useState<string | null>(null);
    const [errorAll, setErrorAll] = useState<string | null>(null);
    const [studentId, setStudentId] = useState<number | null>(null);

    // Kayıt olma işlemi için state'ler
    const [isEnrolling, setIsEnrolling] = useState<number | null>(null);
    const [enrollError, setEnrollError] = useState<string | null>(null);
    const [enrollSuccess, setEnrollSuccess] = useState<string | null>(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://web-production-0ea9f.up.railway.app';

    // Tüm fetch istekleri için ortak headers ve options
    const commonHeaders = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    };

    const fetchOptions = {
        mode: 'cors' as RequestMode,
        credentials: 'include' as RequestCredentials,
    };

    // Kullanıcı bilgisi geldiğinde student_id'yi state'e al
    useEffect(() => {
        if (user?.student_id) {
            setStudentId(user.student_id);
        } else if (user && !user.student_id && token) {
            // /api/auth/me çağrısı ile student_id'yi almayı dene
            const fetchMeData = async () => {
                try {
                    const response = await fetch(`${apiUrl}/api/auth/me`, {
                        ...fetchOptions,
                        headers: commonHeaders,
                    });
                    if (!response.ok) {
                         const errorData = await response.json().catch(() => ({}));
                         console.error("Error fetching /api/auth/me:", response.status, errorData);
                         throw new Error(errorData.detail || 'Failed to fetch user details');
                    }
                    const meData = await response.json();
                    if (meData.student_id) {
                        setStudentId(meData.student_id);
                    } else {
                        setErrorEnrolled(t('courses.error.missingStudentId', 'Öğrenci kimliği alınamadı.'));
                        setErrorAll(t('courses.error.missingStudentId', 'Öğrenci kimliği alınamadı.'));
                        setIsLoadingEnrolled(false);
                        setIsLoadingAll(false);
                    }
                } catch (err: any) {
                    console.error("Error fetching /api/auth/me:", err);
                    const errorMessage = err.message || t('courses.error.fetchUser', 'Kullanıcı bilgileri alınamadı.');
                    setErrorEnrolled(errorMessage);
                    setErrorAll(errorMessage);
                    setIsLoadingEnrolled(false);
                    setIsLoadingAll(false);
                }
            };
            fetchMeData();
        } else if (!token && !user) {
             setIsLoadingEnrolled(false);
             setIsLoadingAll(false);
             setErrorEnrolled(t('courses.error.missingAuth', 'Giriş yapmalısınız.'));
             setErrorAll(t('courses.error.missingAuth', 'Giriş yapmalısınız.'));
        }
    }, [user, token, t, apiUrl]);

    // Kayıtlı dersleri çekme fonksiyonu
    const fetchEnrolledCourses = useCallback(async () => {
        if (!studentId || !token) return;

        setIsLoadingEnrolled(true);
        setErrorEnrolled(null);
        try {
            const response = await fetch(`${apiUrl}/api/students/${studentId}/courses`, {
                ...fetchOptions,
                method: 'GET',
                headers: commonHeaders,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Unknown error fetching enrolled courses' }));
                console.error("API Error (Enrolled Courses):", response.status, errorData);
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            const data: Course[] = await response.json();
            setEnrolledCourses(data);
        } catch (err) {
            console.error("Failed to fetch enrolled courses:", err);
            setErrorEnrolled(err instanceof Error ? err.message : t('courses.error.fetchEnrolled', 'Kayıtlı dersler alınamadı.'));
        } finally {
            setIsLoadingEnrolled(false);
        }
    }, [studentId, token, t, apiUrl]);

    // Tüm dersleri çekme fonksiyonu
    const fetchAllCourses = useCallback(async () => {
         if (!token) return;

        setIsLoadingAll(true);
        setErrorAll(null);
        try {
            const response = await fetch(`${apiUrl}/api/courses/`, {
                ...fetchOptions,
                method: 'GET',
                headers: commonHeaders,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Unknown error fetching all courses' }));
                console.error("API Error (All Courses):", response.status, errorData);
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            const data: Course[] = await response.json();
            setAllCourses(data);
        } catch (err) {
            console.error("Failed to fetch all courses:", err);
            setErrorAll(err instanceof Error ? err.message : t('courses.error.fetchAll', 'Tüm dersler alınamadı.'));
        } finally {
            setIsLoadingAll(false);
        }
    }, [token, t, apiUrl]);

    // studentId veya token değiştiğinde ilgili verileri çek
    useEffect(() => {
        fetchEnrolledCourses();
    }, [fetchEnrolledCourses]);

    useEffect(() => {
        fetchAllCourses();
    }, [fetchAllCourses]);

    // Derse Kayıt Olma Fonksiyonu
    const handleEnroll = async (courseId: number) => {
        if (!studentId || !token) {
            setEnrollError(t('courses.enroll.error.missingAuth', 'Kayıt olmak için giriş yapmalısınız.'));
            return;
        }

        setIsEnrolling(courseId);
        setEnrollError(null);
        setEnrollSuccess(null);

        try {
            const response = await fetch(`${apiUrl}/api/courses/${courseId}/students`, {
                ...fetchOptions,
                method: 'POST',
                headers: commonHeaders,
                body: JSON.stringify({ student_id: studentId }),
            });

            const result = await response.json();

            if (!response.ok) {
                 console.error("API Error (Enroll):", response.status, result);
                throw new Error(result.detail || t('courses.enroll.error.api', 'Derse kayıt olma sırasında bir hata oluştu.'));
            }

            setEnrollSuccess(t('courses.enroll.success', `Başarıyla ${result.course_code || 'derse'} kayıt oldunuz!`, { courseCode: result.course_code }));
            fetchEnrolledCourses();
            setTimeout(() => setEnrollSuccess(null), 3000);

        } catch (err) {
            console.error("Enrollment failed:", err);
            setEnrollError(err instanceof Error ? err.message : t('courses.enroll.error.generic', 'Derse kayıt olma işlemi başarısız.'));
            setTimeout(() => setEnrollError(null), 5000);
        } finally {
            setIsEnrolling(null);
        }
    };

    // Öğrencinin kayıtlı OLMADIĞI dersleri hesapla
    const availableCourses = useMemo(() => {
        if (!allCourses || !enrolledCourses) return [];
        const enrolledCourseIds = new Set(enrolledCourses.map(course => course.id));
        return allCourses.filter(course => !enrolledCourseIds.has(course.id));
    }, [allCourses, enrolledCourses]);

    const isLoading = isLoadingEnrolled || isLoadingAll;
    const error = errorEnrolled || errorAll;

    return (
        <div className="space-y-8">


            {isLoading && !error && (
                <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                    <span className="ml-2 text-lg">{t('courses.loading', 'Dersler Yükleniyor...')}</span>
                </div>
            )}

            {error && (
                <div className="p-4 border border-red-500 bg-red-50 dark:bg-red-900/30 rounded-md text-red-700 dark:text-red-300">
                     <h3 className="text-lg font-semibold flex items-center mb-2">
                         <AlertTriangle className="mr-2 h-5 w-5" />
                         {t('courses.error.title', 'Hata')}
                     </h3>
                     <p>{error}</p>
                 </div>
            )}

            {!isLoading && !error && (
                <section className="space-y-4">
                     <h2 className="text-2xl font-semibold border-b border-gray-300 dark:border-gray-700 pb-2">{t('courses.myCoursesTitle', 'Derslerim')}</h2>
                    {isLoadingEnrolled ? (
                        <div className="flex items-center text-gray-500 dark:text-gray-400"> <Loader2 className="mr-2 h-4 w-4 animate-spin"/> {t('courses.loadingEnrolled', 'Kayıtlı dersler yükleniyor...')}</div>
                    ) : errorEnrolled ? (
                         <p className="text-red-600 dark:text-red-400">{errorEnrolled}</p>
                    ) : enrolledCourses.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400">{t('courses.noCourses', 'Henüz hiçbir derse kayıtlı değilsiniz.')}</p>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {enrolledCourses.map((course) => (
                                <div key={course.id} className="border border-gray-200 dark:border-gray-700 rounded-lg shadow p-4 flex flex-col justify-between bg-white dark:bg-gray-800 hover:shadow-md transition-shadow">
                                     <div>
                                         <h3 className="flex items-center text-lg font-semibold text-gray-900 dark:text-white">
                                             <BookOpen className="mr-2 h-5 w-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                                             {course.name}
                                         </h3>
                                     </div>
                                     <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mt-2 mb-4 flex-grow">
                                         <p>
                                            <span className="inline-block bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">
                                                {course.code}
                                            </span>
                                         </p>
                                         <p><strong>{t('courses.semester', 'Dönem')}:</strong> {course.semester}</p>
                                     </div>
                                 </div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {!isLoading && !error && (
                 <section className="space-y-4">
                     <h2 className="text-2xl font-semibold border-b border-gray-300 dark:border-gray-700 pb-2">{t('courses.enroll.title', 'Kayıt Olabileceğiniz Dersler')}</h2>

                    {enrollSuccess && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 border border-green-500 bg-green-50 dark:bg-green-900/30 rounded-md text-green-700 dark:text-green-300 text-sm flex items-center gap-2"
                        >
                           <CheckCircle2 className="h-5 w-5"/> {enrollSuccess}
                        </motion.div>
                     )}
                     {enrollError && (
                         <motion.div
                           initial={{ opacity: 0, y: -10 }}
                           animate={{ opacity: 1, y: 0 }}
                           className="p-3 border border-red-500 bg-red-50 dark:bg-red-900/30 rounded-md text-red-700 dark:text-red-300 text-sm flex items-center gap-2"
                         >
                           <AlertTriangle className="h-5 w-5"/> {enrollError}
                         </motion.div>
                     )}

                     {isLoadingAll ? (
                         <div className="flex items-center text-gray-500 dark:text-gray-400"> <Loader2 className="mr-2 h-4 w-4 animate-spin"/> {t('courses.loadingAll', 'Uygun dersler yükleniyor...')}</div>
                     ) : errorAll ? (
                         <p className="text-red-600 dark:text-red-400">{errorAll}</p>
                     ) : availableCourses.length === 0 ? (
                         <p className="text-gray-500 dark:text-gray-400">{t('courses.enroll.noAvailableCourses', 'Kayıt olabileceğiniz başka ders bulunmamaktadır.')}</p>
                     ) : (
                         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                             {availableCourses.map((course) => (
                                <div key={course.id} className="border border-gray-200 dark:border-gray-700 rounded-lg shadow p-4 flex flex-col justify-between bg-white dark:bg-gray-800 hover:shadow-md transition-shadow">
                                    <div>
                                         <h3 className="flex items-center text-lg font-semibold text-gray-900 dark:text-white">
                                             <BookOpen className="mr-2 h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                                             {course.name}
                                         </h3>
                                    </div>
                                     <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mt-2 mb-4 flex-grow">
                                        <p>
                                            <span className="inline-block bg-transparent border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">
                                                {course.code}
                                            </span>
                                        </p>
                                        <p><strong>{t('courses.semester', 'Dönem')}:</strong> {course.semester}</p>
                                    </div>
                                     <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
                                         <button
                                            type="button"
                                            onClick={() => handleEnroll(course.id)}
                                            disabled={isEnrolling === course.id}
                                            className="inline-flex items-center justify-center w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isEnrolling === course.id ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    {t('courses.enroll.loadingButton', 'Kaydediliyor...')}
                                                </>
                                            ) : (
                                                <>
                                                    <PlusCircle className="mr-2 h-4 w-4" />
                                                    {t('courses.enroll.button', 'Derse Kaydol')}
                                                </>
                                            )}
                                        </button>
                                     </div>
                                 </div>
                            ))}
                        </div>
                    )}
                 </section>
            )}
        </div>
    );
}

// Gerekli çeviri anahtarları (public/locales/[lang]/translation.json içine eklenmeli):
/*
{
  "courses": {
    "welcomeTitle": "Merhaba {{firstName}}, Ders Portalı'na Hoş Geldiniz",
    "myCoursesTitle": "Derslerim",
    "loadingEnrolled": "Kayıtlı dersler yükleniyor...",
    "loadingAll": "Uygun dersler yükleniyor...",
    "enroll": {
        "title": "Kayıt Olabileceğiniz Dersler",
        "button": "Derse Kaydol",
        "loadingButton": "Kaydediliyor...",
        "noAvailableCourses": "Kayıt olabileceğiniz başka ders bulunmamaktadır.",
        "success": "Başarıyla {{courseCode}} dersine kayıt oldunuz!",
        "error": {
            "missingAuth": "Kayıt olmak için giriş yapmalısınız.",
            "api": "Derse kayıt olma sırasında bir hata oluştu.",
            "generic": "Derse kayıt olma işlemi başarısız."
        }
    },
     "error": {
         "title": "Hata",
         "fetchEnrolled": "Kayıtlı dersler alınamadı.",
         "fetchAll": "Tüm dersler alınamadı.",
         "fetchUser": "Kullanıcı bilgileri alınamadı.",
         "missingStudentId": "Öğrenci kimliği alınamadı.",
         "missingAuth": "Giriş yapmalısınız."
     }
  },
  "student": "Öğrenci"
}
*/ 