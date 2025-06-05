
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
import { UploadCloud, DownloadCloud, FileText, FileSpreadsheet, Loader2, Users, FileClock, Banknote, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
import { 
  getAllStudents, 
  batchImportStudents, 
  AddStudentData, 
  getAllAttendanceRecords, 
  getAllStudentsWithPaymentHistory,
  batchImportAttendance,
  batchImportPayments
} from '@/services/student-service';
import type { Student, AttendanceRecord, PaymentRecord, AttendanceImportData, PaymentImportData } from '@/types/student';
import { format, parseISO, isValid } from 'date-fns';

interface AggregatedPaymentRecordForExport extends PaymentRecord {
  studentId: string;
  studentName: string;
}

type ImportType = "students" | "attendance" | "payments";

export default function DataManagementPage() {
  const { toast } = useToast();
  const studentFileInputRef = React.useRef<HTMLInputElement>(null);
  const attendanceFileInputRef = React.useRef<HTMLInputElement>(null);
  const paymentFileInputRef = React.useRef<HTMLInputElement>(null);

  const [isImporting, setIsImporting] = React.useState<ImportType | null>(null);
  const [isExporting, setIsExporting] = React.useState<string | null>(null);

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
    const expectedHeaders = ['Name', 'Email', 'Phone', 'Password', 'Shift', 'Seat Number'];
    const missingHeaders = expectedHeaders.filter(h => !actualHeaders.includes(h) && (h !== 'Email')); // Email is optional
    const strictlyMissingHeaders = expectedHeaders.filter(h => h !== 'Email' && !actualHeaders.includes(h));


    if (strictlyMissingHeaders.length > 0) {
      toast({ title: 'Invalid CSV Headers', description: `Missing required student headers: ${strictlyMissingHeaders.join(', ')}.`, variant: 'destructive' });
      return;
    }
    
    const studentsToImport: AddStudentData[] = [];
    const importErrors: string[] = [];

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i] as any;
      if (!row.Name || !row.Phone || !row.Password || !row.Shift || !row['Seat Number']) {
        importErrors.push(`Row ${i + 2}: Missing required fields (Name, Phone, Password, Shift, Seat Number).`);
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
    const expectedHeaders = ['Student ID', 'Date', 'Check-In Time']; // Check-Out Time is optional
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
    const expectedHeaders = ['Student ID', 'Date', 'Amount']; // Transaction ID and Method are optional
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

    const summary = await batchImportPayments(recordsToImport);
    let description = `Processed ${summary.processedCount} payment records. Imported: ${summary.successCount}.`;
    if (summary.errorCount > 0) {
      description += ` Errors: ${summary.errorCount}.`;
      toast({
        title: 'Payment Import Partially Successful',
        description: (<div className="max-h-60 overflow-y-auto"><p>{description}</p>{summary.errors.slice(0,5).map((err, idx) => <p key={idx} className="text-xs mt-1">{err}</p>)}{summary.errors.length > 5 && <p className="text-xs mt-1">...and {summary.errors.length - 5} more errors (check console).</p>}</div>),
        variant: 'default', duration: 15000
      });
      console.error("Payment Batch Import Errors:", summary.errors);
    } else {
      toast({ title: 'Payment Import Successful', description });
    }
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
        'Date': ar.date, // Already YYYY-MM-DD
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


  return (
    <>
      <PageTitle title="Data Management" description="Import and export application data." />

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        {/* Student Import Card */}
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
            <p className="text-xs text-muted-foreground">Required headers: Name, Phone, Password, Shift, Seat Number.<br/>Optional: Email.<br/>Shift: morning, evening, fullday.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => studentFileInputRef.current?.click()} disabled={!!isImporting} className="w-full">
              {isImporting === 'students' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              {isImporting === 'students' ? 'Importing Students...' : 'Choose Student CSV & Import'}
            </Button>
          </CardFooter>
        </Card>

        {/* Attendance Import Card */}
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

        {/* Payment Import Card */}
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
    </>
  );
}
