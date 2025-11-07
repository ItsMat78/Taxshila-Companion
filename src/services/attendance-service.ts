
"use server";

import {
  db,
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  Timestamp,
  orderBy, // Keep orderBy import for other potential uses, but we'll remove its use in the problematic query
  limit, // Added limit in case it was intended for student query
} from '@/lib/firebase';
import type { Student, Shift, AttendanceRecord } from '@/types/student';
import { format, parseISO, isValid } from 'date-fns';

export interface DailyAttendanceDetail {
  recordId: string;
  studentId: string;
  studentName: string;
  seatNumber: string | null;
  shift: Shift;
  checkInTime: string; // ISO string
  checkOutTime?: string; // ISO string
}

// Simplified student data transformation, avoiding import from student-service.ts
const studentFromSnapshot = (docSnapshot: any): Pick<Student, 'studentId' | 'name' | 'seatNumber' | 'shift' | 'email'> | null => {
  const data = docSnapshot.data();
  if (!data) return null;
  return {
    studentId: data.studentId, // Assuming student documents have a 'studentId' field matching the custom ID
    name: data.name,
    seatNumber: data.seatNumber || null,
    shift: data.shift,
    email: data.email || undefined,
  };
};

// Simplified attendance record transformation
const attendanceRecordFromSnapshot = (docSnapshot: any): Omit<AttendanceRecord, 'date'> & { dateString: string } | null => {
  const data = docSnapshot.data();
  if (!data) return null;

  let checkInTimeISO: string;
  if (data.checkInTime instanceof Timestamp) {
    checkInTimeISO = data.checkInTime.toDate().toISOString();
  } else if (typeof data.checkInTime === 'string' && isValid(parseISO(data.checkInTime))) {
    checkInTimeISO = data.checkInTime;
  } else {
    return null; // Invalid check-in time
  }

  let checkOutTimeISO: string | undefined = undefined;
  if (data.checkOutTime instanceof Timestamp) {
    checkOutTimeISO = data.checkOutTime.toDate().toISOString();
  } else if (typeof data.checkOutTime === 'string' && isValid(parseISO(data.checkOutTime))) {
    checkOutTimeISO = data.checkOutTime;
  }

  let dateStr: string;
  if (data.date instanceof Timestamp) {
    dateStr = format(data.date.toDate(), 'yyyy-MM-dd');
  } else if (typeof data.date === 'string' && data.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    dateStr = data.date;
  } else {
    dateStr = format(parseISO(checkInTimeISO), 'yyyy-MM-dd');
  }

  return {
    recordId: docSnapshot.id,
    studentId: data.studentId,
    dateString: dateStr,
    checkInTime: checkInTimeISO,
    checkOutTime: checkOutTimeISO,
  };
};


export async function getDailyAttendanceDetails(date: string): Promise<DailyAttendanceDetail[]> {
  const attendanceQuery = query(
    collection(db, "attendanceRecords"),
    where("date", "==", date)
  );

  const studentsQuery = query(collection(db, "students"));

  const [attendanceSnapshot, studentsSnapshot] = await Promise.all([
    getDocs(attendanceQuery),
    getDocs(studentsQuery)
  ]);
  
  if (attendanceSnapshot.empty) {
    return [];
  }

  const studentMap = new Map<string, Pick<Student, 'studentId' | 'name' | 'seatNumber' | 'shift'>>();
  studentsSnapshot.docs.forEach(doc => {
    const studentData = studentFromSnapshot(doc);
    if(studentData) {
        studentMap.set(studentData.studentId, studentData);
    }
  });
  

  const attendanceDetails: DailyAttendanceDetail[] = [];

  for (const attendanceDoc of attendanceSnapshot.docs) {
    const record = attendanceRecordFromSnapshot(attendanceDoc);
    if (!record) continue;

    let studentData = studentMap.get(record.studentId);
    
    if (studentData) {
      attendanceDetails.push({
        recordId: record.recordId,
        studentId: record.studentId,
        studentName: studentData.name,
        seatNumber: studentData.seatNumber,
        shift: studentData.shift,
        checkInTime: record.checkInTime,
        checkOutTime: record.checkOutTime,
      });
    } else {
      console.warn(`Student data not found for studentId: ${record.studentId} from attendance record: ${record.recordId}`);
      attendanceDetails.push({
        recordId: record.recordId,
        studentId: record.studentId,
        studentName: `Unknown Student (ID: ${record.studentId})`,
        seatNumber: null,
        shift: 'fullday', 
        checkInTime: record.checkInTime,
        checkOutTime: record.checkOutTime,
      });
    }
  }

  // Sort the results in JavaScript after fetching
  return attendanceDetails.sort((a, b) =>
    parseISO(a.checkInTime).getTime() - parseISO(b.checkInTime).getTime()
  );
}


