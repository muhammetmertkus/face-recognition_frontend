"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import {
  Calendar,
  Clock,
  ArrowLeft,
  Search,
  ChevronDown,
  Download,
  Eye,
  Filter,
  RefreshCcw,
  Users,
  UserCheck,
  UserX,
  Loader2
} from 'lucide-react'

// --- Tipler ---
type Course = {
  id: number;
  code: string;
  name: string;
  semester: string;
}

// API yanıtına göre güncellenmiş tip tanımı
type AttendanceRecord = {
  id: number;
  course_id: number;
  date: string | null | undefined; // API'den string "YYYY-MM-DD" gelmeli
  lesson_number: number | null | undefined;
  type: string; // "FACE", "EMOTION", "FACE_EMOTION"
  photo_path: string | null | undefined;
  total_students: number | null | undefined;
  recognized_students: number | null | undefined;
  unrecognized_students: number | null | undefined;
  emotion_statistics?: {
    [key: string]: number;
  } | null; // API'den null gelebilir
  present_students?: any[]; // Detayları şimdilik any olarak bırakıyoruz
  absent_students?: any[]; // Detayları şimdilik any olarak bırakıyoruz
  created_by: number;
  created_at: string;
  updated_at: string;
}

// --- Yardımcı Fonksiyonlar ---

// Tarih dönüştürme: YYYY-MM-DD -> DD.MM.YYYY (Daha Güvenli)
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString || typeof dateString !== 'string') return '-';
  try {
    // 'YYYY-MM-DD' formatını kontrol et
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      console.warn('Geçersiz tarih formatı:', dateString);
      return dateString; // Format yanlışsa olduğu gibi döndür
    }
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString; // Beklenmedik durum
    const [year, month, day] = parts;
    // Basit geçerlilik kontrolü
    if (isNaN(parseInt(year)) || isNaN(parseInt(month)) || isNaN(parseInt(day))) {
      return dateString;
    }
    return `${day}.${month}.${year}`;
  } catch (error) {
    console.error('formatDate hatası:', error, ' Gelen Değer:', dateString);
    return dateString || '-'; // Hata durumunda orijinali veya '-' döndür
  }
}

// Türkçe gün adı (Daha Güvenli)
const getDayName = (dateString: string | null | undefined): string => {
  if (!dateString || typeof dateString !== 'string') return '';
  try {
    const date = new Date(dateString);
    // Geçerli bir tarih mi kontrolü
    if (isNaN(date.getTime())) {
      console.warn('Geçersiz tarih nesnesi:', dateString);
      return '';
    }
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    return days[date.getDay()];
  } catch (error) {
    console.error('getDayName hatası:', error, ' Gelen Değer:', dateString);
    return '';
  }
}

// Yoklama Türü Metnini Alma
const getAttendanceTypeText = (type: string | null | undefined): string => {
  if (!type) return 'Bilinmiyor';
  switch (type.toUpperCase()) { // Büyük/küçük harf duyarlılığını kaldır
    case 'FACE': return 'Yüz Tanıma';
    case 'EMOTION': return 'Duygu Analizi';
    case 'FACE_EMOTION': return 'Yüz + Duygu';
    default: return type; // Bilinmeyen tür varsa olduğu gibi göster
  }
}

