'use client';

import React, { useState, useEffect, useMemo, ChangeEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import * as XLSX from 'xlsx';
import { Loader2, AlertCircle, ChevronDown, UserX, FileDown, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next'; // i18n hook'u
import toast from 'react-hot-toast'; // Bildirim için
import i18n from '@/i18n'; // i18n instance'ını import et
import emailjs from 'emailjs-com'; // EmailJS importu eklendi

// --- Tipler ---
// History sayfasından alınan tipler
type Course = {
  id: number;
  code: string;
  name: string;
  semester: string;
}

// Absent student objesinin yapısı (Konsol loglarına göre güncellendi)
type AbsentStudent = {
  id: number;
  first_name: string; // 'name' yerine
  last_name: string;  // 'name' yerine
  student_number?: string; // Ekstra alan (varsa)
  email?: string; // E-posta gönderme için (varsa)
}

type AttendanceRecord = {
  id: number;
  course_id: number;
  date: string | null | undefined;
  lesson_number: number | null | undefined;
  type: string;
  photo_path: string | null | undefined;
  total_students: number | null | undefined;
  recognized_students: number | null | undefined;
  unrecognized_students: number | null | undefined;
  emotion_statistics?: { [key: string]: number } | null;
  present_students?: any[]; // Şimdilik any
  absent_students?: AbsentStudent[]; // Varsayılan yapı
  created_by: number;
  created_at: string;
  updated_at: string;
}

// Rapor sayfasında kullanılacak öğrenci devamsızlık özeti tipi
interface StudentAbsenceSummary {
  id: number;
  name: string;
  absences: number;
  email?: string; // E-posta için
}

// --- Ana Bileşen ---
const AttendanceReportsPage = () => {
  const { t } = useTranslation(); // Çeviri fonksiyonunu al
  const { token, apiUrl, teacherId } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // State'ler
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]); // Ham yoklama kayıtları
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [absenceLimit, setAbsenceLimit] = useState(3);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]); // Seçili öğrenci ID'leri

  // URL'den kurs ID'sini al
  useEffect(() => {
    const courseIdParam = searchParams.get('course');
    const courseId = courseIdParam ? parseInt(courseIdParam, 10) : null;
    if (courseId !== null && !isNaN(courseId)) {
      setSelectedCourseId(courseId);
    } else {
      setSelectedCourseId(null);
      setAttendanceRecords([]); // Kurs seçimi kalkınca kayıtları temizle
    }
  }, [searchParams]);

  // Kursları getir
  useEffect(() => {
    const fetchCourses = async () => {
      if (!token || !teacherId) {
        setLoadingCourses(false);
        setCourses([]);
        return;
      }
      setLoadingCourses(true);
      setError(null);
      try {
        const response = await fetch(`${apiUrl}/api/teachers/${teacherId}/courses`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        });
        if (!response.ok) throw new Error(`Kurslar yüklenemedi (HTTP ${response.status})`);
        const data = await response.json();
        setCourses(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Kurslar yüklenirken hata:', err);
        setError(err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.');
        setCourses([]);
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchCourses();
  }, [token, apiUrl, teacherId]);

  // Seçili kursun yoklama kayıtlarını getir
  useEffect(() => {
    const fetchAttendanceRecords = async () => {
      if (!token || selectedCourseId === null) {
        setAttendanceRecords([]);
        setLoadingAttendance(false);
        return;
      }
      setLoadingAttendance(true);
      setError(null);
      try {
        const response = await fetch(`${apiUrl}/api/courses/${selectedCourseId}/attendance`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        });
        if (!response.ok) throw new Error(`Yoklama kayıtları yüklenemedi (HTTP ${response.status})`);
        const data = await response.json();
        // console.log('API Response (Attendance Records):', data); // Debug log kaldırıldı
        setAttendanceRecords(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Yoklama kayıtları yüklenirken hata:', err);
        setError(err instanceof Error ? err.message : 'Yoklama verileri alınamadı.');
        setAttendanceRecords([]);
      } finally {
        setLoadingAttendance(false);
      }
    };
    fetchAttendanceRecords();
  }, [token, apiUrl, selectedCourseId]);

  // Yoklama kayıtlarından öğrenci devamsızlık özetini hesapla
  const studentAbsenceSummaries = useMemo((): StudentAbsenceSummary[] => {
    if (!attendanceRecords || attendanceRecords.length === 0) {
      return [];
    }
    // console.log('Calculating summaries for records:', attendanceRecords); // Debug log kaldırıldı

    const absenceMap: { [key: number]: StudentAbsenceSummary } = {};

    attendanceRecords.forEach(record => {
      if (record.absent_students && Array.isArray(record.absent_students)) {
        record.absent_students.forEach(student => {
          // API'den gelen first_name ve last_name kontrolü
          if (student && typeof student.id === 'number' && typeof student.first_name === 'string' && typeof student.last_name === 'string') {
            const studentName = `${student.first_name} ${student.last_name}`; // Ad ve soyadı birleştir
            if (!absenceMap[student.id]) {
              absenceMap[student.id] = {
                id: student.id,
                name: studentName, // Birleştirilmiş adı kullan
                absences: 0,
                email: student.email // E-posta varsa ekle
              };
            }
            absenceMap[student.id].absences += 1;
          } else {
             // console.warn("Geçersiz absent_student formatı:", student, "Kayıt ID:", record.id); // Debug log kaldırıldı
          }
        });
      }
    });
    // console.log('Calculated absenceMap:', absenceMap); // Debug log kaldırıldı

    return Object.values(absenceMap);
  }, [attendanceRecords]);

  // Filtrelenmiş öğrenci özetleri
  const filteredSummaries = useMemo(() => {
    let currentFiltered = studentAbsenceSummaries;

    // Arama terimine göre filtrele
    if (searchTerm) {
      currentFiltered = currentFiltered.filter(summary =>
        summary.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Devamsızlık sınırına göre filtrele (eşit veya fazla)
    currentFiltered = currentFiltered.filter(summary => summary.absences >= absenceLimit);

    // İsim sırasına göre sırala
    currentFiltered.sort((a, b) => a.name.localeCompare(b.name));

    return currentFiltered;
  }, [studentAbsenceSummaries, searchTerm, absenceLimit]);

   // Filtre değiştiğinde seçili öğrencileri sıfırla
   useEffect(() => {
    setSelectedStudents([]);
  }, [filteredSummaries]); // filteredSummaries değiştiğinde tetiklenir

  // Kurs seçimini değiştirme
  const handleCourseChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const courseId = e.target.value ? parseInt(e.target.value, 10) : null;
    const params = new URLSearchParams(searchParams.toString());
    if (courseId !== null && !isNaN(courseId)) {
      params.set('course', courseId.toString());
    } else {
      params.delete('course');
    }
    router.push(`/dashboard/teacher/attendance/reports?${params.toString()}`);
  };

  // Arama input değişikliği
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Devamsızlık sınırı input değişikliği
  const handleLimitChange = (e: ChangeEvent<HTMLInputElement>) => {
    const limit = parseInt(e.target.value, 10);
    setAbsenceLimit(isNaN(limit) ? 0 : limit);
  };

  // Öğrenci seçimi değişikliği
  const handleSelectStudent = (id: number) => {
    setSelectedStudents(prevSelected =>
      prevSelected.includes(id)
        ? prevSelected.filter(studentId => studentId !== id)
        : [...prevSelected, id]
    );
  };

  // Excel'e aktarma
  const exportToExcel = () => {
    if (filteredSummaries.length === 0) {
      alert(t('attendanceReports.alerts.exportEmpty'));
      return;
    }
    // Sadece ID, Name ve Absences sütunlarını al
    const dataToExport = filteredSummaries.map(({ id, name, absences }) => ({
        'Öğrenci ID': id,
        'Ad Soyad': name,
        'Toplam Devamsızlık': absences
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Devamsızlık Raporu');
    // Dosya adını kurs koduyla birleştirebiliriz
    const selectedCourse = courses.find(c => c.id === selectedCourseId);
    const courseCode = selectedCourse ? selectedCourse.code : 'rapor';
    XLSX.writeFile(workbook, `devamsizlik_${courseCode}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // E-posta gönderme (Gerçek Gönderim)
  const sendEmails = async () => { // async eklendi
    if (selectedStudents.length === 0) {
      toast.error(t('attendanceReports.alerts.selectStudentsEmail')); // toast.error kullanıldı
      return;
    }

    const studentsToSend = filteredSummaries.filter(summary => selectedStudents.includes(summary.id));
    const selectedCourse = courses.find(c => c.id === selectedCourseId);
    const courseName = selectedCourse?.name ?? 'Bilinmeyen Ders';
    const courseCode = selectedCourse?.code ?? '???';

    // --- EmailJS Bilgileri (Doğrudan Eklendi - Güvenlik Uyarısı!) ---
    const SERVICE_ID = 'service_qrscmc4'; // BURAYA EmailJS Service ID'nizi yazın
    const TEMPLATE_ID = 'template_mtzc9gf'; // BURAYA EmailJS Template ID'nizi yazın
    const USER_ID = 'Siz0YOd9ji9Td_96c';     // BURAYA EmailJS Public Key'inizi (User ID) yazın
    // --- --- --- --- --- --- --- --- --- --- --- --- ---

    // ID'lerin boş olup olmadığını kontrol etmeye gerek kalmadı, ancak yine de bir uyarı bırakalım
    if (!SERVICE_ID || !TEMPLATE_ID || !USER_ID) { // === 'YOUR_SERVICE_ID' kontrolü kaldırıldı.
        console.error("EmailJS bilgileri doğrudan koda girilmemiş veya hatalı. Lütfen SERVICE_ID, TEMPLATE_ID ve USER_ID değerlerini kontrol edin.");
        toast.error(t('attendanceReports.alerts.emailConfigError'));
        return;
    }

    let successCount = 0;
    let errorCount = 0;
    const emailPromises = []; // Tüm gönderme işlemlerini tutacak dizi

    toast.loading(t('attendanceReports.alerts.sendingEmails'), { id: 'email-sending' }); // Gönderim başlıyor bildirimi

    for (const student of studentsToSend) {
      if (!student.email) {
        console.warn(`${student.name} için e-posta adresi bulunamadı, atlanıyor.`);
        errorCount++; // E-postası olmayanları da hata sayısına ekleyebiliriz veya ayrı sayabiliriz.
        continue; // E-posta yoksa sonraki öğrenciye geç
      }

      const templateParams = {
        to_email: student.email, // EmailJS şablonunuzdaki alıcı e-posta değişkeni
        student_name: student.name, // EmailJS şablonunuzdaki öğrenci adı değişkeni
        course_name: courseName,
        course_code: courseCode,
        absence_count: student.absences,
        // EmailJS şablonunuzda tanımladığınız diğer değişkenler buraya eklenebilir
        // Örneğin: from_name: 'Öğretim Görevlisi Adı', reply_to: 'ogretmen@example.com'
      };

       // console.log(`Sending email to ${student.name} (${student.email}) with params:`, templateParams); // Debug için

       // Her bir e-posta gönderimini bir promise olarak diziye ekle
       emailPromises.push(
         emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, USER_ID)
           .then((response) => {
             console.log(`SUCCESS! (${student.name})`, response.status, response.text);
             successCount++;
           })
           .catch((err) => {
             console.error(`FAILED... (${student.name})`, err);
             errorCount++;
           })
       );
    }

    // Tüm e-posta gönderme işlemleri tamamlandığında sonucu bildir
    try {
        await Promise.all(emailPromises); // Tüm promise'lerin bitmesini bekle
        toast.dismiss('email-sending'); // Yükleniyor bildirimini kapat

        if (successCount > 0 && errorCount === 0) {
             toast.success(t('attendanceReports.alerts.emailSentSuccessAll', { count: successCount }));
        } else if (successCount > 0 && errorCount > 0) {
             toast.success(t('attendanceReports.alerts.emailSentPartial', { success: successCount, total: successCount + errorCount }));
        } else if (successCount === 0 && errorCount > 0) {
             toast.error(t('attendanceReports.alerts.emailSentNone', { count: errorCount }));
        } else {
             // Bu durum normalde oluşmamalı (hiç e-posta gönderilmediyse)
             toast.error(t('attendanceReports.alerts.emailSentErrorGeneral'));
        }
    } catch (error) {
         // Promise.all'da beklenmedik bir hata olursa
         toast.dismiss('email-sending');
         console.error("E-posta gönderimi sırasında genel hata:", error);
         toast.error(t('attendanceReports.alerts.emailSentErrorGeneral'));
    }

    // Başarılı gönderimlerden sonra seçimi temizleyebiliriz
    if (successCount > 0) {
        setSelectedStudents([]);
    }
  };

  const isLoading = loadingCourses || loadingAttendance;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">{t('attendanceReports.title')}</h1>

      {/* Hata Mesajı */}
      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4 dark:bg-red-900/20 flex items-center" role="alert">
          <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Kurs Yükleniyor */}
      {loadingCourses && (
        <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          <span>{t('loading')} {t('courses.loading').toLowerCase()}...</span>
        </div>
      )}

      {/* Kurslar Yüklendi */}
      {!loadingCourses && courses.length === 0 && !error && (
         <div className="text-center text-gray-500 dark:text-gray-400 p-6 border rounded">
            {t('courses.noCourses')}
         </div>
      )}

      {!loadingCourses && courses.length > 0 && (
        <>
          {/* Filtreleme Alanı */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 p-4 border rounded-lg shadow-sm bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
            {/* Ders Seçimi */}
            <div className="md:col-span-1">
              <label htmlFor="courseSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('attendanceReports.selectCourseLabel')}
              </label>
              <div className="relative">
                <select
                  id="courseSelect"
                  value={selectedCourseId ?? ''}
                  onChange={handleCourseChange}
                  className="block w-full appearance-none rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                >
                  <option value="">{t('attendanceReports.selectCoursePlaceholder')}</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} - {course.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Öğrenci Arama */}
            <div className="md:col-span-1">
              <label htmlFor="studentSearch" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('attendanceReports.searchLabel')}</label>
              <input
                type="text"
                id="studentSearch"
                placeholder={t('attendanceReports.searchPlaceholder')}
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={!selectedCourseId || loadingAttendance}
              />
            </div>

            {/* Devamsızlık Sınırı */}
            <div className="md:col-span-1">
              <label htmlFor="absenceLimit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('attendanceReports.limitLabel')}</label>
              <input
                type="number"
                id="absenceLimit"
                value={absenceLimit}
                onChange={handleLimitChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={!selectedCourseId || loadingAttendance}
              />
            </div>
          </div>

          {/* Yoklama İçeriği */}
          {selectedCourseId !== null ? (
            <>
              {/* Yoklama Yükleniyor */}
              {loadingAttendance && (
                <div className="flex items-center justify-center h-40 text-gray-500 dark:text-gray-400">
                  <Loader2 className="mr-2 h-6 w-6 animate-spin text-blue-600" />
                  <span>{t('dashboard.loading.attendance')}...</span>
                </div>
              )}

              {/* Yoklama Yüklendi */}
              {!loadingAttendance && !error && (
                <>
                  {/* Öğrenci Listesi */}
                  <div className="mb-6 bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden border dark:border-gray-700">
                    <h2 className="text-xl font-semibold p-4 border-b dark:border-gray-700 text-gray-700 dark:text-gray-200">
                      {t('attendanceReports.tableTitle', { count: filteredSummaries.length })}
                    </h2>
                    {filteredSummaries.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10">{t('attendanceReports.tableHeaderSelect')}</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('attendanceReports.tableHeaderName')}</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('attendanceReports.tableHeaderAbsences')}</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredSummaries.map((summary) => (
                              <tr key={summary.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <input
                                    type="checkbox"
                                    checked={selectedStudents.includes(summary.id)}
                                    onChange={() => handleSelectStudent(summary.id)}
                                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:checked:bg-indigo-500 dark:checked:border-indigo-500"
                                  />
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{summary.name}</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 font-semibold">{summary.absences}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 p-6 text-center">
                        {attendanceRecords.length > 0 ? t('attendanceReports.noFilteredData') : t('attendanceReports.noCourseData')}
                      </p>
                    )}
                  </div>

                  {/* Eylemler */}
                  {filteredSummaries.length > 0 && (
                    <div className="flex flex-wrap gap-4 mt-6">
                      <button
                        onClick={sendEmails}
                        disabled={selectedStudents.length === 0}
                        className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white shadow-sm ${selectedStudents.length === 0 ? 'bg-gray-400 cursor-not-allowed dark:bg-gray-600' : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800'}`}
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        {t('attendanceReports.sendEmailButton', { count: selectedStudents.length })}
                      </button>
                      <button
                        onClick={exportToExcel}
                        disabled={filteredSummaries.length === 0}
                        className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white shadow-sm ${filteredSummaries.length === 0 ? 'bg-gray-400 cursor-not-allowed dark:bg-gray-600' : 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800'}`}
                      >
                        <FileDown className="mr-2 h-4 w-4" />
                        {t('attendanceReports.exportButton')}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            // Kurs seçilmemişse gösterilecek alan
            <div className="text-center text-gray-500 dark:text-gray-400 p-6 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
              {t('attendanceReports.selectCoursePrompt')}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AttendanceReportsPage;
