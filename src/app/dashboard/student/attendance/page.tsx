"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useTranslation } from 'react-i18next';
import { Loader2, AlertTriangle, CalendarCheck, CalendarX } from 'lucide-react';
import Select from 'react-select'; // react-select kütüphanesini kullanacağız

// Ders verisi için interface (Courses sayfasından farklı olabilir)
interface Course {
    id: number;
    name: string;
    code: string;
}

// Devamsızlık detayı için interface (API yanıtına göre)
interface AttendanceDetail {
    id: number;
    date: string; // Format: "YYYY-MM-DD"
    lesson_number: number;
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'; // Olası durumlar
    confidence?: number | null;
    emotion?: string | null;
    estimated_age?: number | null;
    estimated_gender?: string | null;
    created_at: string;
    updated_at: string;
}

// API yanıtının tamamı için interface
interface AttendanceResponse {
    attendance_details: AttendanceDetail[];
    course_info: {
        id: number;
        name: string;
        code: string;
    };
    // student_info alanı da mevcut ama bu sayfada direkt kullanmayabiliriz
}

// react-select için option tipi
interface SelectOption {
    value: number; // course.id
    label: string; // course.name (code ile birlikte)
}

export default function StudentAttendancePage() {
    const { t } = useTranslation();
    const { user, token, apiUrl } = useAuth();
    const [studentId, setStudentId] = useState<number | null>(null);
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<SelectOption | null>(null);
    const [attendanceData, setAttendanceData] = useState<AttendanceDetail[]>([]);
    const [isLoadingCourses, setIsLoadingCourses] = useState(true);
    const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
    const [errorCourses, setErrorCourses] = useState<string | null>(null);
    const [errorAttendance, setErrorAttendance] = useState<string | null>(null);

    // 1. Adım: Student ID'yi al
    useEffect(() => {
        if (user?.student_id) {
            setStudentId(user.student_id);
        } else if (user && !user.student_id) {
             // Courses sayfasındaki gibi /api/auth/me çağrısı yapılabilir
             // Şimdilik basit tutalım ve eksikse hata verelim
             setErrorCourses(t('attendance.error.missingStudentId'));
             setIsLoadingCourses(false);
        }
    }, [user, t]);

    // 2. Adım: Dersleri çek (studentId varsa)
    useEffect(() => {
        if (!studentId || !token) return;

        const fetchCourses = async () => {
            setIsLoadingCourses(true);
            setErrorCourses(null);
            try {
                const response = await fetch(`${apiUrl}/api/students/${studentId}/courses`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
                });
                if (!response.ok) throw new Error(t('attendance.error.fetchCourses'));
                const data: Course[] = await response.json();
                setCourses(data);
                // İsteğe bağlı: İlk dersi otomatik seç
                // if (data.length > 0) {
                //     setSelectedCourse({ value: data[0].id, label: `${data[0].code} - ${data[0].name}` });
                // }
            } catch (err) {
                console.error("Failed to fetch courses:", err);
                setErrorCourses(err instanceof Error ? err.message : t('attendance.error.fetchCourses'));
            } finally {
                setIsLoadingCourses(false);
            }
        };
        fetchCourses();
    }, [studentId, token, apiUrl, t]);

    // 3. Adım: Seçilen dersin devamsızlığını çek
    useEffect(() => {
        if (!selectedCourse || !studentId || !token) {
            setAttendanceData([]); // Seçim yoksa veya değişirse eski veriyi temizle
            return;
        }

        const fetchAttendance = async () => {
            setIsLoadingAttendance(true);
            setErrorAttendance(null);
            try {
                const courseId = selectedCourse.value;
                const response = await fetch(`${apiUrl}/api/attendance/course/${courseId}/student/${studentId}`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
                });
                if (!response.ok) {
                     const errorData = await response.json().catch(() => ({}));
                     throw new Error(errorData.message || errorData.detail || t('attendance.error.fetchAttendance'));
                }
                const data: AttendanceResponse = await response.json();
                // Tarihe göre sıralayabiliriz (API zaten sıralı gönderiyor olabilir)
                const sortedData = data.attendance_details.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.lesson_number - a.lesson_number);
                setAttendanceData(sortedData);
            } catch (err) {
                console.error("Failed to fetch attendance:", err);
                setErrorAttendance(err instanceof Error ? err.message : t('attendance.error.fetchAttendance'));
            } finally {
                setIsLoadingAttendance(false);
            }
        };

        fetchAttendance();
    }, [selectedCourse, studentId, token, apiUrl, t]);

    // react-select için ders seçeneklerini formatla
    const courseOptions: SelectOption[] = courses.map(course => ({
        value: course.id,
        label: `${course.code} - ${course.name}`
    }));

    // Devamsızlık durumuna göre stil ve ikon belirleme
    const getStatusStyle = (status: AttendanceDetail['status']) => {
        switch (status) {
            case 'PRESENT':
                return { icon: <CalendarCheck className="h-5 w-5 text-green-600" />, text: t('attendance.status.present'), color: 'text-green-700 dark:text-green-400' };
            case 'ABSENT':
                return { icon: <CalendarX className="h-5 w-5 text-red-600" />, text: t('attendance.status.absent'), color: 'text-red-700 dark:text-red-400 font-semibold' };
            // Diğer durumlar (LATE, EXCUSED) eklenebilir
            default:
                return { icon: <CalendarCheck className="h-5 w-5 text-gray-500" />, text: status, color: 'text-gray-600 dark:text-gray-400' };
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold">{t('attendance.title')}</h1>

            {/* Ders Seçimi */}
            <div className="max-w-md">
                <label htmlFor="course-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('attendance.selectCourseLabel')}
                </label>
                {isLoadingCourses ? (
                    <div className="flex items-center">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        <span>{t('attendance.loadingCourses')}</span>
                    </div>
                ) : errorCourses ? (
                    <div className="text-red-600 flex items-center">
                         <AlertTriangle className="h-5 w-5 mr-2" />
                        {errorCourses}
                    </div>
                ) : (
                    <Select<SelectOption>
                        inputId="course-select"
                        options={courseOptions}
                        value={selectedCourse}
                        onChange={(option) => setSelectedCourse(option)}
                        placeholder={t('attendance.selectCoursePlaceholder')}
                        isClearable
                        isLoading={isLoadingCourses}
                        isDisabled={isLoadingCourses || courses.length === 0}
                        noOptionsMessage={() => t('attendance.noCoursesFound')}
                        styles={{ /* İsteğe bağlı stil ayarları */
                            control: (base) => ({ ...base, backgroundColor: 'var(--background)', borderColor: 'var(--border)' }),
                            menu: (base) => ({ ...base, backgroundColor: 'var(--background)' }),
                            option: (base, { isFocused, isSelected }) => ({
                                ...base,
                                backgroundColor: isSelected ? 'var(--primary)' : isFocused ? 'var(--accent)' : 'var(--background)',
                                color: isSelected ? 'var(--primary-foreground)' : 'var(--foreground)',
                                ':active': {
                                     backgroundColor: 'var(--primary) / 0.9',
                                },
                            }),
                            singleValue: (base) => ({ ...base, color: 'var(--foreground)' }),
                            input: (base) => ({...base, color: 'var(--foreground)'}),
                        }}
                        theme={(theme) => ({
                            ...theme,
                            colors: {
                                ...theme.colors,
                                primary: 'hsl(var(--primary))',
                                primary75: 'hsl(var(--primary) / 0.75)',
                                primary50: 'hsl(var(--primary) / 0.50)',
                                primary25: 'hsl(var(--primary) / 0.25)',
                                danger: 'hsl(var(--destructive))',
                                dangerLight: 'hsl(var(--destructive) / 0.25)',
                                neutral0: 'hsl(var(--background))',
                                neutral5: 'hsl(var(--muted))', // Placeholder, disabled background
                                neutral10: 'hsl(var(--accent)) / 0.5', // Selected item background
                                neutral20: 'hsl(var(--border))', // Border, divider
                                neutral30: 'hsl(var(--border) / 0.7)',
                                neutral40: 'hsl(var(--muted-foreground) / 0.5)', // Placeholder text
                                neutral50: 'hsl(var(--muted-foreground))', // Indicator separator
                                neutral60: 'hsl(var(--foreground) / 0.8)',
                                neutral80: 'hsl(var(--foreground))', // Input text
                                neutral90: 'hsl(var(--foreground))',
                            },
                        })}
                    />
                )}
            </div>

            {/* Devamsızlık Listesi */}
            {selectedCourse && (
                <div className="mt-6">
                    <h2 className="text-xl font-semibold mb-3">{selectedCourse.label} - {t('attendance.listTitle')}</h2>
                    {isLoadingAttendance ? (
                        <div className="flex justify-center items-center py-6">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <span className="ml-2">{t('attendance.loadingAttendance')}</span>
                        </div>
                    ) : errorAttendance ? (
                         <div className="p-4 border border-red-500 bg-red-50 rounded-md text-red-700 flex items-center">
                            <AlertTriangle className="h-5 w-5 mr-2" />
                            {errorAttendance}
                        </div>
                    ) : attendanceData.length === 0 ? (
                        <p>{t('attendance.noAttendanceData')}</p>
                    ) : (
                        <div className="border rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-border bg-card">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('attendance.table.date')}</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('attendance.table.lesson')}</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('attendance.table.status')}</th>
                                        {/* İsteğe bağlı: Diğer sütunlar (confidence, emotion vb.) */}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {attendanceData.map((record) => {
                                        const { icon, text, color } = getStatusStyle(record.status);
                                        return (
                                            <tr key={record.id} className="hover:bg-muted/50 transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">{record.date}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{record.lesson_number}</td>
                                                <td className={`px-4 py-3 whitespace-nowrap text-sm ${color}`}>
                                                    <div className="flex items-center">
                                                        {icon}
                                                        <span className="ml-2">{text}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
} 