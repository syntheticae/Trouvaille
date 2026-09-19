import { useState, useRef } from "react";
import { User as UserIcon, Camera } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../contexts/ToastContext";

interface ProfileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  avatarUrl: string;
  setAvatarUrl: (url: string) => void;
  displayName: string;
  setDisplayName: (name: string) => void;
}

export function ProfileSheet({
  isOpen,
  onClose,
  avatarUrl,
  setAvatarUrl,
  displayName,
  setDisplayName,
}: ProfileSheetProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 256;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", 0.7);
        setAvatarUrl(compressed);
        setIsUploading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = async () => {
    try {
      localStorage.setItem("trouvaille_avatar", avatarUrl);
      const { error } = await supabase.auth.updateUser({
        data: { display_name: displayName, avatar_url: avatarUrl },
      });
      if (error) throw error;
      onClose();
      showToast("Profile updated successfully", "update", () => {});
    } catch (e: any) {
      showToast(e.message || "Failed to update profile", "delete", () => {});
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="p-5 pb-10 space-y-5">
        <h3
          className="font-semibold text-lg"
          style={{ color: "var(--text-primary)" }}
        >
          Edit Profile
        </h3>
        <div className="flex flex-col items-center gap-3 py-2">
          <div
            className="w-24 h-24 rounded-full overflow-hidden relative flex items-center justify-center shadow-lg"
            style={{
              background: "var(--bg-elevated)",
              border: "2px solid var(--glass-border)",
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon
                size={40}
                style={{ color: "var(--text-secondary)" }}
              />
            )}
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-bold active:scale-95 transition-transform cursor-pointer"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            <Camera size={14} /> Change Photo
          </button>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>
        <div>
          <label
            className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block px-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full p-4 rounded-2xl outline-none font-bold text-[15px]"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          />
        </div>
        <button
          onClick={handleUpdateProfile}
          className="w-full py-4 rounded-[20px] font-semibold text-[15px] active:scale-95 cursor-pointer"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          Save Profile
        </button>
      </div>
    </BottomSheet>
  );
}
