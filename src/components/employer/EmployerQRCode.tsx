import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, QrCode, Share2 } from "lucide-react";
import { toast } from "sonner";

interface EmployerQRCodeProps {
  employerId: string;
  companyName?: string;
}

const EmployerQRCode = ({ employerId, companyName }: EmployerQRCodeProps) => {
  const qrUrl = `${window.location.origin}/company/${employerId}/jobs`;

  const handleDownload = () => {
    const svg = document.getElementById("employer-qr-code");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `${companyName || "company"}-qr-code.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
      toast.success("QR code downloaded!");
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${companyName || "Company"} - Job Openings`,
          text: "Scan this QR code to view our job openings and apply!",
          url: qrUrl,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          navigator.clipboard.writeText(qrUrl);
          toast.success("Link copied to clipboard!");
        }
      }
    } else {
      navigator.clipboard.writeText(qrUrl);
      toast.success("Link copied to clipboard!");
    }
  };

  return (
    <Card className="hover:shadow-large transition-all duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <QrCode className="h-5 w-5 text-accent" />
          Job Vacancy QR Code
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="bg-white p-4 rounded-xl shadow-soft">
          <QRCodeSVG
            id="employer-qr-code"
            value={qrUrl}
            size={160}
            level="H"
            includeMargin
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>
        <p className="text-sm text-muted-foreground text-center">
          Candidates can scan this QR code to view all your job openings and apply instantly with AI resume analysis.
        </p>
        <div className="flex gap-2 w-full">
          <Button variant="outline" className="flex-1" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployerQRCode;
