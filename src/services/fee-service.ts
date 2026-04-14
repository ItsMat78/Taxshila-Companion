import {
  db,
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  where,
  Timestamp,
  arrayUnion,
  runTransaction,
  writeBatch,
  setDoc,
} from '@/lib/firebase';
import type { QueryDocumentSnapshot, DocumentSnapshot, DocumentData } from 'firebase/firestore';
import type { Student, Shift, FeeStatus, PaymentRecord, FeeStructure } from '@/types/student';
import type { AlertItem } from '@/types/communication';
import { format, parseISO, isValid, addDays, isAfter, startOfDay, differenceInDays, startOfMonth, endOfMonth, isWithinInterval, parse } from 'date-fns';

// --- Collections ---
const STUDENTS_COLLECTION = "students";
const APP_CONFIG_COLLECTION = "appConfiguration";
const FEE_SETTINGS_DOC_ID = "feeSettings";

// --- Helper to convert Firestore Timestamps in student data ---
const studentFromDoc = (docSnapshot: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>): Student => {
  const data = docSnapshot.data() ?? {};
  return {
    ...data,
    id: docSnapshot.id,
    firestoreId: docSnapshot.id,
    registrationDate: data.registrationDate instanceof Timestamp ? format(data.registrationDate.toDate(), 'yyyy-MM-dd') : data.registrationDate,
    lastPaymentDate: data.lastPaymentDate instanceof Timestamp ? format(data.lastPaymentDate.toDate(), 'yyyy-MM-dd') : (data.lastPaymentDate === null ? undefined : data.lastPaymentDate),
    lastAttendanceDate: data.lastAttendanceDate instanceof Timestamp ? data.lastAttendanceDate.toDate().toISOString() : data.lastAttendanceDate,
    nextDueDate: data.nextDueDate instanceof Timestamp ? format(data.nextDueDate.toDate(), 'yyyy-MM-dd') : (data.nextDueDate === null ? undefined : data.nextDueDate),
    paymentHistory: (data.paymentHistory || []).map((p: { date: unknown } & Record<string, unknown>) => ({
      ...p,
      date: p.date instanceof Timestamp ? format((p.date as InstanceType<typeof Timestamp>).toDate(), 'yyyy-MM-dd') : p.date,
    })),
    fcmTokens: data.fcmTokens || [],
    oneSignalPlayerIds: data.oneSignalPlayerIds || [],
    theme: data.theme || 'light-default',
    uid: data.uid,
  } as Student;
};

// --- Fee Structure ---
const DEFAULT_FEE_STRUCTURE: FeeStructure = {
  morningFee: 600,
  eveningFee: 600,
  fullDayFee: 1000,
};

export async function getFeeStructure(): Promise<FeeStructure> {
  const feeSettingsDocRef = doc(db, APP_CONFIG_COLLECTION, FEE_SETTINGS_DOC_ID);
  try {
    const docSnap = await getDoc(feeSettingsDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as FeeStructure;
    } else {
      await runTransaction(db, async (transaction) => {
        const freshDocSnap = await transaction.get(feeSettingsDocRef);
        if (!freshDocSnap.exists()) {
          transaction.set(feeSettingsDocRef, DEFAULT_FEE_STRUCTURE);
        }
      });
      return DEFAULT_FEE_STRUCTURE;
    }
  } catch (error) {
    console.error("Error getting or creating fee structure:", error);
    return DEFAULT_FEE_STRUCTURE;
  }
}

export async function getFeeStructureForHomepage(): Promise<FeeStructure> {
  return getFeeStructure();
}

export async function updateFeeStructure(newFees: Partial<FeeStructure>): Promise<void> {
  const feeSettingsDocRef = doc(db, APP_CONFIG_COLLECTION, FEE_SETTINGS_DOC_ID);
  const dataToUpdate: Partial<FeeStructure> = {};
  if (newFees.morningFee !== undefined && newFees.morningFee > 0) dataToUpdate.morningFee = newFees.morningFee;
  if (newFees.eveningFee !== undefined && newFees.eveningFee > 0) dataToUpdate.eveningFee = newFees.eveningFee;
  if (newFees.fullDayFee !== undefined && newFees.fullDayFee > 0) dataToUpdate.fullDayFee = newFees.fullDayFee;

  if (Object.keys(dataToUpdate).length === 0) {
    throw new Error("No valid fee updates provided.");
  }

  await updateDoc(feeSettingsDocRef, dataToUpdate);
}

