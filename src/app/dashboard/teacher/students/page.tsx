"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import {
  Search,
  PlusCircle,
  Trash,
  Edit,
  Loader2,
  UserX,
  User,
  AlertCircle,
  School,
  GraduationCap,
  Mail,
  Filter,
  MoreVertical,
  Image,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  CheckCircle2,
  X
} from 'lucide-react'

type UserType = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
}

type StudentType = {
  id: number;
  user_id: number;
  student_number: string;
  department: string;
  face_photo_url: string | null;
  created_at: string;
  updated_at: string;
  user: UserType;
}

export default function StudentsPage() {
  const { token, apiUrl } = useAuth()
  const router = useRouter()
  
  const [students, setStudents] = useState<StudentType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDepartment, setFilterDepartment] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [departments, setDepartments] = useState<string[]>([])
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  
  // Öğrencileri getir
  useEffect(() => {
    const fetchStudents = async () => {
      if (!token) return
      
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`${apiUrl}/api/students/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        })
        
        if (!response.ok) {
          throw new Error(`Öğrenciler yüklenirken hata: ${response.status}`)
        }
        
        const data = await response.json()
        setStudents(data)
        
        // Bölüm listesini çıkar
        const uniqueDepartments = Array.from(
          new Set(data.map((student: StudentType) => student.department))
        ).sort()
        
        setDepartments(uniqueDepartments as string[])
      } catch (error) {
        console.error('Öğrenciler yüklenirken hata:', error)
        setError('Öğrenciler yüklenemedi. Lütfen daha sonra tekrar deneyin.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchStudents()
  }, [token, apiUrl])
  
  // Öğrenci silme
  const deleteStudent = async (studentId: number) => {
    if (!token) return
    
    try {
      setDeletingId(studentId)
      
      const response = await fetch(`${apiUrl}/api/students/${studentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Öğrenci silinirken hata: ${response.status}`)
      }
      
      // Başarılı silme işleminden sonra listeyi güncelle
      setStudents(students.filter(student => student.id !== studentId))
      setShowDeleteConfirm(false)
    } catch (error) {
      console.error('Öğrenci silinirken hata:', error)
      alert('Öğrenci silinemedi. Lütfen daha sonra tekrar deneyin.')
    } finally {
      setDeletingId(null)
    }
  }
  
  // Silme onayı gösterme
  const confirmDelete = (studentId: number) => {
    setDeletingId(studentId)
    setShowDeleteConfirm(true)
  }
  
  // Arama ve filtreleme
  const filteredStudents = students.filter(student => {
    const matchesSearch = searchTerm === '' || 
      student.user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${student.user.first_name} ${student.user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
      
    const matchesDepartment = filterDepartment === '' || student.department === filterDepartment
    
    return matchesSearch && matchesDepartment
  })
  
  // Pagination hesaplamaları
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredStudents.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage)
  
  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber)
    }
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Başlık ve Yeni Öğrenci Butonu */}
      <div className="mb-8 flex flex-col justify-between space-y-4 sm:flex-row sm:items-center sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Öğrenci Yönetimi</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Sisteme kayıtlı tüm öğrencileri yönetin ve yenilerini ekleyin
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/teacher/students/new')}
          className="inline-flex items-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <PlusCircle className="mr-2 h-5 w-5" />
          Yeni Öğrenci Ekle
        </button>
      </div>
      
      {/* Arama ve Filtreleme */}
      <div className="mb-6 flex flex-col space-y-3 md:flex-row md:space-x-4 md:space-y-0">
        <div className="flex-1">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="İsim, öğrenci numarası veya e-posta ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full rounded-md border border-gray-300 bg-white p-2 pl-10 pr-3 text-sm placeholder-gray-400 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>
        <div className="w-full md:w-64">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Filter className="h-5 w-5 text-gray-400" />
            </div>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="block w-full rounded-md border border-gray-300 bg-white p-2 pl-10 pr-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="">Tüm Bölümler</option>
              {departments.map((dept, index) => (
                <option key={index} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Silme Onayı Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-center text-yellow-500">
              <AlertCircle className="h-12 w-12" />
            </div>
            <h3 className="mb-4 text-center text-lg font-medium text-gray-900 dark:text-white">
              Öğrenciyi Silmek İstediğinizden Emin misiniz?
            </h3>
            <p className="mb-6 text-center text-gray-600 dark:text-gray-400">
              Bu işlem geri alınamaz ve öğrencinin tüm bilgileri ve kayıtları silinecektir.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                İptal
              </button>
              <button
                onClick={() => deletingId !== null && deleteStudent(deletingId)}
                className="rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                disabled={deletingId === null}
              >
                {deletingId !== null ? (
                  <>
                    <Trash className="mr-2 inline-block h-4 w-4" />
                    Öğrenciyi Sil
                  </>
                ) : (
                  <Loader2 className="mr-2 inline-block h-4 w-4 animate-spin" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Öğrenci Listesi */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
          <span>Öğrenciler yükleniyor...</span>
        </div>
      ) : error ? (
        <div className="rounded-md bg-red-50 p-4 text-red-800 dark:bg-red-900/30 dark:text-red-300">
          <div className="flex">
            <AlertCircle className="mr-3 h-5 w-5 text-red-400 dark:text-red-300" />
            <span>{error}</span>
          </div>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Öğrenci Bulunamadı</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Arama kriterlerinize uygun öğrenci bulunamadı.
          </p>
          <div className="mt-6">
            <button
              onClick={() => {
                setSearchTerm('')
                setFilterDepartment('')
              }}
              className="inline-flex items-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <X className="mr-2 h-4 w-4" />
              Filtreleri Temizle
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Öğrenci Tablosu */}
          <div className="overflow-hidden rounded-lg border border-gray-200 shadow dark:border-gray-700">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Öğrenci
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Öğrenci No
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Bölüm
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      E-posta
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Yüz Kaydı
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {currentItems.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            {student.face_photo_url ? (
                              <img
                                src={`${apiUrl}${student.face_photo_url}`}
                                alt={`${student.user.first_name} ${student.user.last_name}`}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                                <User className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {student.user.first_name} {student.user.last_name}
                            </div>
                            {student.user.is_active ? (
                              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Aktif
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                <X className="mr-1 h-3 w-3" />
                                Pasif
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center">
                          <School className="mr-2 h-4 w-4 text-gray-400" />
                          {student.student_number}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center">
                          <GraduationCap className="mr-2 h-4 w-4 text-gray-400" />
                          {student.department}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center">
                          <Mail className="mr-2 h-4 w-4 text-gray-400" />
                          {student.user.email}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {student.face_photo_url ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Yüklendi
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                            <Image className="mr-1 h-3 w-3" />
                            Gerekli
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => router.push(`/dashboard/teacher/students/${student.id}/edit`)}
                            className="rounded bg-blue-50 p-1.5 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                            title="Düzenle"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => confirmDelete(student.id)}
                            className="rounded bg-red-50 p-1.5 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
                            title="Sil"
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredStudents.length)} / {filteredStudents.length} öğrenci
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => paginate(i + 1)}
                    className={`inline-flex items-center rounded-md px-3 py-1 text-sm font-medium ${
                      currentPage === i + 1
                        ? 'bg-primary text-white'
                        : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
} 