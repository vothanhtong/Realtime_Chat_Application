import { useUploadAvatar } from "@/hooks/useProfile";
import { useRef } from "react";
import { Button } from "../ui/button";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ACCEPT_IMAGE_ATTR, MAX_AVATAR_SIZE_BYTES, validateImageFile } from "@/config/upload";

const AvatarUploader = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutateAsync: uploadAvatar, isPending: loading } = useUploadAvatar();

  const handleClick = () => {
    if (!loading) fileInputRef.current?.click();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Cùng giới hạn với backend (config/upload.ts ↔ Backend constants.js)
    const invalid = validateImageFile(file, MAX_AVATAR_SIZE_BYTES);
    if (invalid) {
      toast.error(invalid);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      await uploadAvatar(formData);
    } catch {
      // lỗi đã toast trong useUploadAvatar
    } finally {
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
        accept={ACCEPT_IMAGE_ATTR}
        onChange={handleUpload}
      />
    </>
  );
};

export default AvatarUploader;
