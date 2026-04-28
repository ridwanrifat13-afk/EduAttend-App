import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../App';
import { ClassSection, Student, AttendanceRecord, AttendanceSession } from '../types';
import { initializePaddle, Paddle } from '@paddle/paddle-js';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { School, Users, GraduationCap, Calendar, BarChart3, Clock, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { startOfMonth, endOfMonth, format, subDays, eachDayOfInterval, startOfWeek } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AdminDashboard() {
  const { user } = useAuth();
  const [schoolData, setSchoolData] = useState<any>(null);
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [pivotDate, setPivotDate] = useState(new Date());

  // Modal State
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newSection, setNewSection] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [paddle, setPaddle] = useState<Paddle>();

  useEffect(() => {
    // Initialize Paddle Billing
    const paddleClientToken = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
    const paddleEnv = import.meta.env.VITE_PADDLE_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'production';
    
    if (paddleClientToken) {
      initializePaddle({
        environment: paddleEnv,
        token: paddleClientToken,
        eventCallback: async function(data) {
          if (data.name === "checkout.error") {
             console.error("Paddle Checkout Error:", data);
             alert("Paddle Checkout Error (Check console for details). Make sure your Domain is approved in Paddle Dashboard, your Price ID is correct, and your Token is valid for " + paddleEnv + ".");
          } else if (data.name === "checkout.completed" && user?.schoolId) {
             console.log("Checkout complete. Waiting for webhook...");
             alert("Payment successful! Upgrading to Pro... Please wait.");
             setTimeout(() => {
                window.location.reload();
             }, 3000);
          }
        }
      }).then((paddleInstance) => {
        if (paddleInstance) {
          setPaddle(paddleInstance);
        }
      });
    }
  }, [user?.schoolId]);

  const handleUpgrade = () => {
    const priceId = import.meta.env.VITE_PADDLE_PRICE_ID;
    
    if (paddle && priceId) {
      // Real Paddle Checkout
      paddle.Checkout.open({
        items: [{ priceId: priceId, quantity: 1 }],
        customData: {
          schoolId: user?.schoolId
        }
      });
    } else {
      // Simulation
      alert('Simulated Checkout in Dashboard! Set environment variables for real payment.');
      if (user?.schoolId) {
         updateDoc(doc(db, 'schools', user.schoolId), { plan: 'pro' }).then(() => {
           window.location.reload();
         });
      }
    }
  };

  const handlePeriodChange = (direction: 'prev' | 'next') => {
    const newDate = new Date(pivotDate);
    if (timeRange === 'weekly') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else if (timeRange === 'monthly') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else {
      newDate.setFullYear(newDate.getFullYear() + (direction === 'next' ? 1 : -1));
    }
    setPivotDate(newDate);
  };

  useEffect(() => {
    if (user?.schoolId) {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
    if (!user?.schoolId) return;
    setLoading(true);
    try {
      const schoolSnap = await getDocs(query(collection(db, 'schools'), where('adminId', '==', user?.uid)));
      if (!schoolSnap.empty) setSchoolData(schoolSnap.docs[0].data());

      const cSnap = await getDocs(query(collection(db, 'classes'), where('schoolId', '==', user.schoolId)));
      const classesData = cSnap.docs.map(d => ({ id: d.id, ...d.data() } as ClassSection));
      setClasses(classesData);

      const sSnap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', user.schoolId)));
      const studentsData = sSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
      setStudents(studentsData);

      const sesSnap = await getDocs(query(collection(db, 'attendance_sessions'), where('schoolId', '==', user.schoolId)));
      const sessionsData = sesSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceSession));
      setSessions(sessionsData);

      if (sessionsData.length > 0) {
        // Fetch recent records - limited to 100 for dashboard overview to avoid 'in' query limits
        const targetSessionIds = sessionsData.slice(-30).map(s => s.id);
        if (targetSessionIds.length > 0) {
          const recSnap = await getDocs(query(
            collection(db, 'attendance_records'), 
            where('schoolId', '==', user.schoolId),
            where('sessionId', 'in', targetSessionIds)
          ));
          const recordsData = recSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
          setRecords(recordsData);
        }
      }
    } catch (e) {
      console.error("Admin dashboard fetch error:", e);
    }
    setLoading(false);
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.schoolId || !newClassName || !newSection) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'classes'), {
        schoolId: user.schoolId,
        className: newClassName,
        section: newSection,
        teacherId: user.uid, // Admin acts as teacher by default or can reassign
        createdAt: serverTimestamp()
      });
      setIsAddClassOpen(false);
      setNewClassName('');
      setNewSection('');
      fetchAllData();
    } catch (error) {
      console.error("Error adding class:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const getOverallStats = () => {
    const totalStudents = students.length;
    const totalClasses = classes.length;
    const avgAttendance = sessions.length > 0 ? (records.filter(r => r.status === 'present').length / (records.length || 1)) * 100 : 0;
    
    return [
      { label: 'Total Students', value: totalStudents, icon: Users, color: 'text-brand-900', bg: 'bg-brand-200/30' },
      { label: 'Classes', value: totalClasses, icon: GraduationCap, color: 'text-brand-900', bg: 'bg-brand-200/30' },
      { label: 'Avg. Attendance', value: `${avgAttendance.toFixed(1)}%`, icon: BarChart3, color: 'text-brand-900', bg: 'bg-brand-200/30' },
      { label: 'Total Sessions', value: sessions.length, icon: Calendar, color: 'text-brand-900', bg: 'bg-brand-200/30' }
    ];
  };

  const getClassAttendanceData = () => {
    const dayLimit = timeRange === 'weekly' ? 7 : timeRange === 'monthly' ? 30 : 365;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - dayLimit);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const filteredSessions = sessions.filter(s => s.date >= cutoffStr);

    const labels = classes.map(c => `${c.className}-${c.section}`);
    const data = classes.map(c => {
      const classSessions = filteredSessions.filter(s => s.classId === c.id);
      if (classSessions.length === 0) return 0;
      
      let total = 0;
      let attended = 0;

      classSessions.forEach(s => {
        if (s.total !== undefined) {
          total += s.total;
          attended += (s.present || 0) + (s.late || 0) * 0.5;
        } else {
          const classRecords = records.filter(r => classSessions.some(sn => sn.id === r.sessionId));
          total += classRecords.length;
          attended += classRecords.filter(r => r.status === 'present' || r.status === 'late').length;
        }
      });

      return total > 0 ? (attended / total) * 100 : 0;
    });

    return {
      labels,
      datasets: [{
        label: 'Attendance %',
        data,
        backgroundColor: '#3D4E28',
        borderRadius: 12,
      }]
    };
  };

  const getTrendData = () => {
    let labels: string[] = [];
    let percentages: number[] = [];

    if (timeRange === 'yearly') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthGroups: Record<string, { total: number; attended: number }> = {};
      months.forEach(m => monthGroups[m] = { total: 0, attended: 0 });

      const pivotYear = pivotDate.getFullYear();

      sessions.forEach(s => {
        const date = new Date(s.date);
        if (date.getFullYear() !== pivotYear) return;

        const monthLabel = months[date.getMonth()];
        if (s.total !== undefined) {
          monthGroups[monthLabel].total += s.total;
          monthGroups[monthLabel].attended += (s.present || 0) + (s.late || 0) * 0.5;
        }
      });

      labels = months.map(m => `${m} ${pivotYear}`);
      percentages = months.map(m => monthGroups[m].total > 0 ? (monthGroups[m].attended / monthGroups[m].total) * 100 : 0);
    } else {
      // Weekly or Monthly - Show ALL dates in range relative to pivotDate
      const end = timeRange === 'monthly' ? endOfMonth(pivotDate) : pivotDate;
      const start = timeRange === 'weekly' ? subDays(end, 6) : startOfMonth(pivotDate);
      const interval = eachDayOfInterval({ start, end });

      labels = interval.map(date => format(date, timeRange === 'weekly' ? 'EEE (dd/MM)' : 'dd'));
      percentages = interval.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        // Sum all class sessions for that date
        const daySessions = sessions.filter(s => s.date === dateStr);
        if (daySessions.length === 0) return 0;
        
        let total = 0;
        let attended = 0;
        daySessions.forEach(s => {
          if (s.total !== undefined) {
            total += s.total;
            attended += (s.present || 0) + (s.late || 0) * 0.5;
          }
        });
        return total > 0 ? (attended / total) * 100 : 0;
      });
    }

    return {
      labels,
      datasets: [{
        label: `${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} Trend %`,
        data: percentages,
        borderColor: '#3D4E28',
        backgroundColor: 'rgba(175, 188, 136, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: timeRange === 'yearly' ? 6 : 4,
        pointBackgroundColor: '#3D4E28',
      }]
    };
  };

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-neutral-900 border-t-transparent rounded-full"></div>
    </div>
  );

  return (
    <div className="space-y-10">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-neutral-500 mb-2 font-bold uppercase tracking-widest text-xs">
            <School size={14} /> Admin Dashboard
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tight">{schoolData?.name || 'School Overview'}</h1>
            {schoolData?.plan === 'pro' ? (
              <span className="px-2 py-1 bg-brand-900 text-brand-50 text-[10px] font-bold uppercase tracking-widest rounded shadow-sm">Pro Plan</span>
            ) : (
              <button 
                onClick={handleUpgrade}
                className="px-3 py-1 bg-gradient-to-r from-amber-400 to-amber-500 text-white text-xs font-bold uppercase tracking-widest rounded shadow-sm hover:shadow-md transition-all flex items-center gap-1"
              >
                Upgrade to Pro
              </button>
            )}
          </div>
          <p className="text-neutral-500 font-medium mt-1">School Code: <span className="text-neutral-900 font-bold">{schoolData?.code}</span></p>
        </div>
        <div className="flex bg-white px-4 py-2 rounded-2xl shadow-sm border border-neutral-200 divide-x divide-neutral-100">
          <div className="pr-4 py-1">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Status</p>
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Active
            </span>
          </div>
          <div className="pl-4 py-1">
             <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Last Sync</p>
             <span className="text-xs font-bold text-neutral-800">{format(new Date(), 'HH:mm')}</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {getOverallStats().map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="glass-card p-6 flex flex-col justify-between h-40 group hover:bg-neutral-900 hover:text-white transition-all cursor-default">
              <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center ${stat.color} group-hover:bg-white/10 group-hover:text-white transition-colors`}>
                <Icon size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1 group-hover:text-neutral-400 transition-colors">{stat.label}</p>
                <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card p-8 shadow-xl shadow-neutral-200/40">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-bold text-lg">Class-wise Comparison</h3>
              <p className="text-xs text-neutral-500 font-medium tracking-tight">Average performance ({timeRange})</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-neutral-100 p-1 rounded-xl flex gap-1">
                {(['weekly', 'monthly', 'yearly'] as const).map(range => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${timeRange === range ? 'bg-white shadow-sm text-neutral-900 border border-neutral-100' : 'text-neutral-400 hover:text-neutral-600'}`}
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="h-[250px]">
             {classes.length > 0 ? (
               <Bar 
                 data={getClassAttendanceData()} 
                 options={{ 
                   responsive: true, 
                   maintainAspectRatio: false,
                   plugins: { legend: { display: false } },
                   scales: { 
                     y: { min: 0, max: 100, grid: { color: '#E6DAB9' } },
                     x: { grid: { display: false } }
                   }
                 }} 
               />
             ) : (
               <div className="h-full flex items-center justify-center text-neutral-400 italic">No classes registered yet</div>
             )}
          </div>
        </div>

        <div className="glass-card p-8 shadow-xl shadow-neutral-200/40">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-bold text-lg">School Trend</h3>
              <p className="text-xs text-neutral-500 font-medium tracking-tight">
                {timeRange === 'weekly' 
                  ? `Trend for week ending ${format(pivotDate, 'MMM dd, yyyy')}` 
                  : timeRange === 'monthly' 
                    ? `Trend for ${format(pivotDate, 'MMMM yyyy')}` 
                    : `Yearly performance ${pivotDate.getFullYear()}`}
              </p>
            </div>
            <div className="flex gap-1">
              <button 
                onClick={() => handlePeriodChange('prev')}
                className="p-2 hover:bg-brand-500/10 rounded-lg text-brand-900 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={() => handlePeriodChange('next')}
                className="p-2 hover:bg-brand-500/10 rounded-lg text-brand-900 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
          <div className="h-[250px]">
            <Line 
              data={getTrendData()}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { min: 0, max: 100, grid: { color: '#E6DAB9' } },
                  x: { grid: { display: false } }
                }
              }}
            />
          </div>
        </div>
      </div>

        <div className="glass-card p-8 overflow-hidden bg-neutral-900 text-white">
          <h3 className="font-bold text-lg mb-6">Recent Activity</h3>
          <div className="space-y-6">
            {sessions.slice(-5).reverse().map((session, idx) => {
              const cls = classes.find(c => c.id === session.classId);
              return (
                <div key={idx} className="flex gap-4 group">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 bg-neutral-700 rounded-full border-2 border-white/20 group-hover:bg-white transition-colors"></div>
                    {idx !== 4 && <div className="w-px flex-1 bg-neutral-800"></div>}
                  </div>
                  <div>
                    <p className="text-sm font-bold leading-none mb-1">Attendance Logged</p>
                    <p className="text-xs text-neutral-400 font-medium">Class {cls?.className} - {cls?.section}</p>
                    <p className="text-[10px] text-neutral-600 mt-2 font-bold tracking-widest">{format(new Date(session.date), 'MMM dd, yyyy')}</p>
                  </div>
                </div>
              );
            })}
            {sessions.length === 0 && <p className="text-center text-neutral-500 py-20 italic">No recent sessions</p>}
          </div>
        </div>

      {/* Class List Detailed (Admin view) */}
      <div className="space-y-4">
        <h3 className="font-bold text-xl">Manage Classes</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map(c => {
             const studentCount = students.filter(s => s.classId === c.id).length;
             return (
               <div key={c.id} className="glass-card p-5 hover:border-neutral-900/20 transition-all cursor-pointer group">
                 <div className="flex items-center justify-between mb-4">
                   <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center text-neutral-900 font-bold group-hover:bg-neutral-900 group-hover:text-white transition-all">
                     {c.className}
                   </div>
                   <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Section {c.section}</span>
                 </div>
                 <div className="flex items-center justify-between mt-auto">
                   <div className="flex items-center gap-1.5">
                     <Users size={14} className="text-neutral-400" />
                     <span className="text-sm font-bold text-neutral-600">{studentCount} Students</span>
                   </div>
                   <button className="text-neutral-900 font-bold text-sm flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     View Details
                   </button>
                 </div>
               </div>
             );
          })}
          
          <button 
            onClick={() => setIsAddClassOpen(true)}
            className="border-2 border-dashed border-neutral-200 rounded-2xl flex flex-col items-center justify-center gap-2 min-h-[160px] hover:border-neutral-400 hover:bg-neutral-50 transition-all text-neutral-400 hover:text-neutral-600"
          >
            <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center"><Plus size={20} /></div>
            <span className="font-bold text-xs uppercase tracking-widest">Add New Class</span>
          </button>
        </div>
      </div>

      {/* Add Class Modal */}
      {isAddClassOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-8 shadow-3xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold tracking-tight">Create New Class</h2>
              <button onClick={() => setIsAddClassOpen(false)} className="p-2 hover:bg-neutral-50 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddClass} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Class Name / Grade</label>
                <input 
                  type="text" 
                  placeholder="e.g. Class 10" 
                  required 
                  className="input-field" 
                  value={newClassName} 
                  onChange={(e) => setNewClassName(e.target.value)} 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Section</label>
                <input 
                  type="text" 
                  placeholder="e.g. A" 
                  required 
                  className="input-field" 
                  value={newSection} 
                  onChange={(e) => setNewSection(e.target.value)} 
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsAddClassOpen(false)} 
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
