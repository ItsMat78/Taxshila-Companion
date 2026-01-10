
"use client";

import * as React from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageTitle } from '@/components/shared/page-title';
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Download, Upload, DatabaseZap } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Papa from 'papaparse'; // Using a robust CSV parser
import { useAuth } from '@/contexts/auth-context';

export default function DataManagementPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isMigrating, setIsMigrating] = React.useState(false);
    const [isExporting, setIsExporting] = React.useState(false);
    const [isImporting, setIsImporting] = React.useState(false);
    const [activeImportType, setActiveImportType] = React.useState<string | null>(null);
    
    const [importFile, setImportFile] = React.useState<File | null>(null);

    const isReviewer = user?.email === 'guest-admin@taxshila-auth.com';

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) setImportFile(e.target.files[0]);
    };

    const handleReviewerAction = (actionName: string) => {
      toast({
        title: "Simulated Success!",
        description: `As a reviewer, the '${actionName}' action was simulated. No data was changed.`,
      });
    }

    const handleUserMigration = async () => {
      if (isReviewer) {
        handleReviewerAction("Sync Student Auth Data");
        return;
      }
      setIsMigrating(true);
      try {
          const response = await fetch('/api/admin/migrate-users', { method: 'POST' });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Migration failed.');
          toast({
              title: "User Migration Complete",
              description: `Processed ${result.processedCount} students. ${result.createdCount} created, ${result.updatedCount} updated. Check console for ${result.errorCount} errors.`,
          });
          if (result.errors && result.errors.length > 0) console.error("Migration errors:", result.errors);
      } catch (error: any) {
          toast({ title: "Migration Failed", description: error.message, variant: "destructive" });
      } finally {
          setIsMigrating(false);
      }
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const response = await fetch('/api/admin/export-data');
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to export data.');
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `taxshila-backup-${new Date().toISOString().split('T')[0]}.zip`;
            document.body.appendChild(a);
a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast({ title: "Export Successful", description: "Your data has been downloaded as a .zip file." });
        } catch (error: any) {
            toast({ title: "Export Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsExporting(false);
        }
    };

    const handleImport = async (type: 'students' | 'attendance' | 'payments') => {
        if (isReviewer) {
          handleReviewerAction(`Import ${type}`);
          return;
        }

        setIsImporting(true);
        setActiveImportType(type);
        if (!importFile) {
            toast({ title: "No file selected", description: "Please select a file to import.", variant: "destructive" });
            setIsImporting(false);
            setActiveImportType(null);
            return;
        }

        Papa.parse(importFile, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const response = await fetch('/api/admin/import-data', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type, data: results.data }),
                    });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.error);
                    toast({ title: `Import Successful: ${type}`, description: result.message });
                } catch (error: any) {
                    toast({ title: `Import Failed: ${type}`, description: error.message, variant: "destructive" });
                } finally {
                    setIsImporting(false);
                    setActiveImportType(null);
                    setImportFile(null); 
                    // Reset file input
                    const fileInput = document.getElementById('import-file') as HTMLInputElement;
                    if(fileInput) fileInput.value = "";
                }
            },
            error: (error: any) => {
                toast({ title: "CSV Parsing Error", description: error.message, variant: "destructive" });
                setIsImporting(false);
                setActiveImportType(null);
            }
        });
    };
    
    const renderImportSection = (type: 'students' | 'attendance' | 'payments', label: string) => (
        <div className="space-y-2">
            <Label htmlFor="import-file">{label} (.csv)</Label>
            <div className="flex space-x-2">
                <Input id="import-file" type="file" accept=".csv" onChange={handleFileChange} className="max-w-xs" />
                <Button 
                    onClick={() => handleImport(type)} 
                    disabled={isImporting || !importFile}
                >
                    {(isImporting && activeImportType === type) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Import {label} {isReviewer && '(For Reviewer)'}
                </Button>
            </div>
        </div>
    );


    return (
        <>
            <PageTitle title="Data Management" description="Manage auth records, import, and export system data." />
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center"><DatabaseZap className="mr-2" />Auth & Database Sync</CardTitle>
                        <CardDescription>Create or update user auth accounts for all students in the database. Fixes login issues for students without a valid auth record.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleUserMigration} disabled={isMigrating}>
                            {isMigrating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isReviewer ? "Sync Data (For Reviewer)" : "Sync Student Auth Data"}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center"><Download className="mr-2" />Export All Data</CardTitle>
                        <CardDescription>Download a zip file containing all students, attendance, payments, feedback, and auth data in CSV format.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleExport} disabled={isExporting}>
                            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Export Data as .zip
                        </Button>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center"><Upload className="mr-2" />Import Data from CSV</CardTitle>
                        <CardDescription>Import data from a CSV file. The system will update existing records or create new ones based on the Student ID.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="students">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="students">Students</TabsTrigger>
                                <TabsTrigger value="attendance">Attendance</TabsTrigger>
                                <TabsTrigger value="payments">Payments</TabsTrigger>
                            </TabsList>
                            <div className="pt-6">
                                <TabsContent value="students">{renderImportSection('students', 'Student Data')}</TabsContent>
                                <TabsContent value="attendance">{renderImportSection('attendance', 'Attendance Records')}</TabsContent>
                                <TabsContent value="payments">{renderImportSection('payments', 'Payment History')}</TabsContent>
                            </div>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
