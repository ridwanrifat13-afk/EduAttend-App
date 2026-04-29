import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../App';
import { ClassSection, Student, StudentReport } from '../types';
import { Plus, Search, User, FileText, ChevronRight, X, AlertCircle, Send, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function StudentPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Modals
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportText, setReportText] = useState('');
  const [studentReports, setStudentReports] = useState<StudentReport[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<{ percentage: number; total: number } | null>(null);

  // Form
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentCode, setNewStudentCode] = useState('');
  const [newStudentRoll, setNewStudentRoll] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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

  const fetchStudents = async () => {
    if (!selectedClass || !user?.schoolId) return;
    setLoading(true);
    try {
      // 1. Fetch Students
      const q = query(
        collection(db, 'students'), 
        where('schoolId', '==', user.schoolId),
        where('classId', '==', selectedClass)
      );
      const snap = await getDocs(q);
      const studentsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
      
      // 2. Fetch Sessions for this class (to get total possible attendance)
      const sesQuery = query(
        collection(db, 'attendance_sessions'),
        where('schoolId', '==', user.schoolId),
        where('classId', '==', selectedClass)
      );
      const sesSnap = await getDocs(sesQuery);
      const totalSessions = sesSnap.docs.length;

      // 3. Fetch all records for this class to calculate individual percentages
      let recordsData: any[] = [];
      if (!sesSnap.empty) {
        const recQuery = query(
          collection(db, 'attendance_records'),
          where('schoolId', '==', user.schoolId),
          where('sessionId', 'in', sesSnap.docs.slice(-30).map(d => d.id)) // Last 30 sessions for performance
        );
        const recSnap = await getDocs(recQuery);
        recordsData = recSnap.docs.map(d => d.data());
      }

      // 4. Attach stats to student data
      const enrichedStudents = studentsData.map(s => {
        const studentRecords = recordsData.filter(r => r.studentId === s.id);
        const presentCount = studentRecords.filter(r => r.status === 'present').length;
        const lateCount = studentRecords.filter(r => r.status === 'late').length;
        
        // Use the count of session records we actually have for this student relative to recent sessions
        const studentSessionCount = new Set(studentRecords.map(r => r.sessionId)).size;
        
        const percentage = studentSessionCount > 0 
          ? ((presentCount + lateCount * 0.5) / studentSessionCount) * 100 
          : 0;

        return { ...s, percentage, totalSessions: studentSessionCount };
      });

      setStudents(enrichedStudents);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !user) {
      setFormError('Please select a class first. If no classes exist, create one in the Dashboard.');
      return;
    }
    
    setIsSaving(true);
    setFormError('');

    try {
      await addDoc(collection(db, 'students'), {
        schoolId: user.schoolId,
        classId: selectedClass,
        name: newStudentName.trim(),
        studentCode: newStudentCode.trim(),
        rollNumber: newStudentRoll.trim(),
        createdAt: serverTimestamp(),
        status: 'active'
      });
      
      setShowAddStudent(false);
      setNewStudentName('');
      setNewStudentCode('');
      setNewStudentRoll('');
      fetchStudents();
    } catch (err: any) {
      console.error("Error adding student:", err);
      setFormError(err.message || 'Failed to create student. Please check your permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  const viewStudentDetails = async (student: Student) => {
    setSelectedStudent(student); // Open immediately for better UX
    setAttendanceStats(null);
    setStudentReports([]);

    try {
      if (!user?.schoolId) return;

      // Calculate attendance % for this student - Filtered by schoolId for rule compliance
      const recordsQuery = query(
        collection(db, 'attendance_records'), 
        where('schoolId', '==', user.schoolId),
        where('studentId', '==', student.id)
      );
      const recordsSnap = await getDocs(recordsQuery);
      const recordsData = recordsSnap.docs.map(d => d.data());
      
      if (recordsData.length > 0) {
        const presentCount = recordsData.filter(r => r.status === 'present').length;
        const lateCount = recordsData.filter(r => r.status === 'late').length;
        const percentage = ((presentCount + lateCount * 0.5) / recordsData.length) * 100;
        setAttendanceStats({ percentage, total: recordsData.length });
      } else {
        setAttendanceStats({ percentage: 0, total: 0 });
      }

      // Fetch their reports
      const q = query(collection(db, 'reports'), where('studentId', '==', student.id));
      const snap = await getDocs(q);
      const reports = snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentReport));
      setStudentReports(reports);
    } catch (error) {
      console.error("Error loading student details:", error);
      // Even if stats fail, we still have the student object selected to show the basics
    }
  };

  const handleAddReport = async () => {
    if (!selectedStudent || !user || !reportText) return;
    
    await addDoc(collection(db, 'reports'), {
      schoolId: user.schoolId,
      studentId: selectedStudent.id,
      teacherId: user.uid,
      message: reportText,
      createdAt: serverTimestamp()
    });
    
    setReportText('');
    setShowReportModal(false);
    viewStudentDetails(selectedStudent); // refresh
  };

  const handleDeleteStudent = async () => {
    // 1. Initial guards
    if (!selectedStudent || !user?.schoolId || isSaving) return;
    
    // 2. State-based confirmation
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 3000); // Reset after 3 seconds
      return;
    }

    setIsSaving(true);
    const studentId = selectedStudent.id;
    const currentSchoolId = user.schoolId;

    try {
      // 3. Delete attendance records for this student
      const recordsQ = query(
        collection(db, 'attendance_records'),
        where('schoolId', '==', currentSchoolId),
        where('studentId', '==', studentId)
      );
      const recordsSnap = await getDocs(recordsQ);
      if (!recordsSnap.empty) {
        // Use individual deletes but don't strictly wait for all if they are too many
        // However, Promise.all is usually fine for moderate amounts
        await Promise.all(recordsSnap.docs.map(d => deleteDoc(doc(db, 'attendance_records', d.id))));
      }

      // 4. Delete teacher reports for this student
      const reportsQ = query(
        collection(db, 'reports'),
        where('schoolId', '==', currentSchoolId),
        where('studentId', '==', studentId)
      );
      const reportsSnap = await getDocs(reportsQ);
      if (!reportsSnap.empty) {
        await Promise.all(reportsSnap.docs.map(d => deleteDoc(doc(db, 'reports', d.id))));
      }

      // 5. Delete the main student profile - final step
      await deleteDoc(doc(db, 'students', studentId));
      
      // 6. Finalize UI immediately
      setStudents(prev => prev.filter(s => s.id !== studentId)); 
      setSelectedStudent(null);
      setDeleteConfirm(false);
      
      // We explicitly DO NOT reload here as it causes "buffering Trust" issues
      // The filter above handles the UI perfectly.
    } catch (error) {
      console.error("Critical Deletion Failure:", error);
      alert("Permission denied or error removing data. Ensure you have admin access.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.studentCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Student Management</h1>
          <p className="text-neutral-500 font-medium">Manage student profiles, attendance and discipline records</p>
        </div>
        <button 
          onClick={() => setShowAddStudent(true)}
          className="btn-primary flex items-center gap-2 self-start md:self-auto"
        >
          <Plus size={20} /> Add New Student
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col md:flex-row items-center gap-4">
        <div className="flex-1 w-full relative">
          <Search className="absolute right-4 top-3 text-brand-500" size={18} />
          <input 
            type="text" 
            placeholder="Search student by name or ID..." 
            className="input-field pr-11 py-2.5" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select 
          className="input-field py-2.5 text-sm w-full md:w-64"
          value={selectedClass || ''}
          onChange={(e) => setSelectedClass(e.target.value)}
        >
          {classes.map(c => <option key={c.id} value={c.id}>Class {c.className} - {c.section}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="h-40 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-brand-900 border-t-transparent rounded-full font-serif"></div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map(student => (
            <div 
              key={student.id} 
              onClick={() => viewStudentDetails(student)}
              className="glass-card p-6 flex items-start gap-4 hover:border-brand-900/30 transition-all cursor-pointer group"
            >
              <div className="w-14 h-14 bg-brand-200/50 rounded-2xl flex items-center justify-center text-brand-900 text-xl font-bold group-hover:bg-brand-900 group-hover:text-brand-50 transition-all">
                {student.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-brand-900 truncate tracking-tight">{student.name}</h3>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg ${(student.percentage || 0) >= 75 ? 'text-emerald-600 bg-emerald-50' : (student.percentage || 0) >= 50 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50'}`}>
                    {student.percentage !== undefined ? `${student.percentage.toFixed(0)}%` : '--%'}
                  </span>
                </div>
                <p className="text-xs font-bold text-brand-900/30 uppercase tracking-widest mt-1">Roll {student.rollNumber}</p>
                <div className="flex items-center gap-2 mt-4">
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-brand-200/40 rounded-md text-brand-900">{student.studentCode}</span>
                  <span className="w-1 h-1 bg-brand-200 rounded-full"></span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${student.status === 'active' ? 'bg-brand-500/10 text-brand-900' : 'bg-red-50 text-red-600'}`}>
                    {student.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <ChevronRight size={20} className="text-brand-200 group-hover:text-brand-900 transition-all mt-2" />
            </div>
          ))}
          {filteredStudents.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4">
              <User size={48} className="text-neutral-200 mx-auto" />
              <p className="text-neutral-400 font-medium italic">
                {searchQuery ? `No students matching "${searchQuery}"` : 'No students found in this class.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Add Student Modal */}
      {showAddStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-8 shadow-3xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold tracking-tight">Add Student</h2>
              <button onClick={() => setShowAddStudent(false)} className="p-2 hover:bg-neutral-50 rounded-full transition-colors"><X size={20} /></button>
            </div>
            
            {classes.length === 0 ? (
              <div className="space-y-6 text-center py-4">
                <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-500">
                  <AlertCircle size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">No Classes Found</h3>
                  <p className="text-neutral-500 text-sm mt-1">You must create at least one Class in the Dashboard before you can add students.</p>
                </div>
                <button 
                  onClick={() => setShowAddStudent(false)}
                  className="w-full btn-primary py-3"
                >
                  Go to Dashboard
                </button>
              </div>
            ) : (
              <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Full Name</label>
                <input type="text" required className="input-field" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Student ID</label>
                  <input type="text" required className="input-field" value={newStudentCode} onChange={(e) => setNewStudentCode(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Roll Number</label>
                  <input type="text" required className="input-field" value={newStudentRoll} onChange={(e) => setNewStudentRoll(e.target.value)} />
                </div>
              </div>
              {formError && <p className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-lg">{formError}</p>}
              <button 
                type="submit" 
                disabled={isSaving}
                className="w-full btn-primary py-3.5 mt-4 flex items-center justify-center gap-2"
              >
                {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Create Student Profile'}
              </button>
            </form>
          )}
        </div>
      </div>
    )}

      {/* Student Details Drawer/Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-end p-0 md:p-8 bg-neutral-900/40 backdrop-blur-sm overflow-hidden">
          <div className="bg-white w-full md:max-w-xl h-[85vh] md:h-full md:rounded-3xl shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-8 border-b border-neutral-100 relative">
              <button onClick={() => setSelectedStudent(null)} className="absolute right-6 top-6 p-2 text-neutral-400 hover:text-neutral-900"><X /></button>
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-neutral-900 rounded-3xl flex items-center justify-center text-white text-3xl font-bold">
                  {selectedStudent?.name?.charAt(0) || '?'}
                </div>
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">{selectedStudent?.name}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Roll No. {selectedStudent?.rollNumber}</span>
                    <span className="w-1 h-1 bg-neutral-300 rounded-full"></span>
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">ID: {selectedStudent?.studentCode}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-neutral-50 p-6 rounded-2xl">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Attendance</p>
                  <p className={`text-3xl font-bold ${attendanceStats ? (attendanceStats.percentage >= 75 ? 'text-emerald-600' : attendanceStats.percentage >= 50 ? 'text-amber-500' : 'text-red-500') : 'text-neutral-300'}`}>
                    {attendanceStats ? `${attendanceStats.percentage.toFixed(0)}%` : '--%'}
                  </p>
                  {attendanceStats && (
                    <p className="text-[10px] font-bold text-neutral-400 mt-1 uppercase tracking-tight">
                      From {attendanceStats.total} sessions
                    </p>
                  )}
                </div>
                <div className="bg-neutral-50 p-6 rounded-2xl">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Reports</p>
                  <p className="text-3xl font-bold text-neutral-900">{studentReports.length}</p>
                </div>
              </div>

              {/* Reports Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <FileText size={18} className="text-neutral-400" />
                    Teacher Reports
                  </h3>
                  <button 
                    onClick={() => setShowReportModal(true)}
                    className="text-sm font-bold text-neutral-900 bg-neutral-100 px-3 py-1.5 rounded-lg hover:bg-neutral-200 transition-colors"
                  >
                    + New Report
                  </button>
                </div>
                
                <div className="space-y-3">
                  {studentReports.map(report => (
                    <div key={report.id} className="p-4 border border-neutral-100 rounded-xl space-y-2">
                      <p className="text-sm text-neutral-800 leading-relaxed font-medium">{report.message}</p>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                        {report.createdAt ? format(report.createdAt.toDate(), 'MMM dd, yyyy • HH:mm') : 'Just now...'}
                      </p>
                    </div>
                  ))}
                  {studentReports.length === 0 && (
                    <div className="py-10 text-center border-2 border-dashed border-neutral-100 rounded-2xl">
                       <AlertCircle size={32} className="text-neutral-100 mx-auto mb-2" />
                       <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest">No reports filed yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Dangerous Area */}
              <div className="pt-10 border-t border-brand-200/20">
                <div className="flex items-center justify-between p-6 bg-red-50 rounded-2xl border border-red-100">
                  <div>
                    <h4 className="text-red-900 font-bold">Remove Student</h4>
                    <p className="text-xs text-red-700/60 font-medium">Permanently delete this student and all their data.</p>
                  </div>
                  <button 
                    onClick={handleDeleteStudent}
                    disabled={isSaving}
                    className={`p-3 rounded-xl transition-all shadow-lg flex items-center gap-2 ${
                      deleteConfirm 
                        ? 'bg-red-700 text-white ring-4 ring-red-100' 
                        : 'bg-red-600 text-white hover:bg-red-700 shadow-red-200'
                    } disabled:opacity-50`}
                  >
                    {deleteConfirm && <span className="text-xs font-bold px-1">Confirm?</span>}
                    {isSaving ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <Trash2 size={20} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Simple Report Pop Up */}
      {showReportModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-sm p-8 space-y-4">
             <h3 className="text-xl font-bold">Add Student Report</h3>
             <textarea 
               placeholder="Enter behavior or academic notes..." 
               className="input-field min-h-[120px] resize-none"
               value={reportText}
               onChange={(e) => setReportText(e.target.value)}
             />
             <div className="flex gap-3">
               <button onClick={() => setShowReportModal(false)} className="flex-1 btn-secondary py-3">Cancel</button>
               <button onClick={handleAddReport} className="flex-1 btn-primary py-3 flex items-center justify-center gap-2">
                 <Send size={16} /> Submit
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
