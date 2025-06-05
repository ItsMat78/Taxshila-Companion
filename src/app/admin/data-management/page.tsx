
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
import { UploadCloud, DownloadCloud, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';

export default function DataManagementPage() {
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState<string | null>(null);

  const handleImportCSV = () => {
    if (fileInputRef.current?.files && fileInputRef.current.files.length > 0) {
      setIsImporting(true);
      const file = fileInputRef.current.files[0];
      const fileName = file.name;
      
      // Simulate processing delay
      setTimeout(() => {
        let importMessage = `Simulating import for ${fileName}.`;
        if (fileName.toLowerCase().includes("student")) {
          const randomCount = Math.floor(Math.random() * 50) + 10; // 10-59 students
          importMessage = `Simulating import of ${randomCount} student records from ${fileName}.`;
        } else if (fileName.toLowerCase().includes("attendance")) {
          const randomCount = Math.floor(Math.random() * 200) + 50; // 50-249 records
          importMessage = `Simulating import of ${randomCount} attendance records from ${fileName}.`;
        } else {
          importMessage = `Simulating import for ${fileName}. Data type unrecognized based on filename.`;
        }

        toast({
          title: 'Import Process (Simulated)',
          description: importMessage,
        });
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setIsImporting(false);
      }, 1500);

    } else {
      toast({
        title: 'No File Selected',
        description: 'Please select a CSV file to import.',
        variant: 'destructive',
      });
    }
  };

  const handleExport = (type: string, format: 'CSV' | 'PDF') => {
    setIsExporting(type + format);
    // Simulate processing delay
    setTimeout(() => {
      let exportMessage = `Simulating export of ${type} data as ${format.toUpperCase()}.`;
      let consoleData: string | null = null;

      if (format === 'CSV') {
        if (type === 'Students') {
          consoleData = "Student ID,Name,Email,Phone,Shift,Seat Number,Fee Status,Activity Status,Registration Date\nTSMEM001,Priya Sharma,priya.s@example.com,9123456780,morning,12,Paid,Active,2023-10-01\nTSMEM002,Amit Kumar,amit.k@example.net,9123456781,evening,34,Due,Active,2023-11-15";
          exportMessage = `Student List exported as CSV (simulated - check console for sample).`;
        } else if (type === 'Attendance') {
          consoleData = "Record ID,Student ID,Date,Check-In Time,Check-Out Time\nAR001,TSMEM001,2024-01-15,09:00:00,17:00:00\nAR002,TSMEM002,2024-01-15,15:30:00,21:00:00";
          exportMessage = `Attendance Records exported as CSV (simulated - check console for sample).`;
        }
      } else if (format === 'PDF' && type === 'Payments') {
        exportMessage = `Payments Report generated as PDF (simulated - PDF generation not implemented in this prototype).`;
      }
      
      toast({
        title: 'Export Process (Simulated)',
        description: exportMessage,
      });

      if (consoleData) {
        console.log(`--- Sample ${type} CSV Data ---`);
        console.log(consoleData);
        console.log(`--- End Sample ${type} CSV Data ---`);
      }
      setIsExporting(null);
    }, 1500);
  };

  return (
    <>
      <PageTitle title="Data Management" description="Import and export application data." />

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <UploadCloud className="mr-2 h-5 w-5" />
              Import Data
            </CardTitle>
            <CardDescription>Upload data from CSV files. Ensure the file format matches the required schema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="csvFile" className="block text-sm font-medium text-foreground mb-1">
                Select CSV File
              </label>
              <Input
                id="csvFile"
                type="file"
                accept=".csv"
                ref={fileInputRef}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                disabled={isImporting}
              />
            </div>
             <p className="text-xs text-muted-foreground">
              Supported imports (simulated): Student List, Attendance Records. File name should indicate content (e.g., 'students.csv').
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={handleImportCSV} disabled={isImporting}>
              {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              {isImporting ? 'Importing...' : 'Import CSV'}
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <DownloadCloud className="mr-2 h-5 w-5" />
              Export Data
            </CardTitle>
            <CardDescription>Download various data sets from the application in CSV or PDF format.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={() => handleExport('Students', 'CSV')} 
              variant="outline" 
              className="w-full justify-start"
              disabled={!!isExporting}
            >
              {isExporting === 'StudentsCSV' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
              Export Students (CSV)
            </Button>
            <Button 
              onClick={() => handleExport('Attendance', 'CSV')} 
              variant="outline" 
              className="w-full justify-start"
              disabled={!!isExporting}
            >
              {isExporting === 'AttendanceCSV' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
              Export Attendance (CSV)
            </Button>
            <Button 
              onClick={() => handleExport('Payments', 'PDF')} 
              variant="outline" 
              className="w-full justify-start"
              disabled={!!isExporting}
            >
              {isExporting === 'PaymentsPDF' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              Export Payments (PDF)
            </Button>
             <p className="text-xs text-muted-foreground pt-2">
              More export options will be available soon. Exports are simulated for this prototype.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
