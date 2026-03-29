/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  CalendarCheck, 
  Plus, 
  ChevronRight, 
  Download, 
  CheckCircle2, 
  XCircle,
  ArrowLeft,
  Search,
  MoreVertical,
  Trash2,
  LogOut,
  Lock,
  User,
  WifiOff,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { format } from 'date-fns';
import { storage } from './lib/storage';
import { AppData, Course, Student, AttendanceRecord, Teacher } from './types';
import { cn } from './lib/utils';

type View = 'splash' | 'login' | 'dashboard' | 'courses' | 'students' | 'attendance' | 'course-detail';

export default function App() {
  const [view, setView] = useState<View>('splash');
  const [data, setData] = useState<AppData>(storage.getData());
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [attendanceDate, setAttendanceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedPeriods, setSelectedPeriods] = useState<number[]>([]);
  const [lectureNote, setLectureNote] = useState('');
  const [sessionAttendance, setSessionAttendance] = useState<Record<string, 'present' | 'absent'>>({});
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showEditStudent, setShowEditStudent] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [newCourse, setNewCourse] = useState({ name: '', code: '' });
  const [newStudent, setNewStudent] = useState({ name: '', rollNumber: '' });
  const [searchQuery, setSearchQuery] = useState('');
  
  // Login state
  const [loginForm, setLoginForm] = useState({ username: '', password: '', name: '' });
  const [isSignup, setIsSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Refresh data from storage
  const refreshData = () => {
    setData(storage.getData());
  };

  const getStudentStats = (studentId: string) => {
    const studentAttendance = data.attendance.filter(r => r.studentId === studentId);
    const total = studentAttendance.length;
    const present = studentAttendance.filter(r => r.status === 'present').length;
    const absent = total - present;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, percentage };
  };

  useEffect(() => {
    // Splash screen timeout
    if (view === 'splash') {
      const timer = setTimeout(() => {
        const currentData = storage.getData();
        if (currentData.teacher) {
          setView('dashboard');
        } else {
          setView('login');
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [view]);

  useEffect(() => {
    refreshData();
    if (view === 'attendance' && selectedCourse) {
      // Initialize session attendance from storage if it exists
      const existing = storage.getAttendanceForDate(selectedCourse.id, attendanceDate, selectedPeriods);
      const initial: Record<string, 'present' | 'absent'> = {};
      existing.forEach(r => {
        initial[r.studentId] = r.status;
      });
      setSessionAttendance(initial);
    }
  }, [view, attendanceDate, selectedPeriods]);

  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCourse.name && newCourse.code) {
      storage.addCourse(newCourse);
      setNewCourse({ name: '', code: '' });
      setShowAddCourse(false);
      refreshData();
      toast.success('Course added successfully!', {
        icon: <CheckCircle className="text-green-500" size={18} />
      });
    }
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStudent.name && newStudent.rollNumber) {
      const student = storage.addStudent(newStudent);
      if (selectedCourse) {
        storage.addStudentToCourse(selectedCourse.id, student.id);
      }
      setNewStudent({ name: '', rollNumber: '' });
      setShowAddStudent(false);
      refreshData();
      toast.success('Student added successfully!', {
        icon: <CheckCircle className="text-green-500" size={18} />
      });
    }
  };

  const handleUpdateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStudent) {
      storage.updateStudent(editingStudent);
      setShowEditStudent(false);
      setEditingStudent(null);
      refreshData();
      toast.success('Student updated successfully!', {
        icon: <CheckCircle className="text-green-500" size={18} />
      });
    }
  };

  const handleDeleteStudent = (studentId: string) => {
    storage.deleteStudent(studentId);
    setShowEditStudent(false);
    setEditingStudent(null);
    setConfirmDelete(null);
    refreshData();
    toast.error('Student deleted');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignup) {
      try {
        storage.register({
          username: loginForm.username,
          password: loginForm.password,
          name: loginForm.name || loginForm.username.split('@')[0]
        });
        toast.success('Account created! Please login.');
        setIsSignup(false);
        setLoginForm({ ...loginForm, password: '' });
      } catch (err: any) {
        toast.error(err.message);
      }
      return;
    }

    const teacher = storage.login(loginForm.username, loginForm.password);
    if (teacher) {
      refreshData();
      setView('dashboard');
      toast.success('Logged in successfully!');
    } else {
      toast.error('Invalid username or password');
    }
  };

  const handleLogout = () => {
    storage.logout();
    refreshData();
    setView('login');
    toast.info('Logged out');
  };

  const toggleAttendance = (studentId: string) => {
    setSessionAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'present' ? 'absent' : 'present'
    }));
  };

  const handleSaveAttendance = () => {
    if (!selectedCourse || selectedPeriods.length === 0) {
      alert('Please select at least one period');
      return;
    }
    
    const records = (Object.entries(sessionAttendance) as [string, 'present' | 'absent'][]).map(([studentId, status]) => ({
      date: attendanceDate,
      courseId: selectedCourse.id,
      studentId,
      status,
      periods: selectedPeriods,
      notes: lectureNote
    }));

    if (records.length === 0) {
      alert('No attendance marked');
      return;
    }

    storage.markAttendance(records);
    refreshData();
    setView('course-detail');
    toast.success('Attendance saved successfully!', {
      icon: <CheckCircle className="text-green-500" size={20} />
    });
  };

  const periodColors: Record<number, string> = {
    1: 'bg-blue-500',
    2: 'bg-green-500',
    3: 'bg-yellow-500',
    4: 'bg-orange-500',
    5: 'bg-red-500',
    6: 'bg-purple-500',
    7: 'bg-pink-500',
    8: 'bg-indigo-500',
  };

  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Welcome back, {data.teacher?.name}</p>
        </div>
        <button 
          onClick={handleLogout}
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
        >
          <LogOut size={20} />
        </button>
      </header>

      <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-xl text-xs font-bold border border-green-100">
        <WifiOff size={14} /> Offline Mode Active • Data Saved Locally
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Courses</p>
          <p className="text-3xl font-bold mt-1">{data.courses.length}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Students</p>
          <p className="text-3xl font-bold mt-1">{data.students.length}</p>
        </div>
      </div>

      <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-lg shadow-indigo-200">
        <h2 className="text-xl font-semibold">Quick Attendance</h2>
        <p className="opacity-80 mt-1">Mark attendance for today's classes</p>
        <button 
          onClick={() => setView('courses')}
          className="mt-4 bg-white text-indigo-600 px-4 py-2 rounded-xl font-medium flex items-center gap-2"
        >
          Select Course <ChevronRight size={18} />
        </button>
      </div>

      <section>
        <h3 className="text-lg font-semibold mb-4">Recent Courses</h3>
        <div className="space-y-3">
          {data.courses.slice(0, 3).map(course => (
            <div 
              key={course.id}
              onClick={() => { setSelectedCourse(course); setView('course-detail'); }}
              className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between cursor-pointer active:scale-95 transition-transform"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <BookOpen size={20} />
                </div>
                <div>
                  <p className="font-semibold">{course.name}</p>
                  <p className="text-xs text-gray-500 uppercase">{course.code}</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-300" />
            </div>
          ))}
          {data.courses.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No courses added yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );

  const renderCourses = () => (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Courses</h1>
        <button 
          onClick={() => setShowAddCourse(true)}
          className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md active:scale-90 transition-transform"
        >
          <Plus size={24} />
        </button>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text" 
          placeholder="Search courses..." 
          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-indigo-500"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {data.courses
          .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.code.toLowerCase().includes(searchQuery.toLowerCase()))
          .map(course => (
          <motion.div 
            layoutId={course.id}
            key={course.id}
            onClick={() => { setSelectedCourse(course); setView('course-detail'); }}
            className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm active:scale-98 transition-transform"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <BookOpen size={24} />
              </div>
              <span className="bg-indigo-50 text-indigo-600 text-xs font-bold px-2 py-1 rounded-lg uppercase">
                {course.code}
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-900">{course.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{course.studentIds.length} Students enrolled</p>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderCourseDetail = () => {
    if (!selectedCourse) return null;
    const courseStudents = data.students.filter(s => selectedCourse.studentIds.includes(s.id));
    
    return (
      <div className="space-y-6">
        <header className="flex items-center gap-4">
          <button onClick={() => setView('courses')} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{selectedCourse.name}</h1>
            <p className="text-sm text-gray-500 uppercase font-medium">{selectedCourse.code}</p>
          </div>
        </header>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button 
            onClick={() => {
              setSelectedPeriods([]);
              setLectureNote('');
              setSessionAttendance({});
              setView('attendance');
            }}
            className="bg-indigo-600 text-white px-4 py-3 rounded-2xl font-medium flex items-center gap-2 whitespace-nowrap shadow-lg shadow-indigo-100"
          >
            <CalendarCheck size={18} /> Take Attendance
          </button>
          <button 
            onClick={() => storage.exportToCSV(selectedCourse.id)}
            className="bg-white border border-gray-200 text-gray-700 px-4 py-3 rounded-2xl font-medium flex items-center gap-2 whitespace-nowrap shadow-sm"
          >
            <Download size={18} /> Export CSV
          </button>
          <button 
            onClick={() => setShowAddStudent(true)}
            className="bg-white border border-gray-200 text-gray-700 px-4 py-3 rounded-2xl font-medium flex items-center gap-2 whitespace-nowrap shadow-sm"
          >
            <Plus size={18} /> Add Student
          </button>
        </div>

        <section>
          <h3 className="text-lg font-semibold mb-3">Recent Sessions</h3>
          <div className="space-y-3">
            {(Array.from(new Set(data.attendance.filter(r => r.courseId === selectedCourse.id).map(r => JSON.stringify({ date: r.date, periods: r.periods, notes: r.notes })))) as string[])
              .map(s => JSON.parse(s) as { date: string, periods: number[], notes?: string })
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 5)
              .map((session, idx) => (
                <div 
                  key={idx}
                  onClick={() => {
                    setAttendanceDate(session.date);
                    setSelectedPeriods(session.periods);
                    setLectureNote(session.notes || '');
                    setView('attendance');
                  }}
                  className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {session.periods.map(p => (
                        <div key={p} className={cn("w-2 h-2 rounded-full", periodColors[p])} />
                      ))}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{format(new Date(session.date), 'MMM dd, yyyy')}</p>
                      <p className="text-xs text-gray-500">Periods: {session.periods.join(', ')} {session.notes && `• ${session.notes}`}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-300" />
                </div>
              ))}
            {data.attendance.filter(r => r.courseId === selectedCourse.id).length === 0 && (
              <div className="text-center py-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100 text-xs text-gray-400">
                No attendance sessions recorded yet
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Enrolled Students</h3>
            <span className="text-sm text-gray-500">{courseStudents.length} Total</span>
          </div>
          <div className="space-y-3">
            {courseStudents.map(student => (
              <div 
                key={student.id} 
                onClick={() => {
                  setEditingStudent(student);
                  setShowEditStudent(true);
                }}
                className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between cursor-pointer active:scale-98 transition-transform"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold">
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold">{student.name}</p>
                    <p className="text-xs text-gray-500">{student.rollNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-indigo-600">{getStudentStats(student.id).percentage}%</p>
                    <p className="text-[10px] text-gray-400 uppercase">Attendance</p>
                  </div>
                  <MoreVertical size={18} className="text-gray-300" />
                </div>
              </div>
            ))}
            {courseStudents.length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                <Users className="mx-auto text-gray-300 mb-2" size={32} />
                <p className="text-gray-500">No students enrolled yet</p>
                <button 
                  onClick={() => setShowAddStudent(true)}
                  className="mt-2 text-indigo-600 font-medium"
                >
                  Add your first student
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    );
  };

  const renderAttendance = () => {
    if (!selectedCourse) return null;
    const courseStudents = data.students.filter(s => selectedCourse.studentIds.includes(s.id));
    
    return (
      <div className="space-y-6 pb-32">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('course-detail')} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-2xl font-bold">Attendance</h1>
          </div>
          <input 
            type="date" 
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
            className="bg-gray-100 border-none rounded-xl px-3 py-2 text-sm font-medium"
          />
        </header>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div>
            <h2 className="font-bold text-lg">{selectedCourse.name}</h2>
            <p className="text-xs text-gray-500 uppercase">{selectedCourse.code}</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Periods (1-8)</label>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(p => (
                <button
                  key={p}
                  onClick={() => {
                    setSelectedPeriods(prev => 
                      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p].sort()
                    );
                  }}
                  className={cn(
                    "w-10 h-10 rounded-xl font-bold transition-all flex items-center justify-center",
                    selectedPeriods.includes(p) 
                      ? `${periodColors[p]} text-white shadow-lg scale-110` 
                      : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Lecture Note / Details</label>
            <input 
              type="text"
              placeholder="e.g. Lab Session, Room 402, Extra Class..."
              className="w-full px-4 py-2 rounded-xl bg-gray-50 border-none text-sm focus:ring-2 focus:ring-indigo-500"
              value={lectureNote}
              onChange={(e) => setLectureNote(e.target.value)}
            />
          </div>

          {selectedPeriods.length > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
              <span className="text-xs font-bold text-gray-400 uppercase">Selected:</span>
              <div className="flex gap-1">
                {selectedPeriods.map(p => (
                  <div key={p} className={cn("w-3 h-3 rounded-full", periodColors[p])} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center px-1">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Student List</h3>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                const allPresent: Record<string, 'present' | 'absent'> = {};
                courseStudents.forEach(s => allPresent[s.id] = 'present');
                setSessionAttendance(allPresent);
              }}
              className="text-[10px] font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-1 rounded-lg"
            >
              Mark All Present
            </button>
            <div className="flex gap-4 text-xs font-bold">
              <span className="text-green-600">P: {Object.values(sessionAttendance).filter(s => s === 'present').length}</span>
              <span className="text-red-600">A: {Object.values(sessionAttendance).filter(s => s === 'absent').length}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {courseStudents.map(student => {
            const status = sessionAttendance[student.id];
            
            return (
              <div 
                key={student.id} 
                onClick={() => toggleAttendance(student.id)}
                className={cn(
                  "p-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer active:scale-[0.98]",
                  status === 'present' ? "bg-green-50 border-green-200" : 
                  status === 'absent' ? "bg-red-50 border-red-200" : 
                  "bg-white border-gray-100"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                    status === 'present' ? "bg-green-200 text-green-700" : 
                    status === 'absent' ? "bg-red-200 text-red-700" : 
                    "bg-gray-100 text-gray-500"
                  )}>
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{student.name}</p>
                    <p className="text-[10px] opacity-60 font-mono uppercase">{student.rollNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {status === 'present' ? (
                    <div className="bg-green-600 text-white p-1 rounded-lg">
                      <CheckCircle2 size={20} />
                    </div>
                  ) : status === 'absent' ? (
                    <div className="bg-red-600 text-white p-1 rounded-lg">
                      <XCircle size={20} />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-xl border-2 border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-300">
                      MARK
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="fixed bottom-24 left-0 right-0 px-6 z-30">
          <button 
            onClick={handleSaveAttendance}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-indigo-200 active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <CalendarCheck size={20} /> Save Daily Attendance
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F9FD] text-gray-900 font-sans pb-20">
      <Toaster position="top-center" />
      <div className="max-w-md mx-auto p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {view === 'splash' && (
              <div className="fixed inset-0 bg-indigo-600 flex flex-col items-center justify-center text-white z-[100]">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="flex flex-col items-center"
                >
                  <div className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center text-indigo-600 mb-6 shadow-2xl">
                    <CalendarCheck size={48} />
                  </div>
                  <h1 className="text-3xl font-black tracking-tighter">Mark my Attendance</h1>
                  <p className="mt-2 opacity-60 font-medium">Professional Tracking System</p>
                </motion.div>
                <div className="absolute bottom-12 flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">Loading Offline Data</p>
                </div>
              </div>
            )}

            {view === 'login' && (
              <div className="space-y-8 pt-12">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    {isSignup ? <User size={32} /> : <Lock size={32} />}
                  </div>
                  <h1 className="text-3xl font-bold">{isSignup ? 'Create Account' : 'Teacher Login'}</h1>
                  <p className="text-gray-500">
                    {isSignup ? 'Register to start managing your classes' : 'Enter your credentials to access the dashboard'}
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  {isSignup && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase ml-1">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                          type="text" 
                          required
                          className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-gray-100 shadow-sm focus:ring-2 focus:ring-indigo-500"
                          placeholder="Professor Name"
                          value={loginForm.name}
                          onChange={e => setLoginForm({...loginForm, name: e.target.value})}
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">Username / Email</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="text" 
                        required
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-gray-100 shadow-sm focus:ring-2 focus:ring-indigo-500"
                        placeholder="teacher@university.edu"
                        value={loginForm.username}
                        onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        required
                        className="w-full pl-12 pr-12 py-4 rounded-2xl bg-white border border-gray-100 shadow-sm focus:ring-2 focus:ring-indigo-500"
                        placeholder="••••••••"
                        value={loginForm.password}
                        onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100 active:scale-95 transition-transform"
                  >
                    {isSignup ? 'Register Account' : 'Access Dashboard'}
                  </button>
                </form>

                <div className="text-center">
                  <button 
                    onClick={() => setIsSignup(!isSignup)}
                    className="text-sm font-bold text-indigo-600"
                  >
                    {isSignup ? 'Already have an account? Login' : 'New teacher? Create an account'}
                  </button>
                </div>

                <div className="flex items-center gap-2 justify-center text-xs text-gray-400">
                  <WifiOff size={14} /> Individual data isolation enabled
                </div>
              </div>
            )}

            {view === 'dashboard' && renderDashboard()}
            {view === 'courses' && renderCourses()}
            {view === 'course-detail' && renderCourseDetail()}
            {view === 'attendance' && renderAttendance()}
            {view === 'students' && (
              <div className="space-y-6">
                <h1 className="text-2xl font-bold">All Students</h1>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search by name or roll number..." 
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-indigo-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  {data.students
                    .filter(s => 
                      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map(student => {
                      const stats = getStudentStats(student.id);
                      return (
                        <div 
                          key={student.id} 
                          onClick={() => {
                            setEditingStudent(student);
                            setShowEditStudent(true);
                            setConfirmDelete(null);
                          }}
                          className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between cursor-pointer active:scale-98 transition-transform"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                              {student.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold">{student.name}</p>
                              <p className="text-xs text-gray-500">{student.rollNumber}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                              <p className="text-xs font-bold text-indigo-600">{stats.percentage}%</p>
                              <p className="text-[10px] text-gray-400 uppercase">Attendance</p>
                            </div>
                            <ChevronRight size={18} className="text-gray-300" />
                          </div>
                        </div>
                      );
                    })}
                  {data.students.length === 0 && (
                    <div className="text-center py-12 text-gray-400">No students found.</div>
                  )}
                  {data.students.length > 0 && data.students.filter(s => 
                    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase())
                  ).length === 0 && (
                    <div className="text-center py-12 text-gray-400">No matching students found.</div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-40">
        <button 
          onClick={() => setView('dashboard')}
          className={cn("flex flex-col items-center gap-1", view === 'dashboard' ? "text-indigo-600" : "text-gray-400")}
        >
          <LayoutDashboard size={24} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Home</span>
        </button>
        <button 
          onClick={() => setView('courses')}
          className={cn("flex flex-col items-center gap-1", view === 'courses' || view === 'course-detail' || view === 'attendance' ? "text-indigo-600" : "text-gray-400")}
        >
          <BookOpen size={24} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Courses</span>
        </button>
        <button 
          onClick={() => setView('students')}
          className={cn("flex flex-col items-center gap-1", view === 'students' ? "text-indigo-600" : "text-gray-400")}
        >
          <Users size={24} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Students</span>
        </button>
      </nav>

      {/* Modals */}
      <AnimatePresence>
        {showAddCourse && (
          <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-md rounded-t-[40px] p-8 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Add New Course</h2>
                <button onClick={() => setShowAddCourse(false)} className="text-gray-400">
                  <XCircle size={24} />
                </button>
              </div>
              <form onSubmit={handleAddCourse} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Course Name</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Computer Science 101"
                    value={newCourse.name}
                    onChange={e => setNewCourse({...newCourse, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Course Code</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. CS101"
                    value={newCourse.code}
                    onChange={e => setNewCourse({...newCourse, code: e.target.value})}
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-200"
                >
                  Create Course
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {showAddStudent && (
          <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-md rounded-t-[40px] p-8 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Add New Student</h2>
                <button onClick={() => setShowAddStudent(false)} className="text-gray-400">
                  <XCircle size={24} />
                </button>
              </div>
              <form onSubmit={handleAddStudent} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Student Name</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Full Name"
                    value={newStudent.name}
                    onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Roll Number</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="ID Number"
                    value={newStudent.rollNumber}
                    onChange={e => setNewStudent({...newStudent, rollNumber: e.target.value})}
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-200"
                >
                  Add Student
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {showEditStudent && editingStudent && (
          <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-md rounded-t-[40px] p-8 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Student Details</h2>
                <button onClick={() => setShowEditStudent(false)} className="text-gray-400">
                  <XCircle size={24} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {(() => {
                  const stats = getStudentStats(editingStudent.id);
                  return (
                    <>
                      <div className="bg-indigo-50 p-3 rounded-2xl text-center">
                        <p className="text-[10px] text-indigo-400 font-bold uppercase">Total</p>
                        <p className="text-xl font-bold text-indigo-700">{stats.total}</p>
                      </div>
                      <div className="bg-green-50 p-3 rounded-2xl text-center">
                        <p className="text-[10px] text-green-400 font-bold uppercase">Present</p>
                        <p className="text-xl font-bold text-green-700">{stats.present}</p>
                      </div>
                      <div className="bg-red-50 p-3 rounded-2xl text-center">
                        <p className="text-[10px] text-red-400 font-bold uppercase">Absent</p>
                        <p className="text-xl font-bold text-red-700">{stats.absent}</p>
                      </div>
                    </>
                  );
                })()}
              </div>

              <form onSubmit={handleUpdateStudent} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Student Name</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Full Name"
                    value={editingStudent.name}
                    onChange={e => setEditingStudent({...editingStudent, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Roll Number</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="ID Number"
                    value={editingStudent.rollNumber}
                    onChange={e => setEditingStudent({...editingStudent, rollNumber: e.target.value})}
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <button 
                    type="submit"
                    className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-200"
                  >
                    Update Details
                  </button>
                  
                  {confirmDelete === editingStudent.id ? (
                    <div className="flex gap-2 animate-in fade-in slide-in-from-bottom-2">
                      <button 
                        type="button"
                        onClick={() => setConfirmDelete(null)}
                        className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-2xl font-bold"
                      >
                        Cancel
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleDeleteStudent(editingStudent.id)}
                        className="flex-1 bg-red-600 text-white py-3 rounded-2xl font-bold shadow-lg shadow-red-100"
                      >
                        Confirm Delete
                      </button>
                    </div>
                  ) : (
                    <button 
                      type="button"
                      onClick={() => setConfirmDelete(editingStudent.id)}
                      className="w-full bg-red-50 text-red-600 py-3 rounded-2xl font-bold border border-red-100 flex items-center justify-center gap-2"
                    >
                      <Trash2 size={18} /> Delete Student
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