// --- Ana Bileşen ---
export default function AttendanceHistoryPage() {
  const { token, apiUrl, user, teacherId } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // State'ler
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState(""); // YYYY-MM-DD formatında

  // URL'den kurs ID'sini al ve state'i güncelle
  useEffect(() => {
    const courseIdParam = searchParams.get('course');
    const courseId = courseIdParam ? parseInt(courseIdParam, 10) : null;
    if (courseId !== null && !isNaN(courseId)) {
      setSelectedCourseId(courseId);
    } else {
      setSelectedCourseId(null); // Geçersizse veya yoksa null yap
      setAttendanceRecords([]); // Kurs seçimi kalkınca kayıtları temizle
    }
  }, [searchParams]); // Sadece searchParams değiştiğinde çalışır

  // Kursları getir
  useEffect(() => {
    const fetchCourses = async () => {
      if (!token || !teacherId) {
        setLoadingCourses(false);
        setCourses([]); // Token yoksa kursları temizle
        return;
      }

      setLoadingCourses(true);
      setError(null);
      try {
        const response = await fetch(`${apiUrl}/api/teachers/${teacherId}/courses`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          let errorMsg = `Kurslar yüklenirken hata oluştu (HTTP ${response.status}).`;
          try {
            const errorData = await response.json();
            errorMsg = errorData.message || errorData.detail || errorMsg;
          } catch (e) { /* JSON parse edilemezse ilk mesajı kullan */ }
          throw new Error(errorMsg);
        }

        const data = await response.json();
        setCourses(Array.isArray(data) ? data : []); // Gelen veri dizi değilse boş dizi ata
      } catch (err) {
        console.error('Kurslar yüklenirken hata:', err);
        setError(err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.');
        setCourses([]); // Hata durumunda temizle
      } finally {
        setLoadingCourses(false);
      }
    }

    fetchCourses();
  }, [token, apiUrl, teacherId]); // Bağımlılıklar doğru

  // Yoklama kayıtlarını getir (DOĞRU ENDPOINT KULLANILARAK)
  useEffect(() => {
    const fetchAttendanceRecords = async () => {
      // Kurs seçili değilse veya token yoksa işlem yapma
      if (!token || selectedCourseId === null) {
        setAttendanceRecords([]); // Kayıtları temizle
        setLoadingAttendance(false);
        return;
      }

      setLoadingAttendance(true);
      setError(null); // Yeni istek öncesi hatayı temizle
      try {
        //***** DOĞRU ENDPOINT *****
        const response = await fetch(`${apiUrl}/api/courses/${selectedCourseId}/attendance`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });
        //***************************

        if (!response.ok) {
            let errorMsg = `Yoklama kayıtları yüklenirken hata oluştu (HTTP ${response.status}).`;
            try {
              const errorData = await response.json();
              errorMsg = errorData.message || errorData.detail || errorMsg;
            } catch (e) { /* JSON parse edilemezse ilk mesajı kullan */ }
            throw new Error(errorMsg);
        }

        const data = await response.json();
        // Gelen verinin dizi olduğunu kontrol et, değilse boş dizi ata
        setAttendanceRecords(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Yoklama kayıtları yüklenirken hata:', err);
        setError(err instanceof Error ? err.message : 'Yoklama verileri alınırken bilinmeyen bir hata oluştu.');
        setAttendanceRecords([]); // Hata durumunda temizle
      } finally {
        setLoadingAttendance(false);
      }
    }

    fetchAttendanceRecords(); // selectedCourseId veya token değiştiğinde çalıştır

  }, [token, apiUrl, selectedCourseId]); // Bağımlılıklar doğru

  // Kurs seçimini değiştirme fonksiyonu
  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const courseId = e.target.value ? parseInt(e.target.value, 10) : null;
    const params = new URLSearchParams(searchParams.toString());
    if (courseId !== null && !isNaN(courseId)) {
      params.set('course', courseId.toString());
    } else {
      params.delete('course'); // "Ders Seçin" seçilirse parametreyi kaldır
    }
    // Sayfa yenilemeden URL'i güncelle, bu useEffect'i tetikleyerek state'i güncelleyecek
    router.push(`/dashboard/teacher/attendance/history?${params.toString()}`);
  }

  // Filtrelenmiş ve Sıralanmış Kayıtlar (useMemo ile)
  const filteredRecords = useMemo(() => {
    return attendanceRecords
      .filter(record => {
        // Tarih filtreleme (YYYY-MM-DD formatında)
        if (dateFilter && record.date !== dateFilter) {
            return false;
        }

        // İçeriğe göre arama (Büyük/küçük harf duyarsız)
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const dateFormatted = formatDate(record.date).toLowerCase();
          const lessonNumStr = record.lesson_number?.toString() ?? '';
          const typeText = getAttendanceTypeText(record.type).toLowerCase();

          return (
            // Görünen tarih formatında ara
            dateFormatted.includes(searchLower) ||
            // Gün adında ara (varsa)
            getDayName(record.date).toLowerCase().includes(searchLower) ||
            // Ders saatinde ara ("1", "1.", "1. ders")
            lessonNumStr.includes(searchLower) ||
            (lessonNumStr + ".").includes(searchLower) ||
            (lessonNumStr + ". ders").toLowerCase().includes(searchLower) ||
            // Yoklama türü metninde ara
            typeText.includes(searchLower)
          );
        }
        return true; // Filtre yoksa tümünü dahil et
      })
      // Tarihe göre sıralama (en yeni en üstte), null/geçersiz tarihleri sona at
      .sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;
          // Aynı tarih ise ders saatine göre de sırala (isteğe bağlı)
          if (dateB === dateA) {
              const lessonA = a.lesson_number ?? 0;
              const lessonB = b.lesson_number ?? 0;
              return lessonB - lessonA; // Büyük ders no önce
          }
          return dateB - dateA; // Farklı tarihlerse yeni olan önce
      });
  }, [attendanceRecords, dateFilter, searchTerm]); // Bağımlılıklar

  // Özet İstatistikler (useMemo ile)
  const summaryStats = useMemo(() => {
    // Filtrelenmiş kayıtlar üzerinden hesaplama yapalım
    const recordsToSummarize = filteredRecords; // Veya attendanceRecords isterseniz değiştirin

    if (recordsToSummarize.length === 0) {
      return {
        totalAttendance: 0,
        totalRecognizedSum: 0, // Tüm kayıtlardaki toplam tanınan sayısı
        lastAttendanceDate: '-',
        averageParticipation: '-', // Ortalama katılım yüzdesi
      };
    }

    // recordsToSummarize zaten tarihe göre sıralı (en yeni başta)
    const lastRecord = recordsToSummarize[0];
    const lastAttendanceDate = formatDate(lastRecord?.date);

    let totalRecognizedSum = 0;
    let totalPercentageSum = 0;
    let validParticipationCount = 0; // Katılım oranı hesaplanabilen kayıt sayısı

    recordsToSummarize.forEach(record => {
      const recognized = record.recognized_students ?? 0; // Null ise 0
      const total = record.total_students ?? 0; // Null ise 0

      totalRecognizedSum += recognized;

      if (total > 0) {
        totalPercentageSum += (recognized / total) * 100;
        validParticipationCount++;
      }
    });

    const averageParticipation = validParticipationCount > 0
      ? `%${Math.round(totalPercentageSum / validParticipationCount)}`
      : '-'; // Ortalama hesaplanamıyorsa '-'

    return {
      totalAttendance: recordsToSummarize.length,
      totalRecognizedSum: totalRecognizedSum,
      lastAttendanceDate: lastAttendanceDate,
      averageParticipation: averageParticipation,
    };
  }, [filteredRecords]); // filteredRecords değişince yeniden hesapla

  // Yoklama detaylarına gitme fonksiyonu
  const viewAttendanceDetails = (attendanceId: number | null | undefined) => {
    if (typeof attendanceId === 'number' && !isNaN(attendanceId)) {
      router.push(`/dashboard/teacher/attendance/detail/${attendanceId}`);
    } else {
      console.error('Geçersiz yoklama ID:', attendanceId);
      setError('Detaylar görüntülenemedi: Geçersiz Yoklama ID.');
      // İsteğe bağlı olarak kullanıcıya bildirim gösterilebilir
    }
  }

  // Genel yükleme durumu
  const isLoading = loadingCourses || loadingAttendance;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Başlık */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        {/* ... (Başlık kısmı aynı kalabilir) ... */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Yoklama Geçmişi</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Derslerinizin yoklama kayıtlarını görüntüleyin ve yönetin
          </p>
        </div>
        <div className="flex flex-wrap space-x-2">
          <button
            onClick={() => router.push('/dashboard/teacher')}
            className="flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Panele Dön
          </button>
          {/* Yeni Yoklama butonu sadece kurs seçiliyken ve kurslar yüklendiyse aktif olsun */}
          {selectedCourseId !== null && !loadingCourses && courses.length > 0 && (
            <button
              onClick={() => router.push(`/dashboard/teacher/attendance/new?course=${selectedCourseId}`)}
              className="flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              <UserCheck className="mr-2 h-4 w-4" />
              Yeni Yoklama
            </button>
          )}
        </div>
      </div>

      {/* Hata Mesajı Alanı */}
      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4 dark:bg-red-900/20" role="alert">
           {/* ... (Hata gösterim kısmı aynı kalabilir) ... */}
           <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.707-4.293a1 1 0 001.414 0L12 12.414l1.293 1.293a1 1 0 001.414-1.414L13.414 11l1.293-1.293a1 1 0 00-1.414-1.414L12 9.586l-1.293-1.293a1 1 0 00-1.414 1.414L10.586 11l-1.293 1.293a1 1 0 101.414 1.414L11 12.414l.707.707z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Hata</h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Kurslar Yükleniyor... */}
      {loadingCourses && (
         <div className="flex h-32 items-center justify-center text-gray-500 dark:text-gray-400">
           <Loader2 className="mr-2 h-5 w-5 animate-spin" />
           <span>Kurslar yükleniyor...</span>
         </div>
      )}

      {/* Kurslar Yüklendikten Sonraki İçerik */}
      {!loadingCourses && (
        <>
          {/* Kurs Seçimi ve Arama */}
          <div className="mb-6">
             {/* Kurslar yüklenememişse veya hiç kurs yoksa uyarı */}
             {courses.length === 0 && !error && (
                <div className="text-center text-gray-500 dark:text-gray-400 p-4 border rounded mb-4">
                    Görüntülenecek ders bulunamadı. Sistem yöneticinizle iletişime geçin.
                </div>
             )}

            {/* Kurslar varsa filtreleri göster */}
            {courses.length > 0 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                {/* Ders Seçimi Select */}
                <div className="md:col-span-1">
                  <label htmlFor="courseSelect" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Ders
                  </label>
                  <div className="relative">
                    <select
                      id="courseSelect"
                      value={selectedCourseId ?? ''}
                      onChange={handleCourseChange}
                      className="block w-full appearance-none rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                    >
                      <option value="">Ders Seçin</option>
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

                {/* Tarih Filtresi Input */}
                <div className="md:col-span-1">
                  <label htmlFor="dateFilter" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tarih Filtresi
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Calendar className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="date"
                      id="dateFilter"
                      value={dateFilter} // YYYY-MM-DD
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="block w-full rounded-md border border-gray-300 bg-white py-[7px] pl-10 pr-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                      disabled={!selectedCourseId || loadingAttendance} // Kurs seçili değilse veya yükleniyorsa devre dışı
                    />
                  </div>
                </div>

                {/* Arama Input */}
                <div className="md:col-span-2">
                  <label htmlFor="searchInput" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Arama
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="searchInput"
                      placeholder="Tarih, gün, ders saati, tür ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                      disabled={!selectedCourseId || loadingAttendance} // Kurs seçili değilse veya yükleniyorsa devre dışı
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Yoklama İçeriği Alanı */}
          {selectedCourseId !== null ? ( // Sadece kurs seçiliyse bu bölümü göster
            <>
              {/* Yoklama Yükleniyor... */}
              {loadingAttendance && (
                <div className="flex h-64 items-center justify-center text-gray-500 dark:text-gray-400">
                  <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
                  <span>Yoklama kayıtları yükleniyor...</span>
                </div>
              )}

              {/* Yoklama Yüklendikten Sonra */}
              {!loadingAttendance && !error && ( // Yüklenmiyorsa ve hata yoksa
                <>
                  {/* Filtrelenmiş kayıt yoksa */}
                  {filteredRecords.length === 0 && (
                    <div className="rounded-lg border border-dashed bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800/50">
                      {/* ... (Kayıt yok mesajı aynı kalabilir) ... */}
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                        <Calendar className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                      </div>
                      <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                         {attendanceRecords.length > 0 ? 'Filtreyle Eşleşen Kayıt Yok' : 'Yoklama Kaydı Bulunamadı'}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {attendanceRecords.length > 0
                          ? 'Filtre kriterlerinizi değiştirerek veya temizleyerek tekrar deneyin.'
                          : 'Bu ders için henüz yoklama kaydı oluşturulmamış.'}
                      </p>
                      {/* Sadece hiç kayıt yoksa yeni oluşturma butonu göster */}
                      {attendanceRecords.length === 0 && (
                         <div className="mt-6">
                            <button
                              type="button"
                              onClick={() => router.push(`/dashboard/teacher/attendance/new?course=${selectedCourseId}`)}
                              className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                            >
                              <UserCheck className="mr-2 h-4 w-4" />
                              İlk Yoklamayı Oluştur
                            </button>
                          </div>
                      )}
                    </div>
                  )}

                  {/* Filtrelenmiş kayıtlar varsa */}
                  {filteredRecords.length > 0 && (
                    <>
                      {/* Özet Bilgiler Kartları */}
                      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                         {/* Toplam Yoklama (Filtrelenmiş) */}
                         <div className="rounded-lg border bg-white p-4 shadow dark:border-gray-700 dark:bg-gray-800">
                          <div className="flex items-center">
                            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
                              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="ml-4">
                              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Toplam Yoklama</h3>
                              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {summaryStats.totalAttendance}
                              </p>
                            </div>
                          </div>
                        </div>
                         {/* Toplam Tanınan Öğrenci (Filtrelenmiş kayıtlardaki) */}
                         <div className="rounded-lg border bg-white p-4 shadow dark:border-gray-700 dark:bg-gray-800">
                          <div className="flex items-center">
                            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
                              <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="ml-4">
                              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Toplam Tanınan</h3>
                              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {summaryStats.totalRecognizedSum}
                              </p>
                            </div>
                          </div>
                        </div>
                        {/* Son Yoklama Tarihi (Filtrelenmiş) */}
                         <div className="rounded-lg border bg-white p-4 shadow dark:border-gray-700 dark:bg-gray-800">
                          <div className="flex items-center">
                            <div className="rounded-full bg-yellow-100 p-3 dark:bg-yellow-900/30">
                              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <div className="ml-4">
                              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Son Yoklama Tarihi</h3>
                              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {summaryStats.lastAttendanceDate}
                              </p>
                            </div>
                          </div>
                        </div>
                        {/* Ortalama Katılım (Filtrelenmiş) */}
                        <div className="rounded-lg border bg-white p-4 shadow dark:border-gray-700 dark:bg-gray-800">
                          <div className="flex items-center">
                            <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/30">
                              <UserCheck className="h-5 w-5 text-purple-600 dark:text-purple-400"/>
                            </div>
                            <div className="ml-4">
                              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Ortalama Katılım</h3>
                              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {summaryStats.averageParticipation}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Yoklama Listesi Tablosu */}
                      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-gray-800">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                              {/* ... (Tablo başlıkları aynı kalabilir) ... */}
                              <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                  Tarih
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                  Ders Saati
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                  Yoklama Türü
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                  Toplam Öğrenci
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                  Tanınan Öğrenci
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                  Katılım Oranı
                                </th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                  İşlemler
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                              {filteredRecords.map((record) => {
                                // Güvenli erişim ve NaN önleme için hesaplamalar
                                const totalStudents = record.total_students ?? 0;
                                const recognizedStudents = record.recognized_students ?? 0;
                                const participationRate = totalStudents > 0
                                    ? Math.round((recognizedStudents / totalStudents) * 100)
                                    : 0; // NaN önleme
                                const participationText = totalStudents > 0 ? `%${participationRate}` : '-'; // NaN yerine '-' göster

                                // Katılım oranına göre progress bar rengi
                                const progressBarColor =
                                  participationRate >= 90 ? 'bg-green-500' :
                                  participationRate >= 75 ? 'bg-yellow-500' :
                                  participationRate > 0 ? 'bg-red-500' : // %0 ise de kırmızı olabilir veya gri
                                  'bg-gray-300 dark:bg-gray-600'; // Veri yoksa veya %0 ise

                                // Tanınan öğrenci ikonu
                                const recognizedIcon =
                                  recognizedStudents === totalStudents && totalStudents > 0 ? (
                                      <div className="rounded-full bg-green-100 p-1 dark:bg-green-900/30">
                                        <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                                      </div>
                                  ) : recognizedStudents > 0 ? (
                                      <div className="rounded-full bg-yellow-100 p-1 dark:bg-yellow-900/30">
                                        <UserCheck className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                      </div>
                                  ) : (
                                      <div className="rounded-full bg-red-100 p-1 dark:bg-red-900/30">
                                        <UserX className="h-4 w-4 text-red-600 dark:text-red-400" />
                                      </div>
                                  );

                                return (
                                  <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    {/* Tarih */}
                                    <td className="whitespace-nowrap px-6 py-4">
                                      <div className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(record.date)}</div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">{getDayName(record.date)}</div>
                                    </td>
                                    {/* Ders Saati */}
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                                      {record.lesson_number ? `${record.lesson_number}. Ders` : '-'}
                                    </td>
                                    {/* Yoklama Türü */}
                                    <td className="whitespace-nowrap px-6 py-4">
                                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                        record.type?.toUpperCase() === 'FACE'
                                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                          : record.type?.toUpperCase() === 'EMOTION'
                                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                          : record.type?.toUpperCase() === 'FACE_EMOTION'
                                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                          : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300' // Bilinmeyen tür
                                      }`}>
                                        {getAttendanceTypeText(record.type)}
                                      </span>
                                    </td>
                                    {/* Toplam Öğrenci */}
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-center font-medium text-gray-900 dark:text-white">
                                      {totalStudents}
                                    </td>
                                    {/* Tanınan Öğrenci */}
                                    <td className="whitespace-nowrap px-6 py-4">
                                      <div className="flex items-center justify-start"> {/* Sola yasla */}
                                        <div className="mr-2 flex-shrink-0">
                                            {recognizedIcon}
                                        </div>
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                          {recognizedStudents}
                                        </span>
                                      </div>
                                    </td>
                                    {/* Katılım Oranı */}
                                    <td className="whitespace-nowrap px-6 py-4">
                                      <div className="flex items-center">
                                        {totalStudents > 0 ? ( // Sadece toplam öğrenci 0'dan fazlaysa göster
                                          <>
                                            <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                              <div
                                                className={`h-2 rounded-full ${progressBarColor}`}
                                                style={{ width: `${participationRate}%` }}
                                              ></div>
                                            </div>
                                            <span className="ml-2 min-w-[35px] text-right text-sm font-medium text-gray-900 dark:text-white">
                                              {participationText}
                                            </span>
                                          </>
                                        ) : (
                                          <span className="text-sm text-gray-500 dark:text-gray-400">-</span> // Toplam 0 ise '-' göster
                                        )}
                                      </div>
                                    </td>
                                    {/* İşlemler */}
                                    <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium">
                                      <button
                                        onClick={() => viewAttendanceDetails(record.id)}
                                        title="Yoklama Detaylarını Görüntüle"
                                        className="rounded-md bg-white p-1.5 text-gray-500 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-gray-600"
                                        disabled={typeof record.id !== 'number'} // ID geçerli değilse devre dışı
                                      >
                                        <Eye className="h-4 w-4" />
                                        <span className="sr-only">Detayları Görüntüle</span>
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          ) : (
             // Kurs seçilmemişse gösterilecek alan (ve kurslar yüklendiyse)
             !loadingCourses && courses.length > 0 && !error && (
                <div className="rounded-lg border border-dashed bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800/50">
                  {/* ... (Kurs seçin mesajı aynı kalabilir) ... */}
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                    <Filter className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                  </div>
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Ders Seçimi Yapın</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Yoklama geçmişini görüntülemek için lütfen yukarıdan bir ders seçin.
                  </p>
                </div>
             )
          )}
        </>
      )}
    </div>
  )
}