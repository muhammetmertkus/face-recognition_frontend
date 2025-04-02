// Bu dosya API isteklerini simüle etmek için kullanılır
// Gerçek bir API olmadığında geliştirme için kullanılabilir

export type Teacher = {
    id: string;
    name: string;
    email: string;
    avatar?: string;
};

export type Student = {
    id: string;
    name: string;
    email: string;
    studentId: string;
    avatar?: string;
    faceEncoding?: string;
};

export type Course = {
    id: string;
    name: string;
    code: string;
    teacherId: string;
    description?: string;
    studentIds: string[];
    schedule: {
        day: string;
        startTime: string;
        endTime: string;
        room: string;
    }[];
};

export type Attendance = {
    id: string;
    courseId: string;
    date: string;
    studentId: string;
    status: "present" | "absent" | "late";
    verificationMethod: "face" | "manual";
    timestamp: string;
};

export type Session = {
    id: string;
    courseId: string;
    date: string;
    startTime: string;
    endTime: string;
    room: string;
    attendanceIds: string[];
};

// Mock veri
export const teachers: Teacher[] = [
    {
        id: "t1",
        name: "Prof. Ahmet Yılmaz",
        email: "ahmet.yilmaz@edu.com",
        avatar: "https://i.pravatar.cc/150?u=t1",
    },
    {
        id: "t2",
        name: "Doç. Dr. Ayşe Kaya",
        email: "ayse.kaya@edu.com",
        avatar: "https://i.pravatar.cc/150?u=t2",
    },
];

export const students: Student[] = [
    {
        id: "s1",
        name: "Mehmet Can",
        email: "mehmet.can@student.edu.com",
        studentId: "20210001",
        avatar: "https://i.pravatar.cc/150?u=s1",
    },
    {
        id: "s2",
        name: "Zeynep Aydın",
        email: "zeynep.aydin@student.edu.com",
        studentId: "20210002",
        avatar: "https://i.pravatar.cc/150?u=s2",
    },
    {
        id: "s3",
        name: "Ali Demir",
        email: "ali.demir@student.edu.com",
        studentId: "20210003",
        avatar: "https://i.pravatar.cc/150?u=s3",
    },
    {
        id: "s4",
        name: "Elif Yıldız",
        email: "elif.yildiz@student.edu.com",
        studentId: "20210004",
        avatar: "https://i.pravatar.cc/150?u=s4",
    },
];

export const courses: Course[] = [
    {
        id: "c1",
        name: "Yapay Zeka",
        code: "BIL401",
        teacherId: "t1",
        description: "Yapay zeka temel kavramlar ve uygulamalar",
        studentIds: ["s1", "s2", "s3"],
        schedule: [
            {
                day: "Pazartesi",
                startTime: "10:00",
                endTime: "12:00",
                room: "A101",
            },
            {
                day: "Çarşamba",
                startTime: "14:00",
                endTime: "16:00",
                room: "A101",
            },
        ],
    },
    {
        id: "c2",
        name: "Veri Yapıları",
        code: "BIL203",
        teacherId: "t1",
        description: "Temel veri yapıları ve algoritmalar",
        studentIds: ["s1", "s3", "s4"],
        schedule: [
            {
                day: "Salı",
                startTime: "09:00",
                endTime: "11:00",
                room: "B202",
            },
            {
                day: "Perşembe",
                startTime: "13:00",
                endTime: "15:00",
                room: "B202",
            },
        ],
    },
    {
        id: "c3",
        name: "Web Programlama",
        code: "BIL305",
        teacherId: "t2",
        description: "Modern web teknolojileri ve uygulamaları",
        studentIds: ["s2", "s3", "s4"],
        schedule: [
            {
                day: "Çarşamba",
                startTime: "10:00",
                endTime: "12:00",
                room: "C303",
            },
            {
                day: "Cuma",
                startTime: "14:00",
                endTime: "16:00",
                room: "C303",
            },
        ],
    },
];

export const attendances: Attendance[] = [
    {
        id: "a1",
        courseId: "c1",
        date: "2023-03-06",
        studentId: "s1",
        status: "present",
        verificationMethod: "face",
        timestamp: "2023-03-06T10:05:32Z",
    },
    {
        id: "a2",
        courseId: "c1",
        date: "2023-03-06",
        studentId: "s2",
        status: "present",
        verificationMethod: "face",
        timestamp: "2023-03-06T10:03:12Z",
    },
    {
        id: "a3",
        courseId: "c1",
        date: "2023-03-06",
        studentId: "s3",
        status: "late",
        verificationMethod: "face",
        timestamp: "2023-03-06T10:15:45Z",
    },
    {
        id: "a4",
        courseId: "c1",
        date: "2023-03-08",
        studentId: "s1",
        status: "present",
        verificationMethod: "face",
        timestamp: "2023-03-08T14:02:22Z",
    },
    {
        id: "a5",
        courseId: "c1",
        date: "2023-03-08",
        studentId: "s2",
        status: "absent",
        verificationMethod: "manual",
        timestamp: "2023-03-08T14:10:00Z",
    },
    {
        id: "a6",
        courseId: "c1",
        date: "2023-03-08",
        studentId: "s3",
        status: "present",
        verificationMethod: "face",
        timestamp: "2023-03-08T14:05:18Z",
    },
];

export const sessions: Session[] = [
    {
        id: "ses1",
        courseId: "c1",
        date: "2023-03-06",
        startTime: "10:00",
        endTime: "12:00",
        room: "A101",
        attendanceIds: ["a1", "a2", "a3"],
    },
    {
        id: "ses2",
        courseId: "c1",
        date: "2023-03-08",
        startTime: "14:00",
        endTime: "16:00",
        room: "A101",
        attendanceIds: ["a4", "a5", "a6"],
    },
];

// Helper fonksiyonlar
export function getTeacherById(id: string): Teacher | undefined {
    return teachers.find(teacher => teacher.id === id);
}

export function getTeacherCourses(teacherId: string): Course[] {
    return courses.filter(course => course.teacherId === teacherId);
}

export function getStudentById(id: string): Student | undefined {
    return students.find(student => student.id === id);
}

export function getStudentCourses(studentId: string): Course[] {
    return courses.filter(course => course.studentIds.includes(studentId));
}

export function getCourseById(id: string): Course | undefined {
    return courses.find(course => course.id === id);
}

export function getCourseStudents(courseId: string): Student[] {
    const course = getCourseById(courseId);
    if (!course) return [];
    return students.filter(student => course.studentIds.includes(student.id));
}

export function getCourseAttendance(courseId: string): Attendance[] {
    return attendances.filter(attendance => attendance.courseId === courseId);
}

export function getStudentAttendance(studentId: string): Attendance[] {
    return attendances.filter(attendance => attendance.studentId === studentId);
}

export function getSessionById(id: string): Session | undefined {
    return sessions.find(session => session.id === id);
}

export function getCourseSessionsAttendance(courseId: string, date: string): Attendance[] {
    return attendances.filter(
        attendance => attendance.courseId === courseId && attendance.date === date
    );
}

// Simüle edilmiş gecikmeli veri alımı
export async function simulateFetch<T>(data: T): Promise<T> {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(data);
        }, 500);
    });
} 