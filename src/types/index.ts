export type UserRole = 'admin' | 'teacher';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  schoolId: string;
  createdAt: any;
  status: 'active' | 'inactive';
}

export interface School {
  id: string;
  name: string;
  code: string;
  adminId: string;
  createdAt: any;
  address?: string;
  phone?: string;
  status: 'active' | 'inactive';
}

export interface ClassSection {
  id: string;
  schoolId: string;
  className: string;
  section: string;
  teacherId: string;
  createdAt: any;
}

export interface Student {
  id: string;
  schoolId: string;
  classId: string;
  name: string;
  rollNumber: string;
  studentCode: string;
  photoUrl?: string;
  createdAt: any;
  status: 'active' | 'inactive';
  percentage?: number;
  totalSessions?: number;
}

export interface AttendanceSession {
  id: string;
  schoolId: string;
  classId: string;
  date: string; // ISO Date YYYY-MM-DD
  teacherId: string;
  createdAt: any;
  locked: boolean;
  total?: number;
  present?: number;
  late?: number;
  absent?: number;
}

export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  markedAt: any;
}

export interface StudentReport {
  id: string;
  studentId: string;
  teacherId: string;
  message: string;
  createdAt: any;
}
