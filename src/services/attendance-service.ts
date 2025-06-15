
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
  orderBy,
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
    where("date", "==", date),
    orderBy("checkInTime", "asc")
  );

  const attendanceSnapshot = await getDocs(attendanceQuery);
  if (attendanceSnapshot.empty) {
    return [];
  }

  const attendanceDetails: DailyAttendanceDetail[] = [];
  const studentCache = new Map<string, Pick<Student, 'studentId' | 'name' | 'seatNumber' | 'shift'> | null>();

  for (const attendanceDoc of attendanceSnapshot.docs) {
    const record = attendanceRecordFromSnapshot(attendanceDoc);
    if (!record) continue;

    let studentData = studentCache.get(record.studentId);
    if (studentData === undefined) { // Not in cache, fetch it
      // Assuming studentId in attendanceRecords is the custom studentId (e.g., TSMEM001)
      // We need to query the students collection based on this custom studentId field.
      const studentQuery = query(collection(db, "students"), where("studentId", "==", record.studentId), limit(1));
      const studentDocSnapshots = await getDocs(studentQuery);
      if (!studentDocSnapshots.empty) {
          const rawStudentData = studentFromSnapshot(studentDocSnapshots.docs[0]);
          studentData = rawStudentData;
      } else {
          studentData = null; // Student not found
      }
      studentCache.set(record.studentId, studentData);
    }

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
      // Handle case where student data might not be found for an attendance record
      // This might indicate an orphaned record or data inconsistency
      console.warn(`Student data not found for studentId: ${record.studentId} from attendance record: ${record.recordId}`);
      attendanceDetails.push({
        recordId: record.recordId,
        studentId: record.studentId,
        studentName: `Unknown Student (ID: ${record.studentId})`,
        seatNumber: null,
        shift: 'fullday', // Default or indicate unknown
        checkInTime: record.checkInTime,
        checkOutTime: record.checkOutTime,
      });
    }
  }

  return attendanceDetails.sort((a, b) =>
    parseISO(a.checkInTime).getTime() - parseISO(b.checkInTime).getTime()
  );
}

