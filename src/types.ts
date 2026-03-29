export interface Student {
  id: string;
  name: string;
  rollNumber: string;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  studentIds: string[];
}

export interface AttendanceRecord {
  id: string;
  date: string; // ISO format
  courseId: string;
  studentId: string;
  status: 'present' | 'absent';
  periods: number[];
  notes?: string;
}

export interface Teacher {
  id: string;
  username: string;
  password?: string; // Local-only for now
  name: string;
}

export interface AppData {
  students: Student[];
  courses: Course[];
  attendance: AttendanceRecord[];
  teacher: Teacher | null;
}
