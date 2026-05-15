import { useState, useRef } from "react";
import { QrCode, Download } from "lucide-react";
import { toast } from "sonner";
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
  const qrWrapperRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    const svg = qrWrapperRef.current?.querySelector("svg");
    if (!svg) {
      toast.error("QR code not ready");
      return;
    }
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      const size = 1024;
      canvas.width = size;
      canvas.height = size;
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
      }
      const pngFile = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = "gradia-quick-register-qr.png";
      link.href = pngFile;
      link.click();
      toast.success("QR code downloaded!");
    };
    img.onerror = () => toast.error("Failed to generate QR image");
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };
  
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
          <div ref={qrWrapperRef} className="bg-white p-4 rounded-xl shadow-lg border-2 border-primary/20">
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

          <Button
            size="sm"
            variant="default"
            className="mt-4 gap-2"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
            Download QR
          </Button>
          
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
