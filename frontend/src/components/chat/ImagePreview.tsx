import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import { getFullUrl } from "@/lib/cloudinaryUtils";
import { Download, X } from "lucide-react";
import { Button } from "../ui/button";

interface ImagePreviewProps {
  src: string | null;
  onClose: () => void;
}

const ImagePreview = ({ src, onClose }: ImagePreviewProps) => {
  if (!src) return null;

  const fullUrl = getFullUrl(src);

  return (
    <Dialog
      open={!!src}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-0 bg-black/95 flex flex-col items-center justify-center shadow-2xl overflow-hidden">
        <DialogTitle className="hidden">Xem ảnh</DialogTitle>

        <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
          <Button
            size="icon"
            variant="ghost"
            className="text-white hover:bg-white/20 transition-all rounded-full"
            onClick={() => window.open(src, "_blank")}
            title="Tải ảnh"
          >
            <Download className="size-5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="text-white hover:bg-white/20 transition-all rounded-full"
            onClick={onClose}
            title="Đóng"
          >
            <X className="size-5" />
          </Button>
        </div>

        <div className="w-full h-full flex items-center justify-center p-4">
          <img
            src={fullUrl}
            alt="Preview"
            className="max-w-full max-h-[90vh] object-contain select-none shadow-glow animate-in zoom-in-95 duration-300"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImagePreview;