// --- Helper to get all students (local to this module) ---
async function getAllStudentsInternal(): Promise<Student[]> {
  const q = query(collection(db, STUDENTS_COLLECTION));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(studentFromDoc);
}

// --- Helper to get student by custom ID (lazy import to avoid circular deps) ---
async function getStudentByCustomIdInternal(studentId: string): Promise<Student | undefined> {
  const { getStudentByCustomId } = await import('./student-core-service');
  return getStudentByCustomId(studentId);
}

// --- Helper to send alert (lazy import to avoid circular deps) ---
async function sendAlertToStudentInternal(
  customStudentId: string,
  title: string,
  message: string,
  type: AlertItem['type']
) {
  const { sendAlertToStudent } = await import('./communication-client-service');
  return sendAlertToStudent(customStudentId, title, message, type);
}

// --- Payment and Revenue ---
export async function recordStudentPayment(
  customStudentId: string,
  totalAmountPaidString: string,
  paymentMethod: PaymentRecord['method'],
  numberOfMonthsPaid: number = 1
): Promise<Student | undefined> {
  const studentToUpdate = await getStudentByCustomIdInternal(customStudentId);
  if (!studentToUpdate || !studentToUpdate.firestoreId) {
    throw new Error("Student not found.");
  }
  if (studentToUpdate.activityStatus === 'Left') {
    throw new Error("Cannot record payment for a student who has left.");
  }

  const fees = await getFeeStructure();
  let expectedMonthlyFee: number;
  switch(studentToUpdate.shift) {
    case "morning": expectedMonthlyFee = fees.morningFee; break;
    case "evening": expectedMonthlyFee = fees.eveningFee; break;
    case "fullday": expectedMonthlyFee = fees.fullDayFee; break;
    default: throw new Error("Invalid shift for fee calculation.");
  }

  const amountToPayNumeric = expectedMonthlyFee * numberOfMonthsPaid;

  const studentDocRef = doc(db, STUDENTS_COLLECTION, studentToUpdate.firestoreId);
  const today = new Date();
  const newPaymentId = `PAY${String(Date.now()).slice(-6)}${String(Math.floor(Math.random() * 100)).padStart(2,'0')}`;
  const newTransactionId = `TXN${paymentMethod.substring(0,3).toUpperCase()}${String(Date.now()).slice(-7)}`;

  const previousDueDateString: string | undefined =
    studentToUpdate.nextDueDate && isValid(parseISO(studentToUpdate.nextDueDate))
      ? studentToUpdate.nextDueDate
      : undefined;

  let baseDateForCalculation: Date;
  if (previousDueDateString) {
      baseDateForCalculation = parseISO(previousDueDateString);
  } else {
      baseDateForCalculation = today;
  }
  const newNextDueDate = addDays(baseDateForCalculation, 30 * numberOfMonthsPaid);
  const newDueDateString = format(newNextDueDate, 'yyyy-MM-dd');

  const newPaymentRecord: PaymentRecord = {
    paymentId: newPaymentId,
    date: format(today, 'yyyy-MM-dd'),
    amount: `Rs. ${amountToPayNumeric}`,
    transactionId: newTransactionId,
    method: paymentMethod,
    previousDueDate: previousDueDateString,
    newDueDate: newDueDateString,
  };

  const firestorePaymentRecord = {
      ...newPaymentRecord,
      date: Timestamp.fromDate(parseISO(newPaymentRecord.date))
  };

  const updatedFeeData = {
    feeStatus: "Paid" as FeeStatus,
    lastPaymentDate: Timestamp.fromDate(today),
    nextDueDate: Timestamp.fromDate(newNextDueDate),
    amountDue: "Rs. 0",
    paymentHistory: arrayUnion(firestorePaymentRecord),
  };

  await updateDoc(studentDocRef, updatedFeeData);
  const updatedDocSnap = await getDoc(studentDocRef);
  const updatedStudent = studentFromDoc(updatedDocSnap);

  try {
    await sendAlertToStudentInternal(
      customStudentId,
      "Payment Confirmation",
      `Hi ${updatedStudent.name}, your fee payment of ${newPaymentRecord.amount} has been recorded. Fees paid up to ${updatedStudent.nextDueDate ? format(parseISO(updatedStudent.nextDueDate), 'PP') : 'N/A'}.`,
      "info"
    );
  } catch (alertError) {
    console.error("Failed to send payment confirmation alert, but payment was recorded.", alertError);
  }

  return updatedStudent;
}

export type MonthlyRevenueData = {
  monthDate: string;
  monthDisplay: string;
  revenue: number;
};

