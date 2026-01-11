
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
import { Loader2, UserPlus, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useAuth } from '@/contexts/auth-context';
import { auth } from '@/lib/firebase'; // Import the auth instance from Firebase

interface AdminUser {
  uid: string;
  email: string;
  name: string;
}

export default function AdminManagementPage() {
    const { toast } = useToast();
    const { user } = useAuth(); // Context user for UI state
    const [admins, setAdmins] = React.useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    
    const [newAdminName, setNewAdminName] = React.useState("");
    const [newAdminEmail, setNewAdminEmail] = React.useState("");
    const [newAdminPassword, setNewAdminPassword] = React.useState("");

    const isReviewer = user?.email === 'guest-admin@taxshila-auth.com';

    const getAuthToken = async (): Promise<string | null> => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            toast({ title: "Not Authenticated", description: "You are not logged in.", variant: "destructive" });
            return null;
        }
        return await currentUser.getIdToken();
    };

    const fetchAdmins = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const token = await getAuthToken();
            if (!token) return;

            const response = await fetch('/api/admin/manage', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch admins.');
            }
            const data = await response.json();
            setAdmins(data.admins);
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        // We depend on the user object from the context to trigger the fetch
        if(user) {
            fetchAdmins();
        }
    }, [user, fetchAdmins]);

    const handleAddAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isReviewer) {
            toast({ title: "Action Disabled for Reviewer", description: "Adding new admins is disabled in reviewer mode." });
            return;
        }
        setIsSubmitting(true);
        try {
            const token = await getAuthToken();
            if (!token) return;

            const response = await fetch('/api/admin/manage', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newAdminName, email: newAdminEmail, password: newAdminPassword }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            toast({ title: "Admin Added", description: `${result.name} has been added as an admin.` });
            setNewAdminName("");
            setNewAdminEmail("");
            setNewAdminPassword("");
            fetchAdmins(); // Refresh the list
        } catch (error: any) {
            toast({ title: "Failed to Add Admin", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveAdmin = async (uid: string, name: string) => {
        if (isReviewer) {
            toast({ title: "Action Disabled for Reviewer", description: `Removing admins is disabled in reviewer mode.` });
            return;
        }
        try {
            const token = await getAuthToken();
            if (!token) return;

            const response = await fetch('/api/admin/manage', {
                method: 'DELETE',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ uid }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            toast({ title: "Admin Removed", description: `${name} has been removed.` });
            fetchAdmins(); // Refresh the list
        } catch (error: any) {
            toast({ title: "Failed to Remove Admin", description: error.message, variant: "destructive" });
        }
    };

    return (
        <>
            <PageTitle title="Admin Management" description="Add, view, and remove administrators." />
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Add New Admin</CardTitle>
                        <CardDescription>Create a new administrator account.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddAdmin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input id="name" value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} placeholder="Full Name" required disabled={isSubmitting || isReviewer}/>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} placeholder="admin@example.com" required disabled={isSubmitting || isReviewer}/>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input id="password" type="password" value={newAdminPassword} onChange={(e) => setNewAdminPassword(e.target.value)} placeholder="Min. 6 characters" required disabled={isSubmitting || isReviewer}/>
                            </div>
                            <Button type="submit" disabled={isSubmitting || !user || isReviewer}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                                Add Admin
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Existing Admins</CardTitle>
                        <CardDescription>List of current administrators.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center items-center h-24">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {admins.map((admin) => (
                                        <TableRow key={admin.uid}>
                                            <TableCell>{admin.name}</TableCell>
                                            <TableCell>{admin.email}</TableCell>
                                            <TableCell className="text-right">
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="destructive" size="icon" disabled={!user || isReviewer || admin.email === user.email}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This will permanently remove {admin.name} as an admin. This action cannot be undone.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleRemoveAdmin(admin.uid, admin.name)} disabled={isReviewer}>
                                                                Confirm
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
