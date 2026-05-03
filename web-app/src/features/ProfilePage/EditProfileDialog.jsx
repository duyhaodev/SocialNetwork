import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { format, parse, isValid } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "../../components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Calendar } from "../../components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";

import userApi from "../../api/userApi";
import mediaApi from "../../api/mediaApi";
import { fetchMyInfo } from "../../store/userSlice";
import { toast } from "sonner";
import SpotifySection from "../../components/SpotifySection/SpotifyEdit";

export function EditProfileDialog({ open, onOpenChange }) {
  const dispatch = useDispatch();
  const profile = useSelector((s) => s.user.profile) ?? {};

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [dob, setDob] = useState("");
  const [spotifyLink, setSpotifyLink] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFullName(profile.fullName ?? "");
    setBio(profile.bio ?? "");
    setCity(profile.city ?? "");
    setSpotifyLink(profile.spotifyLink ?? "");
    if (profile.dob) {
      const [day, month, year] = profile.dob.split("-");
      setDob(`${year}-${month}-${day}`);
    } else {
      setDob("");
    }
    setAvatarFile(null);
    setAvatarPreview(null);
  }, [open, profile]);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      let mediaId = null;
      if (avatarFile) {
        const mediaFormData = new FormData();
        mediaFormData.append("files", avatarFile); 
        const uploadRes = await mediaApi.upload(mediaFormData);
        if (Array.isArray(uploadRes)) {
          mediaId = uploadRes[0]?.id;
        } else if (Array.isArray(uploadRes.data)) {
          mediaId = uploadRes.data[0]?.id;
        } else if (Array.isArray(uploadRes.data?.result)) {
          mediaId = uploadRes.data.result[0]?.id;
        } else {
          mediaId = uploadRes.id || uploadRes.data?.id || uploadRes.data?.result?.id;
        }
      }

      let formattedDob = null;
      if (dob) {
        const [year, month, day] = dob.split("-");
        formattedDob = `${day}-${month}-${year}`;
      }

      await userApi.editProfile({ fullName, bio, city, dob: formattedDob, mediaId, spotifyLink });
      toast.success("Profile updated successfully");
      dispatch(fetchMyInfo());
      onOpenChange?.(false);
    } catch (err) {
      toast.error("Profile update failed");
    } finally {
      setSubmitting(false);
    }
  };

  const displayAvatar = avatarPreview || profile.avatarUrl || profile.avatar || "/default-avatar.png";
  const displayName = fullName || profile.fullName || "Unknown";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-zinc-950 border-zinc-800 text-white [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="border-b border-zinc-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white" onClick={() => onOpenChange?.(false)}>
              Cancel
            </Button>
            <DialogTitle className="text-base font-semibold">Edit Profile</DialogTitle>
            <div className="w-[52px]" /> 
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border border-zinc-800">
              <AvatarImage src={displayAvatar} />
              <AvatarFallback className="bg-zinc-800 text-zinc-400">{displayName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Input type="file" accept="image/*" onChange={handleAvatarChange} className="bg-zinc-900 border-zinc-800 file:text-white text-xs h-9" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-400">Full Name</label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-zinc-900 border-zinc-800 focus:ring-1 focus:ring-zinc-700 h-10" />
          </div>

          <div className="space-y-1 flex flex-col">
            <label className="text-sm font-medium text-zinc-400">Date of Birth</label>
            <Popover>
              <div className="relative">
                <Input
                  placeholder="DD/MM/YYYY"
                  value={dob ? format(parse(dob, "yyyy-MM-dd", new Date()), "dd/MM/yyyy") : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
                      const parsed = parse(val, "dd/MM/yyyy", new Date());
                      if (isValid(parsed)) setDob(format(parsed, "yyyy-MM-dd"));
                    }
                  }}
                  className="w-full bg-zinc-900 border-zinc-800 text-white pr-10 h-10"
                />
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-zinc-400">
                    <CalendarIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
              </div>
              <PopoverContent className="w-auto p-0 bg-zinc-950 border-zinc-800 shadow-2xl" align="start">
                <Calendar
                  mode="single"
                  fromYear={1900}
                  toYear={2026}
                  captionLayout="dropdown"
                  selected={dob ? parse(dob, "yyyy-MM-dd", new Date()) : undefined}
                  onSelect={(date) => date && setDob(format(date, "yyyy-MM-dd"))}
                  className="bg-zinc-950 text-white p-3"
                  components={{
                    Dropdown: ({ value, onChange, children }) => {
                      const options = Array.isArray(children) ? children : [];
                      return (
                        <Select value={value?.toString()} onValueChange={(v) => onChange?.({ target: { value: v } })}>
                          <SelectTrigger className="h-8 min-w-[70px] bg-zinc-900 border-zinc-800 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-800 text-white max-h-[200px]">
                            {options.map((opt) => (
                              <SelectItem key={opt.props.value} value={opt.props.value?.toString()}>{opt.props.children}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      );
                    },
                  }}
                  classNames={{
                    vhidden: "hidden",
                    caption_label: "hidden",
                    caption_dropdowns: "flex justify-center gap-2 mb-2",
                    day_selected: "bg-white text-black hover:bg-white hover:text-black",
                    day_today: "bg-zinc-800 text-white",
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <SpotifySection value={spotifyLink} onChange={setSpotifyLink} />

          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-400">City</label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} className="bg-zinc-900 border-zinc-800 focus:ring-1 focus:ring-zinc-700 h-10" />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-400">Bio</label>
            <Textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} className="bg-zinc-900 border-zinc-800 focus:ring-1 focus:ring-zinc-700 resize-none" />
          </div>

          <Button type="submit" disabled={submitting} className="w-full bg-white text-black hover:bg-zinc-200 font-bold h-10">
            {submitting ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default EditProfileDialog;