import { useState } from "react";
import { QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import gradiaLogo from "@/assets/gradia-logo.png";

interface SignupQRButtonProps {
  variant?: "icon" | "button";
  className?: string;
}

const SignupQRButton = ({ variant = "icon", className }: SignupQRButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Generate QR code URL for quick registration
  const qrUrl = `${window.location.origin}/candidate/quick-register`;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {variant === "icon" ? (
          <Button 
            variant="ghost" 
            size="sm" 
            className={className}
            title="Scan to Register"
          >
            <QrCode className="h-4 w-4" />
          </Button>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            className={`gap-2 ${className}`}
          >
            <QrCode className="h-4 w-4" />
            Scan QR
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Quick Registration QR</DialogTitle>
          <DialogDescription className="text-center">
            Scan this QR code to quickly register as a candidate
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center py-6">
          <div className="bg-white p-4 rounded-xl shadow-lg border-2 border-primary/20">
            <QRCodeSVG
              value={qrUrl}
              size={200}
              level="H"
              includeMargin={false}
              imageSettings={{
                src: gradiaLogo,
                height: 40,
                width: 40,
                excavate: true,
              }}
            />
          </div>
          
          <div className="mt-4 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Point your phone camera at the QR code
            </p>
            <p className="text-xs text-muted-foreground/70">
              Works with any QR scanner app
            </p>
          </div>
          
          <div className="mt-6 w-full">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or copy link
                </span>
              </div>
            </div>
            
            <div className="mt-4 flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={qrUrl}
                className="flex-1 text-xs bg-muted px-3 py-2 rounded-md border"
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(qrUrl);
                }}
              >
                Copy
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SignupQRButton;
