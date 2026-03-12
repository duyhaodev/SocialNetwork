import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "../../components/ui/avatar";

import userApi from "../../api/userApi";
import { fetchMyInfo } from "../../store/userSlice";
import { toast } from "sonner";

export function EditProfileDialog({ open, onOpenChange }) {
  const dispatch = useDispatch();
  const profile = useSelector((s) => s.user.profile) ?? {};

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // fill dữ liệu khi mở dialog
  useEffect(() => {
    if (!open) return;
    setFullName(profile.fullName ?? "");
    setBio(profile.bio ?? "");
    setAvatarFile(null);
    setAvatarPreview(null);
  }, [open, profile]);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setAvatarFile(null);
      setAvatarPreview(null);
      return;
    }
    setAvatarFile(file);
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const formData = new FormData();

      if (fullName) formData.append("fullName", fullName);
      if (bio) formData.append("bio", bio);
      if (avatarFile) formData.append("avatar", avatarFile);

      await userApi.editProfile(formData);
      toast.success("Profile updated successfully");

      // cập nhật lại profile trong Redux
      dispatch(fetchMyInfo());

      onOpenChange?.(false);
    } catch (err) {
      console.error(err);
      toast.error("Profile update failed");
    } finally {
      setSubmitting(false);
    }
  };

  const displayAvatar =
    avatarPreview ||
    profile.avatarUrl ||
    profile.avatar ||
    "/default-avatar.png";
  const displayName = fullName || profile.fullName || "Unknown";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden [&>button]:hidden">
        {/* HEADER */}
        <DialogHeader className="border-b px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            {/* Hủy bên trái */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="px-2 font-semibold"
              onClick={() => onOpenChange?.(false)}
            >
              Cancel
            </Button>

            {/* Tiêu đề ở giữa */}
            <DialogTitle className="flex-1 text-center text-base font-semibold">
              Edit Profile
            </DialogTitle>

            {/* Khối rỗng bên phải để cân với nút Hủy */}
            <div className="w-[52px]" />
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={displayAvatar} alt={displayName} />
              <AvatarFallback>{displayName?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <div>
              <label className="text-sm font-medium block mb-1">
                Avatar
              </label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Select a new photo to change avatar.
              </p>
            </div>
          </div>

          {/* Full name */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Display Name</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Display Name"
            />
          </div>

          {/* Bio */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Bio</label>
            <Textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Short bio about yourself"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default EditProfileDialog;
