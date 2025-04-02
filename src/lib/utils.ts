import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * CSS sınıflarını birleştirmek için yardımcı fonksiyon
 * @param inputs Birleştirilecek CSS sınıfları
 * @returns Birleştirilmiş CSS sınıfı
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format para birimi
 * @param value Sayısal değer
 * @returns Para birimi formatında string
 */
export function formatCurrency(value: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(value)
}

/**
 * Tarih formatla
 * @param date Tarih nesnesi veya string
 * @returns Formatlanmış tarih
 */
export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

/**
 * İsim kısaltma (örn: Ahmet Yılmaz -> AY)
 * @param firstName İlk isim
 * @param lastName Soyisim
 * @returns Baş harflerden oluşan kısaltma
 */
export function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

/**
 * Tam isim oluştur
 * @param firstName İlk isim
 * @param lastName Soyisim
 * @returns Tam isim
 */
export function getFullName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`
}

/**
 * Yoklama durumu için renk sınıfı döndür
 * @param status Yoklama durumu
 * @returns CSS sınıfı
 */
export function getAttendanceStatusColor(status: string) {
  switch (status) {
    case 'PRESENT':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    case 'ABSENT':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    case 'LATE':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
    case 'EXCUSED':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
  }
} 