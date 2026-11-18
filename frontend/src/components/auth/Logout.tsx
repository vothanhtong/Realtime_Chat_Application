import { Button } from "../ui/button";
import { signOut } from "@/lib/session";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router";

const Logout = () => {
  const navigate = useNavigate();
  const handleLogout = async () => {
    // signOut luôn xoá phiên phía client (kể cả khi server lỗi) → App.tsx dọn socket/cache
    await signOut();
    navigate("/signin");
  };

  return (
    <Button
      variant="completeGhost"
      onClick={handleLogout}
    >
      <LogOut className="text-destructive" />
      Log out
    </Button>
  );
};

export default Logout;
