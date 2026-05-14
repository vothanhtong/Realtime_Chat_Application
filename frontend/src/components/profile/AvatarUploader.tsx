import { useUserStore } from "@/stores/useUserStore";
import { useRef, useState } from "react";
import { Button } from "../ui/button";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

const AvatarUploader = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updateAvatarUrl } = useUserStore();
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    if (!loading) fileInputRef.current?.click();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Chỉ chấp nhận file ảnh (JPEG, PNG, WebP, GIF)");
      return;
    }

    // Validate file size (1MB)
    if (file.size > 1024 * 1024) {
      toast.error("Ảnh không được vượt quá 1MB");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("file", file);
      await updateAvatarUrl(formData);
    } finally {
      setLoading(false);
      // Reset input để có thể chọn lại cùng file
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="secondary"
        onClick={handleClick}
        disabled={loading}
        className="absolute -bottom-2 -right-2 size-9 rounded-full shadow-md hover:scale-110 transition duration-300 hover:bg-background disabled:opacity-70 disabled:cursor-not-allowed"
        title="Thay đổi ảnh đại diện"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Camera className="size-4" />
        )}
      </Button>

      <input
        type="file"
        hidden
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleUpload}
      />
    </>
  );
};

export default AvatarUploader;
