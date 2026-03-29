import { AppData, Student, Course, AttendanceRecord, Teacher } from '../types';

const AUTH_KEY = 'uni_attend_auth';
const DATA_PREFIX = 'uni_attend_data_';

const initialTeacherData = {
  students: [],
  courses: [],
  attendance: [],
};

export const storage = {
  getAuth: () => {
    const auth = localStorage.getItem(AUTH_KEY);
    return auth ? JSON.parse(auth) : { teachers: [], currentTeacherId: null };
  },

  saveAuth: (auth: { teachers: Teacher[], currentTeacherId: string | null }) => {
    localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  },

  getCurrentTeacher: (): Teacher | null => {
    const auth = storage.getAuth();
    if (!auth.currentTeacherId) return null;
    return auth.teachers.find((t: Teacher) => t.id === auth.currentTeacherId) || null;
  },

  register: (teacher: Omit<Teacher, 'id'>) => {
    const auth = storage.getAuth();
    if (auth.teachers.find((t: Teacher) => t.username === teacher.username)) {
      throw new Error('Username already exists');
    }
    const newTeacher = { ...teacher, id: crypto.randomUUID() };
    auth.teachers.push(newTeacher);
    storage.saveAuth(auth);
    return newTeacher;
  },

  login: (username: string, password: string): Teacher | null => {
    const auth = storage.getAuth();
    const teacher = auth.teachers.find((t: Teacher) => t.username === username && t.password === password);
    if (teacher) {
      auth.currentTeacherId = teacher.id;
      storage.saveAuth(auth);
      return teacher;
    }
    return null;
  },

  logout: () => {
    const auth = storage.getAuth();
    auth.currentTeacherId = null;
    storage.saveAuth(auth);
  },

  getData: (): AppData => {
    const teacher = storage.getCurrentTeacher();
    if (!teacher) return { ...initialTeacherData, teacher: null };

    const data = localStorage.getItem(`${DATA_PREFIX}${teacher.id}`);
    if (!data) return { ...initialTeacherData, teacher };
    
    try {
      const parsed = JSON.parse(data);
      return { ...initialTeacherData, ...parsed, teacher };
    } catch (e) {
      console.error('Failed to parse teacher data', e);
      return { ...initialTeacherData, teacher };
    }
  },

  saveData: (data: AppData) => {
    const teacher = storage.getCurrentTeacher();
    if (!teacher) return;
    
    // Don't save the teacher object inside the data blob to avoid redundancy
    const { teacher: _, ...dataToSave } = data;
    localStorage.setItem(`${DATA_PREFIX}${teacher.id}`, JSON.stringify(dataToSave));
  },

  setTeacher: (teacher: Teacher | null) => {
    if (!teacher) {
      storage.logout();
    } else {
      // This is mostly handled by login/register now
      const auth = storage.getAuth();
      auth.currentTeacherId = teacher.id;
      storage.saveAuth(auth);
    }
  },

  addStudent: (student: Omit<Student, 'id'>) => {
    const data = storage.getData();
    const newStudent = { ...student, id: crypto.randomUUID() };
    data.students.push(newStudent);
    storage.saveData(data);
    return newStudent;
  },

  updateStudent: (student: Student) => {
    const data = storage.getData();
    const index = data.students.findIndex(s => s.id === student.id);
    if (index > -1) {
      data.students[index] = student;
      storage.saveData(data);
    }
  },

  deleteStudent: (studentId: string) => {
    const data = storage.getData();
    data.students = data.students.filter(s => s.id !== studentId);
    // Also remove from courses
    data.courses.forEach(course => {
      course.studentIds = course.studentIds.filter(id => id !== studentId);
    });
    // Also remove attendance records
    data.attendance = data.attendance.filter(r => r.studentId !== studentId);
    storage.saveData(data);
  },

  addCourse: (course: Omit<Course, 'id' | 'studentIds'>) => {
    const data = storage.getData();
    const newCourse = { ...course, id: crypto.randomUUID(), studentIds: [] };
    data.courses.push(newCourse);
    storage.saveData(data);
    return newCourse;
  },

  addStudentToCourse: (courseId: string, studentId: string) => {
    const data = storage.getData();
    const course = data.courses.find(c => c.id === courseId);
    if (course && !course.studentIds.includes(studentId)) {
      course.studentIds.push(studentId);
      storage.saveData(data);
    }
  },

  markAttendance: (records: Omit<AttendanceRecord, 'id'>[]) => {
    const data = storage.getData();
    records.forEach(record => {
      // Find existing record for same date, course, student, and periods
      const existingIndex = data.attendance.findIndex(
        r => r.date === record.date && 
             r.courseId === record.courseId && 
             r.studentId === record.studentId &&
             JSON.stringify(r.periods) === JSON.stringify(record.periods)
      );

      if (existingIndex > -1) {
        data.attendance[existingIndex].status = record.status;
        data.attendance[existingIndex].notes = record.notes;
      } else {
        data.attendance.push({ ...record, id: crypto.randomUUID() });
      }
    });
    storage.saveData(data);
  },

  getAttendanceForDate: (courseId: string, date: string, periods?: number[]) => {
    const data = storage.getData();
    return data.attendance.filter(r => {
      const matchDate = r.courseId === courseId && r.date === date;
      if (periods) {
        return matchDate && JSON.stringify(r.periods) === JSON.stringify(periods);
      }
      return matchDate;
    });
  },

  exportToCSV: (courseId: string) => {
    const data = storage.getData();
    const course = data.courses.find(c => c.id === courseId);
    if (!course) return;

    const courseStudents = data.students.filter(s => course.studentIds.includes(s.id));
    const courseAttendance = data.attendance.filter(r => r.courseId === courseId);

    // Get unique sessions (date + periods)
    const sessions = Array.from(new Set(courseAttendance.map(r => JSON.stringify({ date: r.date, periods: r.periods }))))
      .map(s => JSON.parse(s))
      .sort((a, b) => a.date.localeCompare(b.date));

    let csv = 'Roll Number,Name,' + sessions.map(s => `${s.date} (P:${s.periods.join(',')})`).join(',') + '\n';

    courseStudents.forEach(student => {
      let row = `${student.rollNumber},${student.name}`;
      sessions.forEach(session => {
        const record = courseAttendance.find(r => 
          r.date === session.date && 
          r.studentId === student.id && 
          JSON.stringify(r.periods) === JSON.stringify(session.periods)
        );
        row += `,${record ? record.status : 'N/A'}`;
      });
      csv += row + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${course.name}_attendance.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};
