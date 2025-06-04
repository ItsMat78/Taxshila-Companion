
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
import { UploadCloud, DownloadCloud, FileText, FileSpreadsheet } from 'lucide-react';

export default function DataManagementPage() {
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportCSV = () => {
    if (fileInputRef.current?.files && fileInputRef.current.files.length > 0) {
      const fileName = fileInputRef.current.files[0].name;
      // Placeholder for actual import logic
      console.log('Importing CSV file:', fileName);
      toast({
        title: 'Import Started (Placeholder)',
        description: `Simulating import for ${fileName}.`,
      });
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      toast({
        title: 'No File Selected',
        description: 'Please select a CSV file to import.',
        variant: 'destructive',
      });
    }
  };

  const handleExport = (type: string, format: string) => {
    // Placeholder for actual export logic
    console.log(`Exporting ${type} as ${format}`);
    toast({
      title: 'Export Started (Placeholder)',
      description: `Simulating export of ${type} data as ${format.toUpperCase()}.`,
    });
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
              />
            </div>
             <p className="text-xs text-muted-foreground">
              Supported imports: Student List, Attendance Records.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={handleImportCSV}>
              <UploadCloud className="mr-2 h-4 w-4" />
              Import CSV
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
            <Button onClick={() => handleExport('Students', 'CSV')} variant="outline" className="w-full justify-start">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export Students (CSV)
            </Button>
            <Button onClick={() => handleExport('Attendance', 'CSV')} variant="outline" className="w-full justify-start">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export Attendance (CSV)
            </Button>
            <Button onClick={() => handleExport('Payments', 'PDF')} variant="outline" className="w-full justify-start">
              <FileText className="mr-2 h-4 w-4" />
              Export Payments (PDF)
            </Button>
             <p className="text-xs text-muted-foreground pt-2">
              More export options will be available soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
