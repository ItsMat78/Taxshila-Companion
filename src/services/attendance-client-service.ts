import {
  db,
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  Timestamp,
  orderBy,
  onSnapshot,
} from '@/lib/firebase';
import type { QueryDocumentSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';
import type { Student, AttendanceRecord, CheckedInStudentInfo } from '@/types/student';
import { format, parseISO, isValid, startOfMonth, endOfMonth, isAfter, getHours, getMinutes, differenceInMilliseconds } from 'date-fns';

// --- Collections ---
const STUDENTS_COLLECTION = "students";
const ATTENDANCE_COLLECTION = "attendanceRecords";

// --- Helper to convert Firestore Timestamps in attendance data ---
const attendanceRecordFromDoc = (docSnapshot: QueryDocumentSnapshot<DocumentData>): AttendanceRecord => {
  const data = docSnapshot.data();
  if (!data) {
    throw new Error(`Attendance document ${docSnapshot.id} has no data.`);
  }

  let checkInTimeISO: string;
  if (data.checkInTime instanceof Timestamp) {
    checkInTimeISO = data.checkInTime.toDate().toISOString();
  } else if (typeof data.checkInTime === 'string' && isValid(parseISO(data.checkInTime))) {
    checkInTimeISO = data.checkInTime;
  } else {
    checkInTimeISO = new Date(0).toISOString();
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
    date: dateStr,
    checkInTime: checkInTimeISO,
    checkOutTime: checkOutTimeISO,
  };
};

// We need a minimal studentFromDoc for getStudentByCustomId helper used by addCheckIn
// Import it from student-core-service to avoid circular deps - we use a lazy import pattern
async function getStudentByCustomIdInternal(studentId: string): Promise<Student | undefined> {
  const { getStudentByCustomId } = await import('./student-core-service');
  return getStudentByCustomId(studentId);
}

export type StudentSeatAssignment = Pick<Student, 'studentId' | 'name' | 'shift' | 'seatNumber' | 'activityStatus' | 'profilePictureUrl'>;

export async function getStudentSeatAssignments(): Promise<StudentSeatAssignment[]> {
    const studentsRef = collection(db, STUDENTS_COLLECTION);
    const q = query(studentsRef, where("activityStatus", "==", "Active"));

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            studentId: data.studentId,
            name: data.name,
            shift: data.shift,
            seatNumber: data.seatNumber || null,
            activityStatus: data.activityStatus,
            profilePictureUrl: data.profilePictureUrl,
        } as StudentSeatAssignment;
    });
}

export async function getActiveCheckIn(studentId: string): Promise<AttendanceRecord | undefined> {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const q = query(
    collection(db, ATTENDANCE_COLLECTION),
    where("studentId", "==", studentId),
    where("date", "==", todayStr),
    where("checkOutTime", "==", null)
  );
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return undefined;
  }

  const records = querySnapshot.docs.map(doc => attendanceRecordFromDoc(doc));
  records.sort((a, b) => parseISO(b.checkInTime).getTime() - parseISO(a.checkInTime).getTime());
  return records[0];
}

/**
 * Real-time listener for a student's active check-in record today.
 * Calls `callback` immediately with the current state, then on every change.
 * Returns an unsubscribe function — call it on component unmount.
 */
export function subscribeToActiveCheckIn(
  studentId: string,
  callback: (record: AttendanceRecord | null) => void,
): () => void {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const q = query(
    collection(db, ATTENDANCE_COLLECTION),
    where('studentId', '==', studentId),
    where('date', '==', todayStr),
    where('checkOutTime', '==', null),
  );

  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
      return;
    }
    const records = snapshot.docs.map(d => attendanceRecordFromDoc(d));
    records.sort((a, b) => parseISO(b.checkInTime).getTime() - parseISO(a.checkInTime).getTime());
    callback(records[0]);
  });
}


export async function addCheckIn(studentId: string): Promise<AttendanceRecord> {
  const student = await getStudentByCustomIdInternal(studentId);
  if (!student || !student.firestoreId) {
    throw new Error("Student not found for check-in.");
  }

  const existingActiveCheckIn = await getActiveCheckIn(studentId);
  if (existingActiveCheckIn) {
    console.warn(`[StudentService] Blocked duplicate check-in for student ${studentId}. Active record: ${existingActiveCheckIn.recordId}`);
    throw new Error("You are already checked in. Please check out before checking in again.");
  }

  const now = new Date();
  const newRecordData = {
    studentId,
    date: format(now, 'yyyy-MM-dd'),
    checkInTime: Timestamp.fromDate(now),
    checkOutTime: null,
  };
  const docRef = await addDoc(collection(db, ATTENDANCE_COLLECTION), newRecordData);

  const studentDocRef = doc(db, STUDENTS_COLLECTION, student.firestoreId);
  await updateDoc(studentDocRef, { lastAttendanceDate: Timestamp.fromDate(now) });

  return {
    recordId: docRef.id,
    studentId: newRecordData.studentId,
    date: newRecordData.date,
    checkInTime: newRecordData.checkInTime.toDate().toISOString(),
  };
}

export async function addCheckOut(recordId: string): Promise<AttendanceRecord | undefined> {
  const recordDocRef = doc(db, ATTENDANCE_COLLECTION, recordId);
  const recordSnap = await getDoc(recordDocRef);
  if (!recordSnap.exists()) return undefined;

  await updateDoc(recordDocRef, { checkOutTime: Timestamp.fromDate(new Date()) });
  const updatedSnap = await getDoc(recordDocRef);
  return updatedSnap.exists() ? attendanceRecordFromDoc(updatedSnap) : undefined;
}

