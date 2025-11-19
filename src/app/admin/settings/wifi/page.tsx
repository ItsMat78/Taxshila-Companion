
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
import { Input } from '@/components/ui/input';
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
import { Loader2, Save, Settings, Wifi, PlusCircle, Trash2, Edit } from 'lucide-react';
import { getWifiConfiguration, updateWifiConfiguration } from '@/services/student-service';
import type { WifiConfig } from '@/types/student';
import { Skeleton } from '@/components/ui/skeleton';
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

const wifiFormSchema = z.object({
  id: z.string().optional(),
  ssid: z.string().min(1, "SSID cannot be empty."),
  password: z.string().optional(),
});

type WifiFormValues = z.infer<typeof wifiFormSchema>;

export default function WifiManagementPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [wifiConfigs, setWifiConfigs] = React.useState<WifiConfig[]>([]);
  const [editingConfig, setEditingConfig] = React.useState<WifiConfig | null>(null);

  const form = useForm<WifiFormValues>({
    resolver: zodResolver(wifiFormSchema),
    defaultValues: {
      ssid: "",
      password: "",
    },
  });

  const fetchWifiConfigs = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const configs = await getWifiConfiguration();
      setWifiConfigs(configs);
    } catch (error) {
      console.error("Failed to fetch WiFi configs:", error);
      toast({ title: "Error", description: "Could not load WiFi settings.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchWifiConfigs();
  }, [fetchWifiConfigs]);

  React.useEffect(() => {
    if (editingConfig) {
      form.reset({
        id: editingConfig.id,
        ssid: editingConfig.ssid,
        password: editingConfig.password || "",
      });
    } else {
      form.reset({
        id: undefined,
        ssid: "",
        password: "",
      });
    }
  }, [editingConfig, form]);

  async function onSubmit(data: WifiFormValues) {
    setIsSaving(true);
    try {
      let updatedConfigs: WifiConfig[];

      // Construct the new or updated config object carefully
      const newOrUpdatedConfig: Partial<WifiConfig> = {
        id: editingConfig ? editingConfig.id : `wifi_${Date.now()}`,
        ssid: data.ssid,
      };
      // Only include the password if it's a non-empty string
      if (data.password && data.password.trim() !== '') {
        newOrUpdatedConfig.password = data.password;
      }
      
      if (editingConfig) { // Editing existing config
        updatedConfigs = wifiConfigs.map(c => 
          c.id === editingConfig.id ? (newOrUpdatedConfig as WifiConfig) : c
        );
      } else { // Adding new config
        updatedConfigs = [...wifiConfigs, newOrUpdatedConfig as WifiConfig];
      }
      
      await updateWifiConfiguration(updatedConfigs);
      toast({
        title: "WiFi Settings Updated",
        description: `Successfully ${editingConfig ? 'edited' : 'added'} the WiFi network.`,
      });
      setEditingConfig(null);
      await fetchWifiConfigs();
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Could not save WiFi settings.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }
  
  const handleDelete = async (id: string) => {
    setIsSaving(true);
    try {
      const updatedConfigs = wifiConfigs.filter(c => c.id !== id);
      await updateWifiConfiguration(updatedConfigs);
      toast({
        title: "WiFi Network Removed",
        description: "The WiFi network has been deleted.",
      });
      await fetchWifiConfigs();
    } catch (error: any) {
        toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  }

  return (
    <>
      <PageTitle title="WiFi Management" description="Manage the WiFi networks displayed to members." />
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center">
                    <Wifi className="mr-2 h-5 w-5" />
                    Available Networks
                </CardTitle>
                <CardDescription>
                    List of currently saved WiFi networks.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-24 w-full" />
                ) : wifiConfigs.length > 0 ? (
                    <div className="space-y-4">
                        {wifiConfigs.map(config => (
                            <div key={config.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                    <p className="font-semibold">{config.ssid}</p>
                                    <p className="text-sm text-muted-foreground font-mono">{config.password || 'No password'}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => setEditingConfig(config)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently delete the WiFi network "{config.ssid}".
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(config.id)} className="bg-destructive hover:bg-destructive/90">
                                                    Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-center">No WiFi networks configured yet.</p>
                )}
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
            <CardTitle className="flex items-center">
                {editingConfig ? <Edit className="mr-2 h-5 w-5" /> : <PlusCircle className="mr-2 h-5 w-5" />}
                {editingConfig ? 'Edit Network' : 'Add New Network'}
            </CardTitle>
            <CardDescription>
                {editingConfig ? `Editing details for ${editingConfig.ssid}.` : 'Add a new WiFi network for members to see.'}
            </CardDescription>
            </CardHeader>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-6">
                <FormField
                    control={form.control}
                    name="ssid"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Network Name (SSID)</FormLabel>
                        <FormControl>
                        <Input placeholder="e.g., Taxshila-Guest" {...field} disabled={isSaving} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Password (Optional)</FormLabel>
                        <FormControl>
                        <Input placeholder="Enter WiFi password" {...field} disabled={isSaving} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                </CardContent>
                <CardFooter className="flex justify-between">
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {editingConfig ? 'Save Changes' : 'Add Network'}
                </Button>
                {editingConfig && (
                    <Button variant="ghost" onClick={() => setEditingConfig(null)} disabled={isSaving}>
                        Cancel Edit
                    </Button>
                )}
                </CardFooter>
            </form>
            </Form>
        </Card>

      </div>
    </>
  );
}
