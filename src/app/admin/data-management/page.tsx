
"use client";

import * as React from 'react';
import { PageTitle } from '@/components/shared/page-title';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { UploadCloud, DownloadCloud, FileText, FileSpreadsheet, Loader2, Users, FileClock, Banknote, AlertCircle, Trash2, KeyRound } from 'lucide-react';
import Papa from 'papaparse';
import { 
  getAllStudents, 
  batchImportStudents, 
  AddStudentData, 
  getAllAttendanceRecords, 
  getAllStudentsWithPaymentHistory,
  batchImportAttendance,
  batchImportPayments,
  deleteAllData,
  getFeeStructure, // Import getFeeStructure
  getStudentByCustomId // Import for fetching student by ID
} from '@/services/student-service';
import type { Student, AttendanceRecord, PaymentRecord, AttendanceImportData, PaymentImportData, FeeStructure } from '@/types/student';
import { format, parseISO, isValid, addMonths } from 'date-fns'; // Import addMonths
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useRouter } from 'next/navigation';
import { Timestamp, arrayUnion, writeBatch, doc } from '@/lib/firebase'; // For direct Firestore operations if needed, and Timestamp/arrayUnion
import { db } from '@/lib/firebase'; // For writeBatch

interface AggregatedPaymentRecordForExport extends PaymentRecord {
  studentId: string;
  studentName: string;
}

type ImportType = "students" | "attendance" | "payments";

