"use client";

import React, { useState } from 'react';
import { PageTitle } from '@/components/shared/page-title';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';

// Define the structure for the summary report
interface MigrationSummary {
    updated: number;
    skipped: number;
    errors: number;
    errorDetails: string[];
}

// This is the React Component that should be the default export
const DataManagementPage = () => {
  const { toast } = useToast();
  const [isMigratingUsers, setIsMigratingUsers] = useState(false);
  const [migrationSummary, setMigrationSummary] = useState<MigrationSummary | null>(null);
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);

  // This function CALLS the backend API
  const handleUserMigration = async () => {
    setIsMigratingUsers(true);
    setMigrationSummary(null);
    try {
      const response = await fetch('/api/admin/migrate-users', {
        method: 'POST',
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to get a valid response from the migration server.');
      }

      setMigrationSummary(result.summary);
      setIsSummaryDialogOpen(true);
    } catch (error: any) {
      toast({ title: "User Migration Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsMigratingUsers(false);
    }
  };

  return (
    <>
      <PageTitle title="Data Management" description="Tools for maintaining system data integrity." />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Account Migration</CardTitle>
            <CardDescription>Fixes login issues for users registered without an email by assigning them a proxy email.</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={isMigratingUsers}>
                  {isMigratingUsers ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Start User Migration"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm User Migration</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will scan all student records and update their associated authentication accounts. Are you sure?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleUserMigration}>Continue</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
      
      {/* Dialog to display the migration summary */}
      <Dialog open={isSummaryDialogOpen} onOpenChange={setIsSummaryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Migration Complete</DialogTitle>
            <DialogDescription>The user account migration process has finished. Here is the summary:</DialogDescription>
          </DialogHeader>
          {migrationSummary && (
            <div className="space-y-4 py-4">
                <p><strong>Accounts Updated:</strong> {migrationSummary.updated}</p>
                <p><strong>Accounts Skipped:</strong> {migrationSummary.skipped}</p>
                <p><strong>Errors Encountered:</strong> {migrationSummary.errors}</p>
                {migrationSummary.errors > 0 && (
                    <div className="p-2 border rounded-md bg-destructive/10 text-destructive text-sm">
                        <h4 className="font-bold mb-2">Error Details:</h4>
                        <ul className="list-disc pl-5 space-y-1">
                            {migrationSummary.errorDetails.map((err, i) => <li key={i}>{err}</li>)}
                        </ul>
                    </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DataManagementPage;
