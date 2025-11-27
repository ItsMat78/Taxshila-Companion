
"use client";

import * as React from 'react';
import { PageTitle } from '@/components/shared/page-title';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Notebook, Plus, Edit, Trash2 } from 'lucide-react';
import { 
    addAdminNote, 
    updateAdminNote, 
    deleteAdminNote, 
    getAllAdminNotes, 
    AdminNote 
} from '@/services/notes-service';
import { format, parseISO } from 'date-fns';
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


const noteFormSchema = z.object({
  content: z.string().min(1, "Note cannot be empty.").max(2000, "Note is too long."),
});

type NoteFormValues = z.infer<typeof noteFormSchema>;

interface NoteCardProps {
    note: AdminNote;
    onEdit: (note: AdminNote) => void;
    onDelete: (noteId: string) => void;
    isDeleting: boolean;
}

const NoteCard = ({ note, onEdit, onDelete, isDeleting }: NoteCardProps) => (
    <Card className="shadow-md flex flex-col">
        <CardHeader className="pb-2">
            <CardDescription className="text-xs">
                {format(parseISO(note.date), 'PPp')}
            </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
            <p className="text-sm whitespace-pre-wrap">{note.content}</p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2 border-t pt-3 mt-auto">
            <Button variant="ghost" size="icon" onClick={() => onEdit(note)}>
                <Edit className="h-4 w-4" />
            </Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" disabled={isDeleting}>
                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this note.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(note.id)} className="bg-destructive hover:bg-destructive/90">
                            Confirm Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </CardFooter>
    </Card>
);

export default function AdminNotesPage() {
    const { toast } = useToast();
    const [notes, setNotes] = React.useState<AdminNote[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [editingNote, setEditingNote] = React.useState<AdminNote | null>(null);

    const form = useForm<NoteFormValues>({
        resolver: zodResolver(noteFormSchema),
        defaultValues: { content: "" },
    });

    const fetchNotes = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const fetchedNotes = await getAllAdminNotes();
            setNotes(fetchedNotes);
        } catch (error) {
            toast({ title: "Error", description: "Could not load notes.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    const handleEditClick = (note: AdminNote) => {
        setEditingNote(note);
        form.setValue("content", note.content);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingNote(null);
        form.reset({ content: "" });
    };

    const onSubmit = async (data: NoteFormValues) => {
        setIsSubmitting(true);
        try {
            if (editingNote) {
                await updateAdminNote(editingNote.id, data.content);
                toast({ title: "Note Updated", description: "Your note has been successfully updated." });
            } else {
                await addAdminNote(data.content);
                toast({ title: "Note Added", description: "Your new note has been saved." });
            }
            handleCancelEdit();
            fetchNotes();
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to save the note.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (noteId: string) => {
        try {
            await deleteAdminNote(noteId);
            toast({ title: "Note Deleted", description: "The note has been permanently removed." });
            fetchNotes();
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to delete the note.", variant: "destructive" });
        }
    };

    return (
        <>
            <PageTitle title="Admin Notes" description="A shared space for admins to leave notes, reminders, and updates for each other." />
            
            <Card className="mb-6 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center">
                        {editingNote ? <Edit className="mr-2 h-5 w-5" /> : <Plus className="mr-2 h-5 w-5" />}
                        {editingNote ? 'Edit Note' : 'Create New Note'}
                    </CardTitle>
                    {editingNote && <CardDescription>Editing note from {format(parseISO(editingNote.date), 'PP')}.</CardDescription>}
                </CardHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <CardContent>
                            <FormField
                                control={form.control}
                                name="content"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="sr-only">Note Content</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Type your note here..."
                                                className="min-h-[100px]"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                        <CardFooter className="flex gap-2">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                {editingNote ? 'Save Changes' : 'Save Note'}
                            </Button>
                            {editingNote && (
                                <Button variant="outline" onClick={handleCancelEdit}>
                                    Cancel
                                </Button>
                            )}
                        </CardFooter>
                    </form>
                </Form>
            </Card>

            <div className="mt-8">
                <h2 className="text-xl font-headline font-semibold mb-4">Saved Notes</h2>
                {isLoading ? (
                    <div className="text-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    </div>
                ) : notes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {notes.map(note => (
                            <NoteCard
                                key={note.id}
                                note={note}
                                onEdit={handleEditClick}
                                onDelete={handleDelete}
                                isDeleting={isSubmitting}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        <Notebook className="h-10 w-10 mx-auto mb-2" />
                        No notes found. Create one above to get started.
                    </div>
                )}
            </div>
        </>
    );
}