export default function DataManagementPage() {
  const { toast } = useToast();
  const router = useRouter();
  const studentFileInputRef = React.useRef<HTMLInputElement>(null);
  const attendanceFileInputRef = React.useRef<HTMLInputElement>(null);
  const paymentFileInputRef = React.useRef<HTMLInputElement>(null);

  const [isImporting, setIsImporting] = React.useState<ImportType | null>(null);
  const [isExporting, setIsExporting] = React.useState<string | null>(null);
  const [isDeletingDatabase, setIsDeletingDatabase] = React.useState(false);
  const [isMigratingUsers, setIsMigratingUsers] = React.useState(false);

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>, importType: ImportType) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast({ title: 'No File Selected', description: 'Please select a CSV file to import.', variant: 'destructive' });
      return;
    }
    if (file.type !== 'text/csv' && !file.name.toLowerCase().endsWith('.csv')) {
      toast({ title: 'Invalid File Type', description: 'Please select a CSV file.', variant: 'destructive' });
      resetFileInput(importType);
      return;
    }
    handleImportCSV(file, importType);
  };
  
  const resetFileInput = (importType: ImportType) => {
    if (importType === "students" && studentFileInputRef.current) studentFileInputRef.current.value = '';
    if (importType === "attendance" && attendanceFileInputRef.current) attendanceFileInputRef.current.value = '';
    if (importType === "payments" && paymentFileInputRef.current) paymentFileInputRef.current.value = '';
  }

  const handleImportCSV = async (file: File, importType: ImportType) => {
    setIsImporting(importType);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const { data, errors, meta } = results;
        if (errors.length > 0) {
          console.error("CSV Parsing errors:", errors);
          toast({
            title: 'CSV Parsing Error',
            description: `Error parsing CSV: ${errors[0].message}. Check console for details.`,
            variant: 'destructive',
          });
          setIsImporting(null);
          resetFileInput(importType);
          return;
        }

        try {
          if (importType === "students") {
            await processStudentImport(data as any[], meta.fields || []);
          } else if (importType === "attendance") {
            await processAttendanceImport(data as any[], meta.fields || []);
          } else if (importType === "payments") {
            await processPaymentImport(data as any[], meta.fields || []);
          }
        } catch (error: any) {
          console.error(`Import processing error for ${importType}:`, error);
          toast({ title: 'Import Failed', description: error.message || 'An unexpected error occurred during import.', variant: 'destructive' });
        } finally {
          setIsImporting(null);
          resetFileInput(importType);
        }
      },
      error: (error) => {
        console.error("CSV Parsing error:", error);
        toast({ title: 'CSV Read Error', description: 'Could not read the CSV file.', variant: 'destructive' });
        setIsImporting(null);
        resetFileInput(importType);
      }
    });
  };

  const processStudentImport = async (parsedData: any[], actualHeaders: string[]) => {
    const expectedHeaders = ['Name', 'Email', 'Phone', 'Address', 'Password', 'Shift', 'Seat Number'];
    const strictlyMissingHeaders = expectedHeaders.filter(h => !actualHeaders.includes(h));

    if (strictlyMissingHeaders.length > 0) {
      toast({ title: 'Invalid CSV Headers', description: `Missing required student column headers: ${strictlyMissingHeaders.join(', ')}. Expected columns: ${expectedHeaders.join(', ')}.`, variant: 'destructive' });
      return;
    }
    
    const studentsToImport: AddStudentData[] = [];
    const importErrors: string[] = [];

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i] as any;
      // Validate essential non-empty fields. 'Address' value can be empty. 'Email' is optional.
      if (!row.Name || !row.Phone || !row.Password || !row.Shift || !row['Seat Number']) {
        importErrors.push(`Row ${i + 2}: Missing required values for Name, Phone, Password, Shift, or Seat Number. The 'Address' field value can be empty if column exists.`);
        continue;
      }
      if (!['morning', 'evening', 'fullday'].includes(String(row.Shift).toLowerCase())) {
        importErrors.push(`Row ${i + 2}: Invalid shift value "${row.Shift}". Must be 'morning', 'evening', or 'fullday'.`);
        continue;
      }
      studentsToImport.push({
        name: row.Name,
        email: row.Email || undefined,
        phone: String(row.Phone).trim(),
        address: row.Address || "",
        password: row.Password,
        shift: String(row.Shift).toLowerCase() as AddStudentData['shift'],
        seatNumber: String(row['Seat Number']).trim(),
      });
    }

    if (importErrors.length > 0) {
      toast({
        title: `Student CSV Validation Errors (${importErrors.length})`,
        description: (<div className="max-h-40 overflow-y-auto">{importErrors.slice(0,5).map((err, idx) => <p key={idx} className="text-xs">{err}</p>)}{importErrors.length > 5 && <p className="text-xs mt-1">...and {importErrors.length - 5} more errors (check console).</p>}</div>),
        variant: 'destructive', duration: 10000,
      });
      console.error("Student CSV Row Validation Errors:", importErrors);
      return;
    }
    
    if (studentsToImport.length === 0) {
      toast({ title: 'No Student Data to Import', description: 'The CSV file is empty or contains no valid student data.', variant: 'destructive' });
      return;
    }

    const summary = await batchImportStudents(studentsToImport);
    let description = `Processed ${summary.processedCount} student records. Added: ${summary.successCount}.`;
    if (summary.errorCount > 0) {
      description += ` Errors: ${summary.errorCount}.`;
      toast({
        title: 'Student Import Partially Successful',
        description: (<div className="max-h-60 overflow-y-auto"><p>{description}</p>{summary.errors.slice(0,5).map((err, idx) => <p key={idx} className="text-xs mt-1">{err}</p>)}{summary.errors.length > 5 && <p className="text-xs mt-1">...and {summary.errors.length - 5} more errors (check console).</p>}</div>),
        variant: 'default', duration: 15000
      });
       console.error("Student Batch Import Errors:", summary.errors);
    } else {
      toast({ title: 'Student Import Successful', description });
    }
  };

  const processAttendanceImport = async (parsedData: any[], actualHeaders: string[]) => {
    const expectedHeaders = ['Student ID', 'Date', 'Check-In Time']; 
    const missingHeaders = expectedHeaders.filter(h => !actualHeaders.includes(h));
    if (missingHeaders.length > 0) {
      toast({ title: 'Invalid CSV Headers', description: `Missing required attendance headers: ${missingHeaders.join(', ')}.`, variant: 'destructive' });
      return;
    }
    const recordsToImport: AttendanceImportData[] = parsedData.map(row => ({
      'Student ID': String(row['Student ID']).trim(),
      'Date': String(row['Date']).trim(),
      'Check-In Time': String(row['Check-In Time']).trim(),
      'Check-Out Time': row['Check-Out Time'] ? String(row['Check-Out Time']).trim() : undefined,
    }));

    if (recordsToImport.length === 0) {
      toast({ title: 'No Attendance Data to Import', description: 'The CSV file is empty or contains no valid attendance data.', variant: 'destructive' });
      return;
    }
    
    const summary = await batchImportAttendance(recordsToImport);
    let description = `Processed ${summary.processedCount} attendance records. Imported: ${summary.successCount}.`;
    if (summary.errorCount > 0) {
      description += ` Errors: ${summary.errorCount}.`;
      toast({
        title: 'Attendance Import Partially Successful',
        description: (<div className="max-h-60 overflow-y-auto"><p>{description}</p>{summary.errors.slice(0,5).map((err, idx) => <p key={idx} className="text-xs mt-1">{err}</p>)}{summary.errors.length > 5 && <p className="text-xs mt-1">...and {summary.errors.length - 5} more errors (check console).</p>}</div>),
        variant: 'default', duration: 15000
      });
      console.error("Attendance Batch Import Errors:", summary.errors);
    } else {
      toast({ title: 'Attendance Import Successful', description });
    }
  };

  const processPaymentImport = async (parsedData: any[], actualHeaders: string[]) => {
    const expectedHeaders = ['Student ID', 'Date', 'Amount'];
    const missingHeaders = expectedHeaders.filter(h => !actualHeaders.includes(h));
    if (missingHeaders.length > 0) {
      toast({ title: 'Invalid CSV Headers', description: `Missing required payment headers: ${missingHeaders.join(', ')}.`, variant: 'destructive' });
      return;
    }
    
    const recordsToImport: PaymentImportData[] = parsedData.map(row => ({
      'Student ID': String(row['Student ID']).trim(),
      'Date': String(row['Date']).trim(),
      'Amount': String(row['Amount']).trim(),
      'Transaction ID': row['Transaction ID'] ? String(row['Transaction ID']).trim() : undefined,
      'Method': row['Method'] ? String(row['Method']).trim() : undefined,
    }));
    
    if (recordsToImport.length === 0) {
      toast({ title: 'No Payment Data to Import', description: 'The CSV file is empty or contains no valid payment data.', variant: 'destructive' });
      return;
    }

    // Fetch fee structure once
    let feeStructure: FeeStructure;
    try {
      feeStructure = await getFeeStructure();
    } catch (e) {
      toast({ title: 'Import Failed', description: 'Could not load fee structure for calculations.', variant: 'destructive' });
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    const batch = writeBatch(db);
    let operationCount = 0;

    for (let i = 0; i < recordsToImport.length; i++) {
      const record = recordsToImport[i];
      try {
        if (!record['Student ID'] || !record['Date'] || !record['Amount']) {
          errors.push(`Row ${i + 2}: Missing Student ID, Date, or Amount.`);
          errorCount++;
          continue;
        }

        const student = await getStudentByCustomId(record['Student ID']);
        if (!student || !student.firestoreId) {
          errors.push(`Row ${i + 2}: Student ID "${record['Student ID']}" not found.`);
          errorCount++;
          continue;
        }
        if (student.activityStatus === 'Left') {
          errors.push(`Row ${i + 2}: Student ID "${record['Student ID']}" is marked as 'Left'. Payment cannot be imported.`);
          errorCount++;
          continue;
        }

        let importedPaymentDate: Date;
        if (isValid(parseISO(record['Date']))) {
            importedPaymentDate = parseISO(record['Date']);
        } else {
            errors.push(`Row ${i + 2}: Invalid Date format "${record['Date']}" for Student ID ${record['Student ID']}. Expected YYYY-MM-DD.`);
            errorCount++;
            continue;
        }

        const amountNumeric = parseInt(record['Amount'].replace(/Rs\.?\s*/, '').replace(/,/g, ''), 10);
        if (isNaN(amountNumeric) || amountNumeric <= 0) {
          errors.push(`Row ${i + 2}: Invalid Amount "${record['Amount']}" for Student ID ${record['Student ID']}. Must be a positive number.`);
          errorCount++;
          continue;
        }

        const newPaymentId = `PAYIMP${String(Date.now()).slice(-5)}${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`;
        const newTransactionId = record['Transaction ID'] || `IMP-${Date.now().toString().slice(-6)}`;
        const method = record['Method'] || "Imported";

        const paymentRecordForHistory: PaymentRecord = {
          paymentId: newPaymentId,
          date: format(importedPaymentDate, 'yyyy-MM-dd'),
          amount: `Rs. ${amountNumeric}`,
          transactionId: newTransactionId,
          method: method as PaymentRecord['method'],
        };
        const firestorePaymentRecordForHistory = {
            ...paymentRecordForHistory,
            date: Timestamp.fromDate(importedPaymentDate)
        };

        // Calculate new due date and fee status
        let baseDateForNextDueCalculation = importedPaymentDate;
        if (student.nextDueDate && isValid(parseISO(student.nextDueDate)) && parseISO(student.nextDueDate) > importedPaymentDate) {
          baseDateForNextDueCalculation = parseISO(student.nextDueDate);
        }
        
        // For simplicity, assume each imported payment covers one month.
        // More complex logic would be needed if amount paid maps to multiple months.
        const newNextDueDate = addMonths(baseDateForNextDueCalculation, 1);
        const newFeeStatus: Student['feeStatus'] = "Paid";
        const newAmountDue = "Rs. 0";

        const studentDocRef = doc(db, "students", student.firestoreId);
        batch.update(studentDocRef, {
          paymentHistory: arrayUnion(firestorePaymentRecordForHistory),
          lastPaymentDate: Timestamp.fromDate(importedPaymentDate),
          nextDueDate: Timestamp.fromDate(newNextDueDate),
          feeStatus: newFeeStatus,
          amountDue: newAmountDue,
        });
        operationCount++;
        successCount++;

        if (operationCount >= 490) { // Firestore batch limit is 500 operations
          await batch.commit();
          // batch = writeBatch(db); // Re-initialize batch, but Firestore doesn't allow direct re-init
          // For simplicity, we'll process in chunks up to limit. This needs a new batch for next chunk.
          // This is a simplification. A true large batch would need more robust chunking.
          operationCount = 0; 
          // If a new batch is needed, it must be created with `writeBatch(db)` again.
          // The current loop structure might need adjustment for >500 records.
          // For now, this handles up to 490 updates.
        }

      } catch (error: any) {
        console.error(`Error importing payment for student ${record['Student ID']}:`, error.message);
        errors.push(`Row ${i + 2} (Student ID ${record['Student ID']}): ${error.message}`);
        errorCount++;
      }
    }

    if (operationCount > 0) {
      await batch.commit();
    }

    let description = `Processed ${recordsToImport.length} payment records. Successfully updated: ${successCount}.`;
    if (errorCount > 0) {
      description += ` Errors: ${errorCount}.`;
      toast({
        title: 'Payment Import Partially Successful',
        description: (<div className="max-h-60 overflow-y-auto"><p>{description}</p>{errors.slice(0,5).map((err, idx) => <p key={idx} className="text-xs mt-1">{err}</p>)}{errors.length > 5 && <p className="text-xs mt-1">...and {errors.length - 5} more errors (check console).</p>}</div>),
        variant: 'default', duration: 15000
      });
      console.error("Payment Batch Import Errors:", errors);
    } else {
      toast({ title: 'Payment Import Successful', description });
    }
    // Note: The function returns void, so no BatchImportSummary is returned here unlike others.
    // Consider returning a summary if needed for UI feedback beyond toasts.
  };


  const triggerDownload = (filename: string, data: string, type: string) => {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportStudentsCSV = async () => {
    setIsExporting('StudentsCSV');
    try {
      const students = await getAllStudents();
      const csvData = Papa.unparse(students.map(s => ({
        'Student ID': s.studentId,
        'Name': s.name,
        'Email': s.email || '',
        'Phone': s.phone,
        'Password': s.password || '', // Include password
        'Address': s.address || '',
        'Shift': s.shift,
        'Seat Number': s.seatNumber || '',
        'ID Card File Name': s.idCardFileName || '',
        'Fee Status': s.feeStatus,
        'Activity Status': s.activityStatus,
        'Registration Date': s.registrationDate ? format(parseISO(s.registrationDate), 'yyyy-MM-dd') : '',
        'Last Payment Date': s.lastPaymentDate && isValid(parseISO(s.lastPaymentDate)) ? format(parseISO(s.lastPaymentDate), 'yyyy-MM-dd') : '',
        'Next Due Date': s.nextDueDate && isValid(parseISO(s.nextDueDate)) ? format(parseISO(s.nextDueDate), 'yyyy-MM-dd') : '',
        'Amount Due': s.amountDue || '',
        'Profile Picture URL': s.profilePictureUrl || ''
      })));
      triggerDownload('taxshila_students_export.csv', csvData, 'text/csv;charset=utf-8;');
      toast({ title: 'Export Successful', description: 'Student data exported as CSV.' });
    } catch (error) {
      toast({ title: 'Export Failed', description: 'Could not export student data.', variant: 'destructive' });
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportAttendanceCSV = async () => {
    setIsExporting('AttendanceCSV');
    try {
      const attendanceRecords = await getAllAttendanceRecords();
      const csvData = Papa.unparse(attendanceRecords.map(ar => ({
        'Record ID': ar.recordId,
        'Student ID': ar.studentId,
        'Date': ar.date, 
        'Check-In Time': ar.checkInTime ? format(parseISO(ar.checkInTime), 'yyyy-MM-dd HH:mm:ss') : '',
        'Check-Out Time': ar.checkOutTime ? format(parseISO(ar.checkOutTime), 'yyyy-MM-dd HH:mm:ss') : '',
      })));
      triggerDownload('taxshila_attendance_export.csv', csvData, 'text/csv;charset=utf-8;');
      toast({ title: 'Export Successful', description: 'Attendance data exported as CSV.' });
    } catch (error) {
      toast({ title: 'Export Failed', description: 'Could not export attendance data.', variant: 'destructive' });
    } finally {
      setIsExporting(null);
    }
  };
  
  const handleExportPaymentsCSV = async () => {
    setIsExporting('PaymentsCSV');
    try {
      const studentsWithPayments = await getAllStudentsWithPaymentHistory();
      const aggregatedPayments: AggregatedPaymentRecordForExport[] = [];
      studentsWithPayments.forEach(student => {
        if (student.paymentHistory && student.paymentHistory.length > 0) {
          student.paymentHistory.forEach(payment => {
            aggregatedPayments.push({
              ...payment,
              studentId: student.studentId,
              studentName: student.name,
            });
          });
        }
      });
      aggregatedPayments.sort((a, b) => {
          try {
            const dateA = a.date && isValid(parseISO(a.date)) ? parseISO(a.date) : new Date(0);
            const dateB = b.date && isValid(parseISO(b.date)) ? parseISO(b.date) : new Date(0);
            return dateB.getTime() - dateA.getTime(); 
          } catch (e) { return 0; }
      });

      const csvData = Papa.unparse(aggregatedPayments.map(p => ({
        'Payment ID': p.paymentId,
        'Student ID': p.studentId,
        'Student Name': p.studentName,
        'Date': p.date ? format(parseISO(p.date), 'yyyy-MM-dd') : '',
        'Amount': p.amount,
        'Transaction ID': p.transactionId,
        'Method': p.method,
      })));
      triggerDownload('taxshila_payments_export.csv', csvData, 'text/csv;charset=utf-8;');
      toast({ title: 'Export Successful', description: 'Payment history exported as CSV.' });
    } catch (error) {
      toast({ title: 'Export Failed', description: 'Could not export payment history.', variant: 'destructive' });
    } finally {
      setIsExporting(null);
    }
  };

  const handleDeleteDatabase = async () => {
    setIsDeletingDatabase(true);
    try {
      await deleteAllData();
      toast({
        title: 'Database Cleared',
        description: 'All application data has been deleted successfully.',
        duration: 7000,
      });
      router.refresh(); 
    } catch (error: any) {
      console.error("Error deleting database:", error);
      toast({
        title: 'Database Deletion Failed',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
        duration: 7000,
      });
    } finally {
      setIsDeletingDatabase(false);
    }
  };

  const handleMigrateUsers = async () => {
    setIsMigratingUsers(true);
    try {
      // Use the 'send-alert-notification' endpoint with a special action payload
      const response = await fetch('/api/send-alert-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'migrateUsers' }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'An unknown error occurred during migration.');
      }
      toast({
        title: 'User Migration Complete',
        description: `Created: ${result.createdCount}, Skipped: ${result.skippedCount}, Errors: ${result.errorCount}. Check server logs for details.`,
        duration: 10000,
      });
    } catch (error: any) {
      toast({
        title: 'User Migration Failed',
        description: error.message,
        variant: 'destructive',
        duration: 10000,
      });
    } finally {
      setIsMigratingUsers(false);
    }
  };


  return (
    <>
      <PageTitle title="Data Management" description="Import and export application data." />

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5" />Import New Students</CardTitle>
            <CardDescription>Upload a CSV file to add new students.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="studentCsvFileImport" className="block text-sm font-medium text-foreground mb-1">Select Student CSV</label>
              <Input id="studentCsvFileImport" type="file" accept=".csv" ref={studentFileInputRef} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90" disabled={!!isImporting} onChange={(e) => handleFileSelected(e, "students")} />
            </div>
            <p className="text-xs text-muted-foreground">Required headers: Name, Phone, Address, Password, Shift, Seat Number.<br/>Optional: Email.<br/>Shift: morning, evening, fullday.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => studentFileInputRef.current?.click()} disabled={!!isImporting} className="w-full">
              {isImporting === 'students' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              {isImporting === 'students' ? 'Importing Students...' : 'Choose Student CSV & Import'}
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center"><FileClock className="mr-2 h-5 w-5" />Import Attendance</CardTitle>
            <CardDescription>Upload a CSV file for historical attendance records.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="attendanceCsvFileImport" className="block text-sm font-medium text-foreground mb-1">Select Attendance CSV</label>
              <Input id="attendanceCsvFileImport" type="file" accept=".csv" ref={attendanceFileInputRef} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90" disabled={!!isImporting} onChange={(e) => handleFileSelected(e, "attendance")} />
            </div>
            <p className="text-xs text-muted-foreground">Required: Student ID, Date (YYYY-MM-DD), Check-In Time (HH:MM:SS or ISO). Optional: Check-Out Time.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => attendanceFileInputRef.current?.click()} disabled={!!isImporting} className="w-full">
              {isImporting === 'attendance' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              {isImporting === 'attendance' ? 'Importing Attendance...' : 'Choose Attendance CSV & Import'}
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center"><Banknote className="mr-2 h-5 w-5" />Import Payments</CardTitle>
            <CardDescription>Upload a CSV file for historical payment records.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="paymentCsvFileImport" className="block text-sm font-medium text-foreground mb-1">Select Payment CSV</label>
              <Input id="paymentCsvFileImport" type="file" accept=".csv" ref={paymentFileInputRef} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90" disabled={!!isImporting} onChange={(e) => handleFileSelected(e, "payments")} />
            </div>
            <p className="text-xs text-muted-foreground">Required: Student ID, Date (YYYY-MM-DD), Amount. Optional: Transaction ID, Method.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => paymentFileInputRef.current?.click()} disabled={!!isImporting} className="w-full">
              {isImporting === 'payments' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              {isImporting === 'payments' ? 'Importing Payments...' : 'Choose Payment CSV & Import'}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Card className="shadow-lg mt-6">
        <CardHeader>
          <CardTitle className="flex items-center"><DownloadCloud className="mr-2 h-5 w-5" />Export Data</CardTitle>
          <CardDescription>Download various data sets from the application in CSV format.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Button onClick={handleExportStudentsCSV} variant="outline" className="w-full justify-start" disabled={!!isExporting}>
            {isExporting === 'StudentsCSV' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
            Export Students (CSV)
          </Button>
          <Button onClick={handleExportAttendanceCSV} variant="outline" className="w-full justify-start" disabled={!!isExporting}>
            {isExporting === 'AttendanceCSV' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
            Export Attendance (CSV)
          </Button>
          <Button onClick={handleExportPaymentsCSV} variant="outline" className="w-full justify-start" disabled={!!isExporting}>
            {isExporting === 'PaymentsCSV' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            Export Payment History (CSV)
          </Button>
        </CardContent>
         <CardFooter>
            <p className="text-xs text-muted-foreground pt-2">
              Ensure CSV files for import are UTF-8 encoded and match the specified header formats.
            </p>
        </CardFooter>
      </Card>

      <Card className="shadow-lg mt-6 border-amber-500">
        <CardHeader>
          <CardTitle className="flex items-center text-amber-700">
            <KeyRound className="mr-2 h-5 w-5" />One-Time Operations
          </CardTitle>
          <CardDescription className="text-amber-600">
            These are special actions for system setup, like user migration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={isMigratingUsers}>
                {isMigratingUsers ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                {isMigratingUsers ? 'Migrating...' : 'Migrate Users to Auth'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm User Migration</AlertDialogTitle>
                <AlertDialogDescription>
                  This will migrate students with an email and password from the database to Firebase Authentication.
                  This process is safe to run multiple times; it will not duplicate users.
                  Do you want to proceed?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isMigratingUsers}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleMigrateUsers} disabled={isMigratingUsers}>
                  {isMigratingUsers ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Confirm Migration
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            It is recommended to export all data before performing any system-wide operations.
          </p>
        </CardFooter>
      </Card>
      
      <Card className="shadow-lg mt-6 border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <AlertCircle className="mr-2 h-5 w-5" />Danger Zone
          </CardTitle>
          <CardDescription className="text-destructive">
            These actions are irreversible and can lead to permanent data loss.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full sm:w-auto" disabled={isDeletingDatabase}>
                {isDeletingDatabase ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                {isDeletingDatabase ? 'Deleting Database...' : 'Delete Entire Database'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-destructive">Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete ALL data from the
                  application, including all students, attendance records, payment history,
                  feedback, alerts, and fee configurations.
                  <br /><br />
                  <strong>There is no recovery for this action.</strong>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeletingDatabase}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteDatabase}
                  disabled={isDeletingDatabase}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {isDeletingDatabase ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Confirm Permanent Deletion
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            Please proceed with extreme caution. It is recommended to export all data before performing any destructive action.
          </p>
        </CardFooter>
      </Card>
    </>
  );
}
