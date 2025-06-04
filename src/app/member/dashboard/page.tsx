
"use client";

import * as React from 'react';
import Link from 'next/link';
import { PageTitle } from '@/components/shared/page-title';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as ShadcnCardDescription } from '@/components/ui/card'; // Aliased CardDescription to avoid conflict
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { Camera, QrCode, Receipt, IndianRupee, MessageSquare, Bell, ScrollText, Star, Loader2, XCircle, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

type DashboardTileProps = {
  title: string;
  description?: string;
  icon: React.ElementType;
  href?: string;
  action?: () => void;
  className?: string;
  isPrimaryAction?: boolean;
  external?: boolean;
};

const DashboardTile: React.FC<DashboardTileProps> = ({ title, description, icon: Icon, href, action, className = "", isPrimaryAction = false, external = false }) => {
  const tileContent = (
    <Card className={cn(
      "shadow-lg hover:shadow-xl transition-shadow h-full flex flex-col",
      isPrimaryAction ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'hover:bg-muted/50',
      className // Allows passing aspect-square or other structural classes from outside
    )}>
      <CardHeader className={cn("pb-2", isPrimaryAction ? "pt-6 pb-3" : "pt-4")}>
        <CardTitle className={cn(
          "flex items-center font-semibold",
          isPrimaryAction ? 'text-xl' : 'text-lg',
        )}>
          <Icon className={cn("mr-3", isPrimaryAction ? "h-6 w-6" : "h-5 w-5")} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        {description && <p className={cn(
          isPrimaryAction ? 'text-sm text-primary-foreground/80' : 'text-xs text-muted-foreground',
        )}>{description}</p>}
      </CardContent>
    </Card>
  );

  if (href) {
    if (external) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn("block h-full no-underline", className)}
        >
          {tileContent}
        </a>
      );
    } else {
      return (
        <Link href={href} className={cn("block h-full no-underline", className)}>
          {tileContent}
        </Link>
      );
    }
  }

  if (action) {
    return <button onClick={action} className={cn("block w-full h-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg", className)}>{tileContent}</button>;
  }

  return <div className={className}>{tileContent}</div>;
};


export default function MemberDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [isProcessingQr, setIsProcessingQr] = React.useState(false);
  const streamRef = React.useRef<MediaStream | null>(null);

  React.useEffect(() => {
    const getCameraPermission = async () => {
      if (isScannerOpen) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          streamRef.current = stream;
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Camera Access Denied',
            description: 'Please enable camera permissions in your browser settings.',
          });
          setIsScannerOpen(false);
        }
      } else {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      }
    };

    getCameraPermission();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isScannerOpen, toast]);

  const handleOpenScanner = () => {
    setIsScannerOpen(true);
    setHasCameraPermission(null);
  };

  const handleCloseScanner = () => {
    setIsScannerOpen(false);
  };

  const simulateQrScan = async () => {
    setIsProcessingQr(true);
    await new Promise(resolve => setTimeout(resolve, 2000)); 
    setIsProcessingQr(false);
    setIsScannerOpen(false); 
    toast({
      title: "Attendance Marked!",
      description: `Your attendance has been recorded at ${new Date().toLocaleTimeString()}.`,
    });
  };
  
  const coreActionTiles: DashboardTileProps[] = [
    { title: "My Fees", description: "View your fee status and history.", icon: Receipt, href: "/member/fees" },
    { title: "Pay Fees", description: "Settle your outstanding dues.", icon: IndianRupee, href: "/member/pay" },
    { title: "Submit Feedback", description: "Share suggestions or report issues.", icon: MessageSquare, href: "/member/feedback" },
    { title: "View Alerts", description: "Catch up on important announcements.", icon: Bell, href: "/member/alerts" },
  ];

  const otherResourcesTiles: DashboardTileProps[] = [
    { title: "Library Rules", description: "Familiarize yourself with guidelines.", icon: ScrollText, href: "/member/rules" },
    { title: "Rate Us", description: "Love our space? Let others know!", icon: Star, href: "https://www.google.com/maps/search/?api=1&query=Taxshila+Study+Hall+Pune", external: true },
  ];

  return (
    <>
      <PageTitle title={`Welcome, ${user?.email?.split('@')[0] || 'Member'}!`} description="Your Taxshila Companion dashboard." />
      
      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogTrigger asChild>
          <div className="mb-6 cursor-pointer">
            <DashboardTile
              title="Mark Attendance"
              description="Scan the QR code at the library to check-in/out."
              icon={QrCode}
              action={handleOpenScanner}
              isPrimaryAction={true}
            />
          </div>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center"><Camera className="mr-2"/>Scan QR Code</DialogTitle>
            <DialogDescription>
              Point your camera at the QR code provided at the library desk.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 my-4">
            {hasCameraPermission === false && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Camera Access Denied</AlertTitle>
                <AlertDescription>
                  Camera access is required. Please enable it in your browser settings and try again.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="w-full aspect-square bg-muted rounded-md overflow-hidden flex items-center justify-center">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
            </div>
            
            {hasCameraPermission === null && !videoRef.current?.srcObject && (
                 <div className="flex items-center justify-center text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Requesting camera...
                </div>
            )}
          </div>

          {hasCameraPermission && (
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <Button onClick={simulateQrScan} className="w-full sm:flex-1" disabled={isProcessingQr}>
                  {isProcessingQr && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isProcessingQr ? "Processing..." : "Simulate Scan"}
                </Button>
                <Button variant="outline" onClick={handleCloseScanner} className="w-full sm:w-auto" disabled={isProcessingQr}>
                  Cancel
                </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Core Action Tiles - Square */}
      <div className="grid grid-cols-2 gap-4 sm:gap-6">
        {coreActionTiles.map((tile) => (
          <DashboardTile key={tile.title} {...tile} className="aspect-square" />
        ))}
      </div>

      {/* Separator */}
      <div className="my-8 border-t border-border"></div>

      {/* Other Resources Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {otherResourcesTiles.map((tile) => (
          <DashboardTile key={tile.title} {...tile} />
        ))}
      </div>
    </>
  );
}
