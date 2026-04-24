import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../App';
import { ClassSection, Student, AttendanceRecord, AttendanceSession } from '../types';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Users, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Filter, Clock } from 'lucide-react';
import { startOfYear, startOfMonth, endOfMonth, startOfWeek, format, subDays, isSameDay, eachDayOfInterval } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [analytics, setAnalytics] = useState<{
    topAttending: Student[];
    leastAttending: Student[];
    tiers: {
      above80: Student[];
      above50: Student[];
      above30: Student[];
      below30: Student[];
    };
    studentStats: Student[];
  } | null>(null);
  const [timeRange, setTimeRange] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [loading, setLoading] = useState(true);
  const [pivotDate, setPivotDate] = useState(new Date());

  useEffect(() => {
    if (user?.schoolId) {
      fetchClasses();
    }
  }, [user]);

  useEffect(() => {
    if (selectedClass) {
      fetchData();
    }
  }, [selectedClass, timeRange, pivotDate]);

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

  const fetchData = async () => {
    if (!selectedClass || !user?.schoolId) return;
    setLoading(true);
    try {
      // Fetch students - Filtered by schoolId
      const sQuery = query(
        collection(db, 'students'), 
        where('schoolId', '==', user.schoolId),
        where('classId', '==', selectedClass)
      );
      const sSnap = await getDocs(sQuery);
      const studentsData = sSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
      setStudents(studentsData);

      // Fetch sessions - Filtered by schoolId
      const sesQuery = query(
        collection(db, 'attendance_sessions'), 
        where('schoolId', '==', user.schoolId),
        where('classId', '==', selectedClass)
      );
      const sesSnap = await getDocs(sesQuery);
      const sessionsData = sesSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceSession));
      setSessions(sessionsData);

      // Fetch records for these sessions
      if (sessionsData.length > 0) {
        // We only fetch records for the 30 most recent sessions to populate student-specific stats
        // High-level charts will now use session-level counts for better performance and range
        const recQuery = query(
          collection(db, 'attendance_records'),
          where('schoolId', '==', user.schoolId),
          where('sessionId', 'in', sessionsData.slice(-30).map(s => s.id))
        );
        const recSnap = await getDocs(recQuery);
        const recordsData = recSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
        setRecords(recordsData);
        calculateAnalytics(studentsData, sessionsData, recordsData);
      } else {
        setAnalytics(null);
      }
    } catch (e) {
      console.error("Dashboard Fetch Error:", e);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (sts: Student[], ses: AttendanceSession[], recs: AttendanceRecord[]) => {
    const studentStats = sts.map(s => {
      // Use records we fetched (last 30 sessions)
      const studentRecords = recs.filter(r => r.studentId === s.id);
      const presentCount = studentRecords.filter(r => r.status === 'present').length;
      const lateCount = studentRecords.filter(r => r.status === 'late').length;
      
      // Calculate based on the subset of sessions we have records for
      const relevantSessionIds = new Set(recs.map(r => r.sessionId));
      const totalRelevantSessions = ses.filter(sn => relevantSessionIds.has(sn.id)).length;
      
      const percentage = totalRelevantSessions > 0 ? ((presentCount + lateCount * 0.5) / totalRelevantSessions) * 100 : 0;
      return { ...s, percentage };
    });

    const topAttending = [...studentStats].sort((a, b) => b.percentage - a.percentage).slice(0, 3);
    const leastAttending = [...studentStats].sort((a, b) => a.percentage - b.percentage).slice(0, 3);

    const tiers = {
      above80: studentStats.filter(s => s.percentage >= 80),
      above50: studentStats.filter(s => s.percentage >= 50 && s.percentage < 80),
      above30: studentStats.filter(s => s.percentage >= 30 && s.percentage < 50),
      below30: studentStats.filter(s => s.percentage < 30)
    };

    setAnalytics({ topAttending, leastAttending, tiers, studentStats });
  };

  const getChartData = () => {
    const sortedSessions = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
    
    let labels: string[] = [];
    let percentages: number[] = [];

    if (timeRange === 'yearly') {
      // Group by Month for the pivot year
      const monthGroups: Record<string, { total: number; attended: number }> = {};
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      months.forEach(m => monthGroups[m] = { total: 0, attended: 0 });

      const pivotYear = pivotDate.getFullYear();

      sortedSessions.forEach(s => {
        const date = new Date(s.date);
        if (date.getFullYear() !== pivotYear) return;

        const monthLabel = months[date.getMonth()];
        
        // Use pre-calculated counts if available, otherwise fallback to records
        if (s.total !== undefined) {
          monthGroups[monthLabel].total += s.total;
          monthGroups[monthLabel].attended += (s.present || 0) + (s.late || 0) * 0.5;
        } else {
          const sessionRecords = records.filter(r => r.sessionId === s.id);
          if (sessionRecords.length > 0) {
            const attended = sessionRecords.filter(r => r.status === 'present' || r.status === 'late').length;
            monthGroups[monthLabel].total += sessionRecords.length;
            monthGroups[monthLabel].attended += attended;
          }
        }
      });

      labels = months.map(m => `${m} ${pivotYear}`);
      percentages = months.map(m => {
        const group = monthGroups[m];
        return group.total > 0 ? (group.attended / group.total) * 100 : 0;
      });
    } else {
      // Weekly or Monthly - Show ALL dates in range relative to pivotDate
      const end = timeRange === 'monthly' ? endOfMonth(pivotDate) : pivotDate;
      const start = timeRange === 'weekly' ? subDays(end, 6) : startOfMonth(pivotDate);
      const interval = eachDayOfInterval({ start, end });

      labels = interval.map(date => format(date, timeRange === 'weekly' ? 'EEE (dd/MM)' : 'dd'));
      percentages = interval.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const session = sessions.find(s => s.date === dateStr);
        
        if (!session) return 0;

        if (session.total !== undefined) {
          return session.total > 0 ? ((session.present || 0) + (session.late || 0) * 0.5) / session.total * 100 : 0;
        }

        const sessionRecords = records.filter(r => r.sessionId === session.id);
        if (sessionRecords.length === 0) return 0;
        const attended = sessionRecords.filter(r => r.status === 'present' || r.status === 'late').length;
        return (attended / sessionRecords.length) * 100;
      });
    }

    return {
      labels,
      datasets: [
        {
          label: 'Attendance %',
          data: percentages,
          borderColor: '#3D4E28',
          backgroundColor: 'rgba(175, 188, 136, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: timeRange === 'yearly' ? 6 : 4,
          pointBackgroundColor: '#3D4E28',
        }
      ]
    };
  };

  if (loading) return (
    <div className="h-[60vh] w-full flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-neutral-900 border-t-transparent rounded-full"></div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Teacher Dashboard</h1>
          <p className="text-neutral-500 font-medium">Monitoring {classes.find(c => c.id === selectedClass)?.className} - Section {classes.find(c => c.id === selectedClass)?.section}</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <select 
            className="input-field py-2 text-sm w-full sm:w-fit sm:max-w-[250px]"
            value={selectedClass || ''}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            {classes.map(c => <option key={c.id} value={c.id}>Class {c.className} - {c.section}</option>)}
          </select>
          <div className="bg-neutral-100 p-1 rounded-xl flex items-center justify-between sm:justify-start gap-1 w-full sm:w-auto">
            {(['weekly', 'monthly', 'yearly'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold rounded-lg transition-all text-center ${timeRange === range ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-400'}`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top/Least Attending */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4 text-emerald-600">
            <TrendingUp size={20} />
            <h3 className="font-bold">Top Attending Students</h3>
          </div>
          <div className="space-y-3">
            {analytics?.topAttending.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                <span className="font-semibold text-neutral-800">{s.name}</span>
                <span className="font-bold text-emerald-700">{s.percentage.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4 text-amber-600">
            <TrendingDown size={20} />
            <h3 className="font-bold">Least Attending Students</h3>
          </div>
          <div className="space-y-3">
            {analytics?.leastAttending.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                <span className="font-semibold text-neutral-800">{s.name}</span>
                <span className="font-bold text-amber-700">{s.percentage.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="font-bold text-lg">Attendance Overview</h3>
            <p className="text-xs text-neutral-500 font-medium tracking-tight">
              {timeRange === 'weekly' 
                ? `Trend for week ending ${format(pivotDate, 'MMM dd, yyyy')}` 
                : timeRange === 'monthly' 
                  ? `Trend for ${format(pivotDate, 'MMMM yyyy')}` 
                  : `Yearly performance ${pivotDate.getFullYear()}`}
            </p>
          </div>
          <div className="flex items-center gap-1">
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
        </div>
        <div className="h-[300px]">
          {sessions.length > 0 ? (
            <Line 
              data={getChartData()} 
              options={{ 
                responsive: true, 
                maintainAspectRatio: false,
                scales: { 
                  y: { min: 0, max: 100, grid: { color: '#E6DAB9' } },
                  x: { grid: { display: false } }
                },
                plugins: { legend: { display: false } }
              }} 
            />
          ) : (
            <div className="h-full flex items-center justify-center text-neutral-400 font-medium italic">No attendance data yet</div>
          )}
        </div>
      </div>

      {/* Tiers */}
      <div className="space-y-6">
        <h3 className="font-bold text-xl flex items-center gap-2">
          <Filter size={20} className="text-neutral-400" />
          Attendance Breakdown
        </h3>
        
        <div className="space-y-4">
          {[
            { label: '80% & Above (Excellent)', data: analytics?.tiers.above80, color: 'text-brand-900', bg: 'bg-brand-500/10' },
            { label: '50% - 79% (Average)', data: analytics?.tiers.above50, color: 'text-brand-900', bg: 'bg-brand-200/20' },
            { label: '30% - 49% (Low)', data: analytics?.tiers.above30, color: 'text-brand-900/60', bg: 'bg-brand-200/10' },
            { label: 'Below 30% (Critical)', data: analytics?.tiers.below30, color: 'text-red-700', bg: 'bg-red-50/50' }
          ].map((tier, idx) => (
            <div key={idx} className="glass-card overflow-hidden">
              <div className={`px-6 py-4 ${tier.bg} border-b border-brand-200/20 flex justify-between items-center`}>
                <span className={`font-bold ${tier.color} text-xs uppercase tracking-widest`}>{tier.label}</span>
                <span className="text-xs font-bold text-brand-900/40 bg-white/50 px-2 py-1 rounded-lg">{tier.data?.length || 0} Students</span>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {tier.data && tier.data.length > 0 ? tier.data.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-brand-900/5">
                    <span className="text-sm font-semibold text-brand-900">{s.name}</span>
                    <span className="text-xs font-bold text-brand-900/40">{s.percentage.toFixed(0)}%</span>
                  </div>
                )) : (
                  <p className="col-span-full text-xs font-bold text-brand-900/20 uppercase tracking-widest italic py-2">No students in this category</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
