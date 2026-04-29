import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, query, where, getDocs, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../App';
import { ClassSection, Student, AttendanceRecord, AttendanceSession } from '../types';
import { Calendar as CalendarIcon, CheckCircle2, XCircle, Clock, Filter, Search, ChevronLeft, ChevronRight, History as HistoryIcon } from 'lucide-react';
import { format, startOfDay, endOfDay, addDays, subDays } from 'date-fns';

export default function HistoryPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [students, setStudents] = useState<Student[]>([]);
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.schoolId) {
      fetchClasses();
    }
  }, [user]);

  useEffect(() => {
    let unsubscribeStudents: () => void;
    let unsubscribeSession: () => void;
    let unsubscribeRecords: () => void;

    const setupListeners = async () => {
      if (!selectedClass || !user?.schoolId) return;
      setLoading(true);
      
      try {
        // 1. Listen to students
        const sQuery = query(
          collection(db, 'students'), 
          where('schoolId', '==', user.schoolId),
          where('classId', '==', selectedClass)
        );
        unsubscribeStudents = onSnapshot(sQuery, (sSnap) => {
          const studentsData = sSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
          setStudents(studentsData);
        }, (error) => {
          console.error("Students snapshot error:", error);
        });

        // 2. Listen to session for this date
        const sesQuery = query(
          collection(db, 'attendance_sessions'),
          where('schoolId', '==', user.schoolId),
          where('classId', '==', selectedClass),
          where('date', '==', selectedDate)
        );
        
        unsubscribeSession = onSnapshot(sesQuery, (sesSnap) => {
          if (!sesSnap.empty) {
            const sessions = sesSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceSession));
            sessions.sort((a, b) => {
              const aTime = a.createdAt?.toMillis?.() || 0;
              const bTime = b.createdAt?.toMillis?.() || 0;
              return bTime - aTime;
            });
            
            const latestSession = sessions[0];
            setSession(latestSession);

            // 3. Listen to records for this session
            if (unsubscribeRecords) unsubscribeRecords();
            const recQuery = query(
              collection(db, 'attendance_records'), 
              where('schoolId', '==', user.schoolId),
              where('sessionId', '==', latestSession.id)
            );
            unsubscribeRecords = onSnapshot(recQuery, (recSnap) => {
              const recordsData = recSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
              setRecords(recordsData);
              setLoading(false); // Stop loading once records are fetched
            }, (error) => {
              console.error("Records snapshot error:", error);
            });
          } else {
            setSession(null);
            setRecords([]);
            if (unsubscribeRecords) unsubscribeRecords();
            setLoading(false);
          }
        }, (error) => {
          console.error("Session snapshot error:", error);
          setLoading(false);
        });
        
      } catch (e) {
        console.error("Error setting up listeners:", e);
        setLoading(false);
      }
    };

    setupListeners();

    return () => {
      if (unsubscribeStudents) unsubscribeStudents();
      if (unsubscribeSession) unsubscribeSession();
      if (unsubscribeRecords) unsubscribeRecords();
    };
  }, [selectedClass, selectedDate, user?.schoolId]);

  const fetchClasses = async () => {
    if (!user?.schoolId) return;
    const q = query(
      collection(db, 'classes'),
      where('schoolId', '==', user.schoolId)
    );
    const snap = await getDocs(q);
    const classesData = snap.docs.map(d => ({ id: d.id, ...d.data() } as ClassSection));
    setClasses(classesData);
    
    // Check for passed state from AttendancePage
    const stateClassId = location.state?.classId;
    if (stateClassId && classesData.some(c => c.id === stateClassId)) {
      setSelectedClass(stateClassId);
    } else if (classesData.length > 0) {
      setSelectedClass(classesData[0].id);
    } else {
      setLoading(false);
    }
  };

  const changeDate = (days: number) => {
    // Correctly parse localized date to avoid UTC shifting issues
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const newDate = addDays(date, days);
    setSelectedDate(format(newDate, 'yyyy-MM-dd'));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1 flex items-center gap-3">
             <HistoryIcon size={24} className="text-brand-500" /> Attendance History
          </h1>
          <p className="text-brand-900/50 font-medium">Review past records and student performance logs</p>
        </div>
      </div>

      {/* Controls */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass-card p-2 flex items-center">
          <button onClick={() => changeDate(-1)} className="p-3 hover:bg-neutral-100 rounded-xl transition-colors"><ChevronLeft size={20}/></button>
          <div className="flex-1 flex items-center justify-center gap-3">
            <CalendarIcon size={18} className="text-neutral-400" />
            <input 
              type="date" 
              className="bg-transparent border-none outline-none font-bold text-neutral-900 cursor-pointer"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <button onClick={() => changeDate(1)} className="p-3 hover:bg-neutral-100 rounded-xl transition-colors"><ChevronRight size={20}/></button>
        </div>
        <div className="glass-card p-2 flex items-center relative">
          <Filter size={18} className="absolute left-6 text-neutral-400" />
          <select 
            className="w-full bg-transparent border-none outline-none font-bold text-neutral-900 pl-12 pr-4 py-3 appearance-none cursor-pointer"
            value={selectedClass || ''}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            {classes.map(c => <option key={c.id} value={c.id}>Class {c.className} - {c.section}</option>)}
          </select>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="h-[40vh] flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-brand-900 border-t-transparent rounded-full font-serif"></div>
        </div>
      ) : !session ? (
        <div className="glass-card p-20 text-center space-y-4">
          <div className="w-16 h-16 bg-brand-200/50 rounded-2xl flex items-center justify-center mx-auto text-brand-900/30">
            <CalendarIcon size={32} />
          </div>
          <div>
            <h3 className="text-lg font-bold">No Records Found</h3>
            <p className="text-brand-900/50 font-medium max-w-sm mx-auto mt-1">Attendance for this class on {format(new Date(selectedDate), 'MMMM dd, yyyy')} was not logged.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Banner */}
          <div className="rounded-3xl p-6 bg-brand-900 text-brand-50 flex flex-wrap gap-8 items-center justify-center md:justify-start shadow-xl shadow-brand-900/20">
             <div>
               <p className="text-[10px] font-bold text-brand-50/90 uppercase tracking-widest mb-1">Total Strength</p>
               <p className="text-2xl font-bold tracking-tight">{students.length}</p>
             </div>
             <div className="w-px h-10 bg-white/10 hidden sm:block"></div>
             <div>
               <p className="text-[10px] font-bold text-brand-50/90 uppercase tracking-widest mb-1">Present</p>
               <p className="text-2xl font-bold tracking-tight text-brand-500">{records.filter(r => r.status === 'present').length}</p>
             </div>
             <div>
               <p className="text-[10px] font-bold text-brand-50/90 uppercase tracking-widest mb-1">Absent</p>
               <p className="text-2xl font-bold tracking-tight text-red-300">{records.filter(r => r.status === 'absent').length}</p>
             </div>
             <div>
               <p className="text-[10px] font-bold text-brand-50/90 uppercase tracking-widest mb-1">Late</p>
               <p className="text-2xl font-bold tracking-tight text-brand-200">{records.filter(r => r.status === 'late').length}</p>
             </div>
             <div className="ml-auto hidden lg:block">
                <span className="px-4 py-2 bg-white/10 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                   <Clock size={14} /> Session Locked
                </span>
             </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass-card overflow-hidden">
               <div className="px-6 py-4 bg-brand-500/10 border-b border-brand-200/50 flex items-center gap-2 text-brand-900 font-bold uppercase tracking-widest text-[10px]">
                 <CheckCircle2 size={16} className="text-brand-900" /> Present Students
               </div>
               <div className="p-4 space-y-2">
                 {records.filter(r => r.status === 'present').map(r => {
                   const s = students.find(st => st.id === r.studentId);
                   return (
                     <div key={r.id} className="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-brand-900/5">
                        <span className="font-semibold text-brand-900">{s?.name}</span>
                        <span className="text-[10px] font-bold text-brand-900/30 italic">#{s?.rollNumber}</span>
                     </div>
                   );
                 })}
                 {records.filter(r => r.status === 'present').length === 0 && <p className="text-center py-6 text-brand-900/20 font-bold uppercase tracking-widest text-[10px] italic">No students present</p>}
               </div>
            </div>

            <div className="glass-card overflow-hidden">
               <div className="px-6 py-4 bg-red-50/50 border-b border-red-100/50 flex items-center gap-2 text-red-700 font-bold uppercase tracking-widest text-[10px]">
                 <XCircle size={16} className="text-red-700" /> Absent Students
               </div>
               <div className="p-4 space-y-2">
                 {records.filter(r => r.status === 'absent').map(r => {
                   const s = students.find(st => st.id === r.studentId);
                   return (
                     <div key={r.id} className="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-brand-900/5">
                        <span className="font-semibold text-brand-900">{s?.name}</span>
                        <span className="text-[10px] font-bold text-brand-900/30 italic">#{s?.rollNumber}</span>
                     </div>
                   );
                 })}
                 {records.filter(r => r.status === 'absent').length === 0 && <p className="text-center py-6 text-brand-900/20 font-bold uppercase tracking-widest text-[10px] italic">No students absent</p>}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
