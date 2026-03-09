import { useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface QRCodeModalProps {
  open: boolean;
  onClose: () => void;
  url: string;
}

export default function QRCodeModal({ open, onClose, url }: QRCodeModalProps) {
  const svgRef = useRef<HTMLDivElement>(null);

  const handleDownload = useCallback(() => {
    const svgEl = svgRef.current?.querySelector("svg");
    if (!svgEl) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = "lesson-qr-code.png";
      a.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  }, []);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif">QR Code</DialogTitle>
          <DialogDescription>
            Students can scan this to follow along on their phones.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <div ref={svgRef} className="bg-white p-4 rounded-lg">
            <QRCodeSVG value={url} size={220} />
          </div>

          <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
            <Download size={14} />
            Download QR as PNG
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