export async function getAttendanceForDate(studentId: string, date: string): Promise<AttendanceRecord[]> {
  const q = query(
    collection(db, ATTENDANCE_COLLECTION),
    where("studentId", "==", studentId),
    where("date", "==", date)
  );
  const querySnapshot = await getDocs(q);
  const records = querySnapshot.docs.map(doc => attendanceRecordFromDoc(doc));
  records.sort((a, b) => parseISO(a.checkInTime).getTime() - parseISO(b.checkInTime).getTime());
  return records;
}

export async function getAttendanceForDateRange(studentId: string, startDate: string, endDate: string): Promise<AttendanceRecord[]> {
  const q = query(
    collection(db, ATTENDANCE_COLLECTION),
    where("studentId", "==", studentId)
  );
  const querySnapshot = await getDocs(q);
  const allRecords = querySnapshot.docs.map(doc => attendanceRecordFromDoc(doc));

  const filteredRecords = allRecords.filter(record => {
      return record.date >= startDate && record.date <= endDate;
  });

  filteredRecords.sort((a, b) => a.date.localeCompare(b.date));
  return filteredRecords;
}

export async function getAttendanceRecordsForDateRangeAll(startDate: string, endDate: string): Promise<AttendanceRecord[]> {
  const q = query(
    collection(db, ATTENDANCE_COLLECTION),
    where("date", ">=", startDate),
    where("date", "<=", endDate),
    orderBy("date", "asc")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => attendanceRecordFromDoc(doc));
}

export async function getAllAttendanceRecords(): Promise<AttendanceRecord[]> {
    const q = query(collection(db, ATTENDANCE_COLLECTION));
    const querySnapshot = await getDocs(q);
    const records = querySnapshot.docs.map(doc => attendanceRecordFromDoc(doc));
    records.sort((a,b) => parseISO(b.checkInTime).getTime() - parseISO(a.checkInTime).getTime());
    return records;
}

export async function getAttendanceRecordsByStudentId(studentId: string): Promise<AttendanceRecord[]> {
  const q = query(collection(db, ATTENDANCE_COLLECTION), where("studentId", "==", studentId));
  const querySnapshot = await getDocs(q);
  const records = querySnapshot.docs.map(doc => attendanceRecordFromDoc(doc));
  records.sort((a, b) => parseISO(b.checkInTime).getTime() - parseISO(a.checkInTime).getTime());
  return records;
}

export async function getTodaysActiveAttendanceRecords() {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const q = query(
        collection(db, ATTENDANCE_COLLECTION),
        where("date", "==", todayStr),
        where("checkOutTime", "==", null)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot;
}

export async function processCheckedInStudentsFromSnapshot(
    attendanceSnapshot: QuerySnapshot<DocumentData>,
    allStudents: Student[]
): Promise<CheckedInStudentInfo[]> {
    if (attendanceSnapshot.empty) {
        return [];
    }

    const studentMap = new Map(allStudents.map(s => [s.studentId, s]));

    const checkedInStudentDetails: CheckedInStudentInfo[] = attendanceSnapshot.docs
        .map((attendanceDoc) => {
            const record = attendanceRecordFromDoc(attendanceDoc);
            if (!record) return null;

            const student = studentMap.get(record.studentId);
            if (!student) return null;

            let isOutsideAtCheckIn = false;
            const checkInTime = parseISO(record.checkInTime);
            const checkInHour = getHours(checkInTime);
            const checkInMinutes = getMinutes(checkInTime);

            if (student.shift === "morning" && (checkInHour < 7 || checkInHour >= 14)) {
                isOutsideAtCheckIn = true;
            } else if (student.shift === "evening" && (checkInHour < 14 || checkInHour > 21 || (checkInHour === 21 && checkInMinutes > 30))) {
                isOutsideAtCheckIn = true;
            }

            return { ...student, checkInTime: record.checkInTime, isOutsideShift: isOutsideAtCheckIn };
        })
        .filter((s): s is CheckedInStudentInfo => s !== null)
        .sort((a, b) => parseISO(a.checkInTime).getTime() - parseISO(b.checkInTime).getTime());

    return checkedInStudentDetails;
}

export async function calculateMonthlyStudyHours(customStudentId: string, monthDate: Date = new Date()): Promise<number> {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);

    const recordsInMonth = await getAttendanceForDateRange(
        customStudentId,
        format(monthStart, 'yyyy-MM-dd'),
        format(monthEnd, 'yyyy-MM-dd')
    );

    let totalMilliseconds = 0;
    const now = new Date();

    recordsInMonth.forEach(record => {
        if (!record || !record.checkInTime) return;
        try {
            const checkInDate = parseISO(record.checkInTime);
            let sessionEndDate: Date;

            if (record.checkOutTime && isValid(parseISO(record.checkOutTime))) {
                sessionEndDate = parseISO(record.checkOutTime);
            } else {
                const isTodayRecord = format(checkInDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
                if (isTodayRecord) {
                    sessionEndDate = now;
                } else {
                    sessionEndDate = new Date(checkInDate);
                    sessionEndDate.setHours(21, 30, 0, 0);
                }
            }

            if (isAfter(sessionEndDate, checkInDate)) {
                totalMilliseconds += differenceInMilliseconds(sessionEndDate, checkInDate);
            }
        } catch (e) {
            console.error(`Error processing attendance record ${record.recordId} for student ${customStudentId}:`, e);
        }
    });

    const totalHours = totalMilliseconds / (1000 * 60 * 60);
    return Math.round(totalHours * 10) / 10;
}
