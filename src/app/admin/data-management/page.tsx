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
import { PageTitle } from '@/components/shared/page-title';
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Download, Upload, ShieldAlert, AlertTriangle, DatabaseZap } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Papa from 'papaparse'; // Using a robust CSV parser

export default function DataManagementPage() {
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [isMigrating, setIsMigrating] = React.useState(false);
    const [isExporting, setIsExporting] = React.useState(false);
    const [isImporting, setIsImporting] = React.useState(false);
    const [activeImportType, setActiveImportType] = React.useState<string | null>(null);

    const [deletePassword, setDeletePassword] = React.useState("");
    
    const [importFile, setImportFile] = React.useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) setImportFile(e.target.files[0]);
    };

    const handleUserMigration = async () => {
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

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const response = await fetch('/api/admin/delete-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: deletePassword }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Deletion failed.');
            toast({ title: "Data Deleted", description: "All application data has been permanently deleted." });
        } catch (error: any) {
            toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsDeleting(false);
            setDeletePassword("");
        }
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
                    Import {label}
                </Button>
            </div>
        </div>
    );


    return (
        <>
            <PageTitle title="Data Management" description="Manage auth records, import, export, and delete system data." />
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center"><DatabaseZap className="mr-2" />Auth & Database Sync</CardTitle>
                        <CardDescription>Create or update user auth accounts for all students in the database. Fixes login issues for students without a valid auth record.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleUserMigration} disabled={isMigrating}>
                            {isMigrating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sync Student Auth Data"}
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
                            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Export Data as .zip"}
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

                <Card className="border-red-500/50 md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center text-red-600"><AlertTriangle className="mr-2" />Danger Zone</CardTitle>
                        <CardDescription>This is an irreversible action. Please proceed with extreme caution.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive">Delete All Application Data</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="flex items-center"><ShieldAlert className="mr-2"/>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete all data, including students, attendance, and payments. This cannot be undone. Enter the admin password to confirm.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="py-4">
                                    <Label htmlFor="delete-password">Admin Password</Label>
                                    <Input
                                        id="delete-password"
                                        type="password"
                                        value={deletePassword}
                                        onChange={(e) => setDeletePassword(e.target.value)}
                                        placeholder="Enter admin password to enable deletion"
                                    />
                                </div>
                                <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setDeletePassword("")}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleDelete}
                                        disabled={!deletePassword || isDeleting}
                                        className="bg-red-600 hover:bg-red-700"
                                    >
                                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirm Deletion"}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
