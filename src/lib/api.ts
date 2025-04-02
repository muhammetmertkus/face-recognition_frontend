import axios from 'axios'
import * as mockDb from './mock-db'

// API temel URL'i
let API_URL = 'http://localhost:8000/api'

// Geliştirme modunda mock API kullanımı
const USE_MOCK_API = true

// Axios istemcisi oluştur
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// API URL'ini değiştirmek için fonksiyon
const setBaseUrl = (url: string) => {
  API_URL = `${url}/api`
  api.defaults.baseURL = API_URL
}

// İstek interceptor'ü
api.interceptors.request.use(
  (config) => {
    // İsteklere Bearer token ekle
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Yanıt interceptor'ü
api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // 401 hatası ve yeniden deneme yapılmamış ise
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Yenileme token ile access token yenileme
        const refreshToken = localStorage.getItem('refreshToken')
        if (!refreshToken) {
          // Yenileme token yoksa logout
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
          window.location.href = '/auth/login'
          return Promise.reject(error)
        }

        const res = await axios.post(`${API_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        })

        if (res.data.access_token) {
          localStorage.setItem('token', res.data.access_token)
          
          // Yeni token ile orijinal isteği tekrar gönder
          originalRequest.headers.Authorization = `Bearer ${res.data.access_token}`
          return axios(originalRequest)
        }
      } catch (refreshError) {
        // Token yenileme başarısız olursa logout
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        window.location.href = '/auth/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// Mock API yardımcıları
const mockAuth = {
  currentUser: null as mockDb.Teacher | mockDb.Student | null,
  userType: null as 'teacher' | 'student' | null,
  
  login: async (email: string, password: string) => {
    // Basit mock kimlik doğrulama, gerçek doğrulama yapmaz
    const teacher = mockDb.teachers.find(t => t.email === email)
    if (teacher) {
      mockAuth.currentUser = teacher
      mockAuth.userType = 'teacher'
      return { 
        data: { 
          access_token: 'mock_token_teacher', 
          refresh_token: 'mock_refresh_token',
          user: teacher,
          type: 'teacher'
        }
      }
    }
    
    const student = mockDb.students.find(s => s.email === email)
    if (student) {
      mockAuth.currentUser = student
      mockAuth.userType = 'student'
      return { 
        data: { 
          access_token: 'mock_token_student', 
          refresh_token: 'mock_refresh_token',
          user: student,
          type: 'student'
        }
      }
    }
    
    throw { response: { status: 401, data: { message: 'Invalid credentials' } } }
  },
  
  me: async () => {
    if (!mockAuth.currentUser) {
      throw { response: { status: 401, data: { message: 'Unauthorized' } } }
    }
    return { data: { user: mockAuth.currentUser, type: mockAuth.userType } }
  }
}

// API fonksiyonları
const apiService = {
  // Base URL ayarlama
  setBaseUrl,
  
  // Kimlik doğrulama
  auth: {
    login: async (email: string, password: string) => {
      if (USE_MOCK_API) {
        return await mockAuth.login(email, password)
      }
      return api.post('/auth/login', { email, password })
    },
    register: (userData: any) => {
      if (USE_MOCK_API) {
        throw new Error('Register not implemented in mock API')
      }
      return api.post('/auth/register', userData)
    },
    me: async () => {
      if (USE_MOCK_API) {
        return await mockAuth.me()
      }
      return api.get('/auth/me')
    },
    updateProfile: (userData: any) => {
      if (USE_MOCK_API) {
        throw new Error('Update profile not implemented in mock API')
      }
      return api.put('/auth/me', userData)
    },
  },
  
  // Öğretmenler
  teachers: {
    getAll: async () => {
      if (USE_MOCK_API) {
        const data = await mockDb.simulateFetch(mockDb.teachers)
        return { data }
      }
      return api.get('/teachers')
    },
    getById: async (id: string | number) => {
      if (USE_MOCK_API) {
        const teacher = await mockDb.simulateFetch(mockDb.getTeacherById(String(id)))
        if (!teacher) throw { response: { status: 404, data: { message: 'Teacher not found' } } }
        return { data: teacher }
      }
      return api.get(`/teachers/${id}`)
    },
    create: (teacherData: any) => {
      if (USE_MOCK_API) {
        throw new Error('Create teacher not implemented in mock API')
      }
      return api.post('/teachers', teacherData)
    },
    update: (id: number, teacherData: any) => {
      if (USE_MOCK_API) {
        throw new Error('Update teacher not implemented in mock API')
      }
      return api.put(`/teachers/${id}`, teacherData)
    },
    delete: (id: number) => {
      if (USE_MOCK_API) {
        throw new Error('Delete teacher not implemented in mock API')
      }
      return api.delete(`/teachers/${id}`)
    },
    getCourses: async (id: string | number) => {
      if (USE_MOCK_API) {
        const courses = await mockDb.simulateFetch(mockDb.getTeacherCourses(String(id)))
        return { data: courses }
      }
      return api.get(`/teachers/${id}/courses`)
    },
  },
  
  // Öğrenciler
  students: {
    getAll: async () => {
      if (USE_MOCK_API) {
        const data = await mockDb.simulateFetch(mockDb.students)
        return { data }
      }
      return api.get('/students')
    },
    getById: async (id: string | number) => {
      if (USE_MOCK_API) {
        const student = await mockDb.simulateFetch(mockDb.getStudentById(String(id)))
        if (!student) throw { response: { status: 404, data: { message: 'Student not found' } } }
        return { data: student }
      }
      return api.get(`/students/${id}`)
    },
    create: (studentData: any) => {
      if (USE_MOCK_API) {
        throw new Error('Create student not implemented in mock API')
      }
      return api.post('/students', studentData)
    },
    createWithFace: (formData: FormData) => {
      if (USE_MOCK_API) {
        throw new Error('Create student with face not implemented in mock API')
      }
      return api.post('/students/create-with-face', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    },
    update: (id: number, studentData: any) => {
      if (USE_MOCK_API) {
        throw new Error('Update student not implemented in mock API')
      }
      return api.put(`/students/${id}`, studentData)
    },
    delete: (id: number) => {
      if (USE_MOCK_API) {
        throw new Error('Delete student not implemented in mock API')
      }
      return api.delete(`/students/${id}`)
    },
    uploadFace: (id: number, file: File) => {
      if (USE_MOCK_API) {
        throw new Error('Upload face not implemented in mock API')
      }
      const formData = new FormData()
      formData.append('file', file)
      return api.post(`/students/${id}/upload-face`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    },
  },
  
  // Dersler
  courses: {
    getAll: async () => {
      if (USE_MOCK_API) {
        const data = await mockDb.simulateFetch(mockDb.courses)
        return { data }
      }
      return api.get('/courses')
    },
    getById: async (id: string | number) => {
      if (USE_MOCK_API) {
        const course = await mockDb.simulateFetch(mockDb.getCourseById(String(id)))
        if (!course) throw { response: { status: 404, data: { message: 'Course not found' } } }
        return { data: course }
      }
      return api.get(`/courses/${id}`)
    },
    create: (courseData: any) => {
      if (USE_MOCK_API) {
        throw new Error('Create course not implemented in mock API')
      }
      return api.post('/courses', courseData)
    },
    update: (id: number, courseData: any) => {
      if (USE_MOCK_API) {
        throw new Error('Update course not implemented in mock API')
      }
      return api.put(`/courses/${id}`, courseData)
    },
    delete: (id: number) => {
      if (USE_MOCK_API) {
        throw new Error('Delete course not implemented in mock API')
      }
      return api.delete(`/courses/${id}`)
    },
    getStudents: async (id: string | number) => {
      if (USE_MOCK_API) {
        const students = await mockDb.simulateFetch(mockDb.getCourseStudents(String(id)))
        return { data: students }
      }
      return api.get(`/courses/${id}/students`)
    },
    addStudent: (courseId: number, studentId: number) => {
      if (USE_MOCK_API) {
        throw new Error('Add student to course not implemented in mock API')
      }
      return api.post(`/courses/${courseId}/students`, { student_id: studentId })
    },
    removeStudent: (courseId: number, studentId: number) => {
      if (USE_MOCK_API) {
        throw new Error('Remove student from course not implemented in mock API')
      }
      return api.delete(`/courses/${courseId}/students/${studentId}`)
    },
  },
  
  // Yoklama
  attendance: {
    getAll: async (courseId: string | number) => {
      if (USE_MOCK_API) {
        const data = await mockDb.simulateFetch(mockDb.getCourseAttendance(String(courseId)))
        return { data }
      }
      return api.get(`/attendance?course_id=${courseId}`)
    },
    getById: async (id: string | number) => {
      if (USE_MOCK_API) {
        throw new Error('Get attendance by id not implemented in mock API')
      }
      return api.get(`/attendance/${id}`)
    },
    takeFaceAttendance: (courseId: number, date: string, lessonNumber: number, file: File) => {
      if (USE_MOCK_API) {
        throw new Error('Take face attendance not implemented in mock API')
      }
      const formData = new FormData()
      formData.append('course_id', courseId.toString())
      formData.append('date', date)
      formData.append('lesson_number', lessonNumber.toString())
      formData.append('type', 'FACE')
      formData.append('file', file)
      
      return api.post('/attendance', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    },
    takeManualAttendance: (courseId: number, date: string, lessonNumber: number, attendanceData: any[]) => {
      if (USE_MOCK_API) {
        throw new Error('Take manual attendance not implemented in mock API')
      }
      return api.post('/attendance', {
        course_id: courseId,
        date,
        lesson_number: lessonNumber,
        type: 'MANUAL',
        attendance_data: attendanceData,
      })
    },
    getStudentAttendance: async (studentId: string | number, courseId?: string | number) => {
      if (USE_MOCK_API) {
        let data
        if (courseId) {
          // Belirli dersin yoklama kayıtlarını filtrele
          data = await mockDb.simulateFetch(
            mockDb.getStudentAttendance(String(studentId))
              .filter(a => a.courseId === String(courseId))
          )
        } else {
          data = await mockDb.simulateFetch(mockDb.getStudentAttendance(String(studentId)))
        }
        return { data }
      }
      let url = `/attendance/student/${studentId}`
      if (courseId) {
        url += `?course_id=${courseId}`
      }
      return api.get(url)
    },
  },
}

export default apiService 