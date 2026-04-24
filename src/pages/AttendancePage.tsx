import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, serverTimestamp, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../App';
import { ClassSection, Student, AttendanceStatus } from '../types';
import { UserCheck, CheckCircle2, XCircle, Clock, AlertCircle, Save } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export default function AttendancePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const selectRef = React.useRef<HTMLSelectElement>(null);
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const [alreadyTaken, setAlreadyTaken] = useState(false);

  useEffect(() => {
    if (user?.schoolId) {
      fetchClasses();
    }
  }, [user]);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
    }
  }, [selectedClass]);

  const fetchClasses = async () => {
    if (!user?.schoolId) return;
    try {
      const q = query(
        collection(db, 'classes'),
        where('schoolId', '==', user.schoolId)
      );
      const snap = await getDocs(q);
      const classesData = snap.docs.map(d => ({ id: d.id, ...d.data() } as ClassSection));
      setClasses(classesData);
      if (classesData.length > 0) {
        setSelectedClass(classesData[0].id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
      setLoading(false);
    }
  };

  const fetchStudents = async (force: boolean = false) => {
    if (!selectedClass || !user?.schoolId) return;
    setLoading(true);
    if (!force) setAlreadyTaken(false);
    
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      if (!force) {
        // 1. Check if session already exists for today
        const sessionQuery = query(
          collection(db, 'attendance_sessions'),
          where('schoolId', '==', user.schoolId),
          where('classId', '==', selectedClass),
          where('date', '==', today)
        );
        const sessionSnap = await getDocs(sessionQuery);
        
        if (!sessionSnap.empty) {
          setAlreadyTaken(true);
          setLoading(false);
          return;
        }
      }

      // 2. Fetch students
      const q = query(
        collection(db, 'students'), 
        where('schoolId', '==', user.schoolId),
        where('classId', '==', selectedClass)
      );
      const snap = await getDocs(q);
      const studentsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
      setStudents(studentsData);
      
      // Default all to present
      const initialAttendance: Record<string, AttendanceStatus> = {};
      studentsData.forEach(s => initialAttendance[s.id] = 'present');
      setAttendance(initialAttendance);
      if (force) {
        setAlreadyTaken(false);
        setDone(false);
      }
    } catch (e) {
      console.error("Error fetching students:", e);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleDone = async () => {
    if (!selectedClass || !user) return;
    setSaving(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      // Find and delete any existing session for this class/day to ensure only the last one is saved
      const sessionQuery = query(
        collection(db, 'attendance_sessions'),
        where('schoolId', '==', user.schoolId),
        where('classId', '==', selectedClass),
        where('date', '==', today)
      );
      const sessionSnap = await getDocs(sessionQuery);
      
      if (!sessionSnap.empty) {
        for (const sessionDoc of sessionSnap.docs) {
          // Delete associated records first
          const recordsQuery = query(
            collection(db, 'attendance_records'), 
            where('schoolId', '==', user.schoolId),
            where('sessionId', '==', sessionDoc.id)
          );
          const recordsSnap = await getDocs(recordsQuery);
          const deleteRecordPromises = recordsSnap.docs.map(rd => deleteDoc(doc(db, 'attendance_records', rd.id)));
          await Promise.all(deleteRecordPromises);
          
          // Delete the session itself
          await deleteDoc(doc(db, 'attendance_sessions', sessionDoc.id));
        }
      }
      
      const counts = {
        present: Object.values(attendance).filter(v => v === 'present').length,
        absent: Object.values(attendance).filter(v => v === 'absent').length,
        late: Object.values(attendance).filter(v => v === 'late').length,
        total: students.length
      };

      // Create session with counts
      const sessionRef = await addDoc(collection(db, 'attendance_sessions'), {
        schoolId: user.schoolId,
        classId: selectedClass,
        date: today,
        teacherId: user.uid,
        createdAt: serverTimestamp(),
        locked: true,
        ...counts
      });

      // Create records
      const recordPromises = students.map(student => {
        const recordRef = doc(collection(db, 'attendance_records'));
        return setDoc(recordRef, {
          sessionId: sessionRef.id,
          studentId: student.id,
          status: attendance[student.id],
          schoolId: user.schoolId,
          markedAt: serverTimestamp()
        });
      });

      await Promise.all(recordPromises);
      setDone(true);
    } catch (e) {
      console.error(e);
      alert('Error saving attendance. Please try again.');
    }
    setSaving(false);
  };

  const handleTakeAnother = () => {
    setDone(false);
    setAlreadyTaken(false);
    setTimeout(() => {
      selectRef.current?.focus();
    }, 100);
  };
  if (loading) return (
    <div className="h-[60vh] flex items-center justify-center bg-brand-50">
      <div className="animate-spin w-8 h-8 border-4 border-brand-900 border-t-transparent rounded-full font-serif"></div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Manual Attendance</h1>
          <p className="text-neutral-500 font-medium">Session for {format(new Date(), 'EEEE, MMMM dd')}</p>
        </div>
        <select 
          ref={selectRef}
          className="input-field py-2 text-sm max-w-[200px]"
          value={selectedClass || ''}
          onChange={(e) => setSelectedClass(e.target.value)}
          disabled={saving}
        >
          {classes.map(c => <option key={c.id} value={c.id}>Class {c.className} - {c.section}</option>)}
        </select>
      </div>

      <AnimatePresence mode="wait">
        {done || alreadyTaken ? (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.4, type: "spring", bounce: 0.4 }}
            className="glass-card p-12 text-center space-y-4 shadow-2xl shadow-brand-900/5 border-none bg-white/70"
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
              className={`w-28 h-28 ${done ? 'bg-brand-900 text-brand-50' : 'bg-brand-100/50 text-brand-900'} rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl ${done ? 'shadow-brand-900/40 rotate-3' : '-rotate-3 shadow-brand-900/10'} transition-transform duration-500`}
            >
              <motion.div
                initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 20 }}
              >
                {done ? <CheckCircle2 size={56} strokeWidth={2.5} /> : <AlertCircle size={56} strokeWidth={2.5} />}
              </motion.div>
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl font-bold tracking-tight text-neutral-900"
            >
              {done ? 'Attendance Logged!' : 'Already Logged'}
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-neutral-500 max-w-sm mx-auto text-lg leading-relaxed"
            >
              {done 
                ? `Today's session for class ${classes.find(c => c.id === selectedClass)?.className} has been successfully recorded.`
                : `You have already taken attendance for class ${classes.find(c => c.id === selectedClass)?.className} today.`}
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="pt-8 space-x-0 space-y-3 sm:space-y-0 sm:space-x-4 flex flex-col sm:flex-row justify-center max-w-md mx-auto"
            >
              <button 
                onClick={() => alreadyTaken ? fetchStudents(true) : handleTakeAnother()} 
                className="btn-primary w-full sm:w-auto px-8 py-3.5 shadow-xl shadow-brand-900/10 hover:-translate-y-1"
              >
                {alreadyTaken ? 'Take Another Session' : 'Take Another Class'}
              </button>
              <button 
                onClick={() => navigate('/history', { state: { classId: selectedClass } })} 
                className="btn-secondary w-full sm:w-auto px-8 py-3.5 bg-white border border-brand-200 shadow-sm hover:bg-brand-50 hover:-translate-y-1 transition-all"
              >
                View History
              </button>
            </motion.div>
          </motion.div>
        ) : students.length > 0 ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="glass-card overflow-hidden">
              <div className="grid grid-cols-12 px-6 py-4 bg-brand-900 text-brand-50 font-bold text-xs uppercase tracking-widest hidden md:grid">
                <div className="col-span-1">Roll</div>
                <div className="col-span-1">ID</div>
                <div className="col-span-5">Student Name</div>
                <div className="col-span-5 text-center">Mark Attendance</div>
              </div>
              
              <div className="divide-y divide-brand-200/30">
                {students.map((student) => (
                  <div key={student.id} className="grid grid-cols-1 md:grid-cols-12 px-4 md:px-6 py-5 items-center gap-4 hover:bg-brand-500/5 transition-colors">
                    <div className="md:col-span-1 font-bold text-brand-900/30 font-mono text-sm">#{student.rollNumber}</div>
                    <div className="md:col-span-1">
                      <span className="text-[10px] font-bold bg-brand-200/40 text-brand-900 px-2 py-0.5 rounded-md uppercase tracking-tight">
                        {student.studentCode}
                      </span>
                    </div>
                    <div className="md:col-span-5 font-semibold text-neutral-800 text-lg md:text-base">{student.name}</div>
                    <div className="md:col-span-5 flex justify-center gap-2 lg:gap-4">
                      <button
                        onClick={() => updateStatus(student.id, 'present')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all border ${attendance[student.id] === 'present' ? 'bg-brand-900 text-brand-50 border-brand-900 shadow-md shadow-brand-900/20' : 'bg-white text-brand-900/30 border-brand-200'}`}
                      >
                        <CheckCircle2 size={16} /> <span className="hidden sm:inline">Present</span>
                      </button>
                      <button
                        onClick={() => updateStatus(student.id, 'late')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all border ${attendance[student.id] === 'late' ? 'bg-brand-500 text-brand-900 border-brand-500 shadow-md shadow-brand-500/20' : 'bg-white text-brand-900/30 border-brand-200'}`}
                      >
                        <Clock size={16} /> <span className="hidden sm:inline">Late</span>
                      </button>
                      <button
                        onClick={() => updateStatus(student.id, 'absent')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all border ${attendance[student.id] === 'absent' ? 'bg-red-700 text-white border-red-700 shadow-md shadow-red-700/20' : 'bg-white text-brand-900/30 border-brand-200'}`}
                      >
                        <XCircle size={16} /> <span className="hidden sm:inline">Absent</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
  
            <div className="flex flex-col sm:flex-row items-center justify-between p-6 glass-card bg-brand-900 border-none shadow-xl shadow-brand-900/20 gap-6">
              <div className="text-brand-50 text-center sm:text-left">
                <p className="text-[10px] font-bold text-brand-50/40 uppercase tracking-widest mb-1">Session Summary</p>
                <div className="flex gap-4">
                  <span className="text-sm font-bold text-brand-500">{Object.values(attendance).filter(v => v === 'present').length} Present</span>
                  <span className="text-sm font-bold text-brand-200">{Object.values(attendance).filter(v => v === 'late').length} Late</span>
                  <span className="text-sm font-bold text-red-300">{Object.values(attendance).filter(v => v === 'absent').length} Absent</span>
                </div>
              </div>
              <button
                onClick={handleDone}
                disabled={saving}
                className="w-full sm:w-auto px-8 py-3.5 bg-brand-50 text-brand-900 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-brand-200 transition-all disabled:opacity-50"
              >
                {saving ? <div className="w-5 h-5 border-2 border-brand-900/30 border-t-brand-900 rounded-full animate-spin"></div> : <Save size={18} />}
                {saving ? `Saving...` : `Submit Attendance`}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="glass-card p-20 text-center space-y-4"
          >
            <AlertCircle size={48} className="text-neutral-300 mx-auto" />
            <p className="text-neutral-400 font-medium italic">No students found in this class.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
