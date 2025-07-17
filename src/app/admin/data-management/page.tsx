
"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, UserCheck, UserX, SkipForward, AlertTriangle, Trash2, ShieldCheck } from "lucide-react";
import { PageTitle } from "@/components/shared/page-title";

interface MigrationSummary {
    created: number;
    updated: number;
    disabled: number;
    skipped: number;
    errors: number;
    errorDetails: string[];
}

interface Admin {
    id: string;
    email: string;
}

const DataManagementPage = () => {
  const { toast } = useToast();
  const [isMigratingUsers, setIsMigratingUsers] = useState(false);
  const [migrationSummary, setMigrationSummary] = useState<MigrationSummary | null>(null);
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);

  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);

  const fetchAdmins = useCallback(async () => {
    setIsLoadingAdmins(true);
    try {
      const response = await fetch('/api/admins');
      const data = await response.json();
      if (data.success) {
        setAdmins(data.admins);
      } else {
        toast({ title: "Error", description: "Could not load admin list.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to connect to the server.", variant: "destructive" });
    } finally {
      setIsLoadingAdmins(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail) return;
    setIsAddingAdmin(true);
    try {
        const response = await fetch('/api/admins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: newAdminEmail }),
        });
        const result = await response.json();
        if (result.success) {
            toast({ title: "Success", description: "Admin added successfully." });
            setNewAdminEmail("");
            fetchAdmins(); // Refresh the list
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    } catch (error) {
        toast({ title: "Error", description: "Failed to add admin.", variant: "destructive" });
    } finally {
        setIsAddingAdmin(false);
    }
  };

  const handleRemoveAdmin = async (adminId: string) => {
    try {
        const response = await fetch('/api/admins', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: adminId }),
        });
        const result = await response.json();
        if (result.success) {
            toast({ title: "Success", description: "Admin removed successfully." });
            fetchAdmins(); // Refresh the list
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    } catch (error) {
        toast({ title: "Error", description: "Failed to remove admin.", variant: "destructive" });
    }
  };

  const handleMigrateUsers = async () => {
    setIsMigratingUsers(true);
    setMigrationSummary(null);
    try {
      const response = await fetch("/api/send-alert-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "migrateUsers" }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "An unknown error occurred during migration.");
      }
      
      const summary: MigrationSummary = {
        created: result.created || 0,
        updated: result.updated || 0,
        disabled: result.disabled || 0,
        skipped: result.skipped || 0,
        errors: result.errors || 0,
        errorDetails: result.errorDetails || [],
      };
      
      setMigrationSummary(summary);
      setIsSummaryDialogOpen(true);
    } catch (error: any) {
      toast({ title: "User Migration Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsMigratingUsers(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <PageTitle title="Data Management" />
      <div className="grid gap-6 md:grid-cols-2">
        
        <Card>
          <CardHeader>
            <CardTitle>Admin Management</CardTitle>
            <CardDescription>Add or remove administrators. Admins are protected from the migration script.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddAdmin} className="flex items-center gap-2 mb-4">
              <Input
                type="email"
                placeholder="new.admin@example.com"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                disabled={isAddingAdmin}
              />
              <Button type="submit" disabled={isAddingAdmin || !newAdminEmail}>
                {isAddingAdmin ? "Adding..." : "Add Admin"}
              </Button>
            </form>
            <div className="space-y-2">
                {isLoadingAdmins ? (
                    Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
                ) : admins.length > 0 ? (
                    admins.map(admin => (
                        <div key={admin.id} className="flex items-center justify-between rounded-md border p-2">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-green-500" />
                                <span className="text-sm">{admin.email}</span>
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                 <Button variant="ghost" size="icon" className="text-red-500">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Remove Admin</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Are you sure you want to remove <span className="font-bold">{admin.email}</span> as an admin?
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleRemoveAdmin(admin.id)} className="bg-red-600 hover:bg-red-700">
                                        Remove
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground text-center">No admins found.</p>
                )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Account Migration</CardTitle>
            <CardDescription>Synchronize the student database with Firebase Authentication.</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={isMigratingUsers}>
                  {isMigratingUsers ? "Migration in Progress..." : "Start User Migration"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Migration</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure? This will create, update, and disable user accounts based on the student roster.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleMigrateUsers}>Proceed</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

      </div>

      <AlertDialog open={isSummaryDialogOpen} onOpenChange={setIsSummaryDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Migration Summary</AlertDialogTitle>
            <AlertDialogDescription>The process has completed. Here is the summary.</AlertDialogDescription>
          </AlertDialogHeader>
          {migrationSummary ? (
             <div className="mt-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2"><UserPlus className="h-5 w-5 text-green-500" /><span><span className="font-bold">{migrationSummary.created}</span> Users Created</span></div>
                    <div className="flex items-center space-x-2"><UserCheck className="h-5 w-5 text-blue-500" /><span><span className="font-bold">{migrationSummary.updated}</span> Users Updated/Enabled</span></div>
                    <div className="flex items-center space-x-2"><UserX className="h-5 w-5 text-red-500" /><span><span className="font-bold">{migrationSummary.disabled}</span> Users Disabled</span></div>
                    <div className="flex items-center space-x-2"><SkipForward className="h-5 w-5 text-gray-500" /><span><span className="font-bold">{migrationSummary.skipped}</span> Users Already in Sync</span></div>
                    <div className="flex items-center space-x-2 col-span-2"><AlertTriangle className="h-5 w-5 text-yellow-500" /><span><span className="font-bold">{migrationSummary.errors}</span> Errors Encountered</span></div>
                </div>
                {migrationSummary.errorDetails.length > 0 && (
                    <div className="mt-4"><h4 className="font-semibold mb-2">Error Details:</h4><div className="max-h-40 overflow-y-auto rounded-md border bg-muted p-2"><ul className="list-disc list-inside">{migrationSummary.errorDetails.map((error, index) => (<li key={index} className="text-xs">{error}</li>))}</ul></div></div>
                )}
             </div>
          ) : (
            <div className="mt-4"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2 mt-2" /></div>
          )}
          <AlertDialogFooter><AlertDialogAction onClick={() => setIsSummaryDialogOpen(false)}>Close</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DataManagementPage;