export async function getMonthlyRevenueHistory(): Promise<MonthlyRevenueData[]> {
    const allStudents = await getAllStudentsInternal();
    const monthlyRevenueMap = new Map<string, number>();

    allStudents.forEach(student => {
        if (student.paymentHistory) {
            student.paymentHistory.forEach(payment => {
                try {
                    const paymentDate = parseISO(payment.date);
                    if (isValid(paymentDate)) {
                        const monthKey = format(paymentDate, 'yyyy-MM');
                        const amountString = payment.amount.replace('Rs. ', '').trim();
                        const amountValue = parseInt(amountString, 10);
                        if (!isNaN(amountValue)) {
                            monthlyRevenueMap.set(
                                monthKey,
                                (monthlyRevenueMap.get(monthKey) || 0) + amountValue
                            );
                        }
                    }
                } catch (e) { /* ignore parse errors */ }
            });
        }
    });

    const results = Array.from(monthlyRevenueMap.entries())
        .map(([monthKey, revenue]) => {
            const monthDate = parse(`${monthKey}-01`, 'yyyy-MM-dd', new Date());
            return {
                monthDate: monthDate.toISOString(),
                monthDisplay: format(monthDate, 'MMMM yyyy'),
                revenue,
            };
        });

    results.sort((a, b) => b.monthDate.localeCompare(a.monthDate));

    return results;
}

export async function calculateMonthlyRevenue(): Promise<string> {
  const allStudents = await getAllStudentsInternal();
  let totalRevenue = 0;
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);

  allStudents.forEach(student => {
    if (student.paymentHistory) {
      student.paymentHistory.forEach(payment => {
        try {
          const paymentDate = parseISO(payment.date);
          if (isValid(paymentDate) && isWithinInterval(paymentDate, { start: currentMonthStart, end: currentMonthEnd })) {
            const amountString = payment.amount.replace('Rs. ', '').trim();
            const amountValue = parseInt(amountString, 10);
            if (!isNaN(amountValue)) {
              totalRevenue += amountValue;
            }
          }
        } catch (e) { /* ignore parse errors */ }
      });
    }
  });
  return `Rs. ${totalRevenue.toLocaleString('en-IN')}`;
}

export async function refreshAllStudentFeeStatuses(): Promise<{ updatedCount: number }> {
  const allStudents = await getAllStudentsInternal();
  const feeStructure = await getFeeStructure();
  const today = startOfDay(new Date());
  const batch = writeBatch(db);
  let updatedCount = 0;

  for (const student of allStudents) {
    if (student.activityStatus !== 'Active' || !student.firestoreId || !student.nextDueDate) {
      continue;
    }

    const dueDate = startOfDay(parseISO(student.nextDueDate));
    let newFeeStatus: FeeStatus | null = null;
    let newAmountDue: string | null = null;

    if (isAfter(dueDate, today)) {
      newFeeStatus = 'Paid';
      newAmountDue = 'Rs. 0';
    } else {
      const daysOverdue = differenceInDays(today, dueDate);
      if (daysOverdue > 5) {
        newFeeStatus = 'Overdue';
      } else {
        newFeeStatus = 'Due';
      }

      if (student.amountDue === 'Rs. 0' || !student.amountDue || student.amountDue === 'N/A') {
          switch (student.shift) {
            case "morning": newAmountDue = `Rs. ${feeStructure.morningFee}`; break;
            case "evening": newAmountDue = `Rs. ${feeStructure.eveningFee}`; break;
            case "fullday": newAmountDue = `Rs. ${feeStructure.fullDayFee}`; break;
            default: newAmountDue = "Rs. 0";
          }
      }
    }

    const needsUpdate = (newFeeStatus && newFeeStatus !== student.feeStatus) || (newAmountDue && newAmountDue !== student.amountDue);

    if (needsUpdate) {
      const studentDocRef = doc(db, STUDENTS_COLLECTION, student.firestoreId);
      const updatePayload: { feeStatus?: FeeStatus; amountDue?: string } = {};
      if (newFeeStatus && newFeeStatus !== student.feeStatus) {
        updatePayload.feeStatus = newFeeStatus;
      }
      if (newAmountDue && newAmountDue !== student.amountDue) {
          updatePayload.amountDue = newAmountDue;
      }

      if(Object.keys(updatePayload).length > 0) {
          batch.update(studentDocRef, updatePayload);
          updatedCount++;
      }
    }
  }

  if (updatedCount > 0) {
    await batch.commit();
  }

  return { updatedCount };
}

export async function getAllStudentsWithPaymentHistory(): Promise<Student[]> {
  return getAllStudentsInternal();
}
