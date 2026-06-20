import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { format, parse, isValid } from "date-fns";
import { Calendar as CalendarIcon, ChevronsUpDown, Check } from "lucide-react";
import { motion } from "framer-motion";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
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
import { fetchMyPosts, fetchMyReposts } from "../../store/postsSlice";
import { toast } from "sonner";
import SpotifySection from "../../components/SpotifySection/SpotifyEdit";
import { AvatarCropDialog } from "../../components/AvatarCropDialog/AvatarCropDialog";

export function EditProfileDialog({ open, onOpenChange }) {
  const dispatch = useDispatch();
  const profile = useSelector((s) => s.user.profile) ?? {};

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [cityOpen, setCityOpen] = useState(false);
  const [dob, setDob] = useState("");
  const [spotifyLink, setSpotifyLink] = useState("");
  const [connectionsPrivacy, setConnectionsPrivacy] = useState("EVERYONE");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Cắt ảnh state
  const [cropOpen, setCropOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState(null);

  useEffect(() => {
    if (!open) return;
    setFullName(profile.fullName ?? "");
    setBio(profile.bio ?? "");
    setCity(profile.city ?? "");
    setSpotifyLink(profile.spotifyLink ?? "");
    setConnectionsPrivacy(profile.connectionsPrivacy ?? "EVERYONE");
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
    // Mở crop dialog thay vì set file trực tiếp
    setRawImageSrc(URL.createObjectURL(file));
    setCropOpen(true);
    // Reset input để có thể chọn lại cùng file
    e.target.value = "";
  };

  const handleCropDone = (croppedFile, croppedPreview) => {
    setAvatarFile(croppedFile);
    setAvatarPreview(croppedPreview);
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

      await userApi.editProfile({ fullName, bio, city, dob: formattedDob, mediaId, spotifyLink, connectionsPrivacy });
      toast.success("Profile updated successfully");
      dispatch(fetchMyInfo());
      dispatch(fetchMyPosts());
      dispatch(fetchMyReposts());
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
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 bg-zinc-950/65 backdrop-blur-xl border border-white/10 text-white [&>button]:hidden rounded-3xl shadow-2xl shadow-black/50 overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex flex-col">
        <DialogHeader className="border-b border-white/10 px-5 py-4">
          <div className="flex items-center justify-between">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              className="text-sm font-semibold text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all duration-200 cursor-pointer"
              onClick={() => onOpenChange?.(false)}
            >
              Cancel
            </motion.button>
            <DialogTitle className="text-base font-bold tracking-tight text-foreground">Edit Profile</DialogTitle>
            <DialogDescription className="sr-only">Edit your profile information</DialogDescription>
            <div className="w-[68px]" /> 
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto likers-scroll">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border border-white/10 ring-2 ring-white/5">
              <AvatarImage src={displayAvatar} style={{ objectFit: "cover" }} />
              <AvatarFallback className="bg-zinc-800 text-zinc-400">{displayName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="bg-white/5 border border-white/10 focus:border-white/20 file:text-white file:bg-white/10 file:border-none file:px-3 file:py-1 file:rounded-lg file:cursor-pointer text-xs h-10 rounded-xl cursor-pointer focus:ring-1 focus:ring-white/15 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Full Name</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-white/5 border border-white/10 focus:border-white/20 focus:bg-white/10 transition-all h-10.5 rounded-xl text-sm"
            />
          </div>

          <div className="space-y-1 flex flex-col">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Date of Birth</label>
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
                  className="w-full bg-white/5 border border-white/10 focus:border-white/20 focus:bg-white/10 transition-all text-white pr-10 h-10.5 rounded-xl text-sm"
                />
                <PopoverTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    className="absolute right-0 top-0 h-full px-3 text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <CalendarIcon className="h-4 w-4" />
                  </motion.button>
                </PopoverTrigger>
              </div>
              <PopoverContent className="w-auto p-0 bg-zinc-950/85 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl overflow-hidden" align="start">
                <Calendar
                  mode="single"
                  fromYear={1900}
                  toYear={2026}
                  captionLayout="dropdown"
                  selected={dob ? parse(dob, "yyyy-MM-dd", new Date()) : undefined}
                  onSelect={(date) => date && setDob(format(date, "yyyy-MM-dd"))}
                  className="bg-transparent text-white p-3"
                  components={{
                    Dropdown: ({ value, onChange, children }) => {
                      const options = Array.isArray(children) ? children : [];
                      return (
                        <Select value={value?.toString()} onValueChange={(v) => onChange?.({ target: { value: v } })}>
                          <SelectTrigger className="h-8 min-w-[70px] bg-white/5 border border-white/10 text-xs rounded-lg text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900/90 backdrop-blur-md border border-white/10 text-white max-h-[200px] rounded-xl">
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
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">City</label>
            <Popover open={cityOpen} onOpenChange={(o) => { setCityOpen(o); if (!o) setCitySearch(""); }}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between bg-white/5 border border-white/10 hover:bg-white/10 transition-all rounded-xl h-10.5 px-3 text-sm text-white"
                >
                  <span className={city ? "text-white" : "text-zinc-400"}>{city || "Chọn tỉnh/thành phố"}</span>
                  <ChevronsUpDown className="w-4 h-4 text-zinc-400 shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 bg-zinc-900/95 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden" style={{ width: "var(--radix-popover-trigger-width)" }}>
                <div className="p-2 border-b border-white/10">
                  <input
                    autoFocus
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                    placeholder="Tìm tỉnh/thành phố..."
                    className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-zinc-400 outline-none focus:border-white/20"
                  />
                </div>
                <div 
                  className="max-h-52 overflow-y-auto py-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/30"
                  onWheel={(e) => e.stopPropagation()}
                >
                  {[
                    "An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu",
                    "Bắc Ninh", "Bến Tre", "Bình Định", "Bình Dương", "Bình Phước",
                    "Bình Thuận", "Cà Mau", "Cần Thơ", "Cao Bằng", "Đà Nẵng",
                    "Đắk Lắk", "Đắk Nông", "Điện Biên", "Đồng Nai", "Đồng Tháp",
                    "Gia Lai", "Hà Giang", "Hà Nam", "Hà Nội", "Hà Tĩnh",
                    "Hải Dương", "Hải Phòng", "Hậu Giang", "Hòa Bình", "Hưng Yên",
                    "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu", "Lâm Đồng",
                    "Lạng Sơn", "Lào Cai", "Long An", "Nam Định", "Nghệ An",
                    "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên", "Quảng Bình",
                    "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sóc Trăng",
                    "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên", "Thanh Hóa",
                    "Thừa Thiên Huế", "Tiền Giang", "TP. Hồ Chí Minh", "Trà Vinh",
                    "Tuyên Quang", "Vĩnh Long", "Vĩnh Phúc", "Yên Bái"
                  ]
                    .filter(c => c.toLowerCase().includes(citySearch.toLowerCase()))
                    .map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => { setCity(c); setCityOpen(false); setCitySearch(""); }}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                      >
                        {c}
                        {city === c && <Check className="w-4 h-4 text-white shrink-0" />}
                      </button>
                    ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Bio</label>
            <Textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="bg-white/5 border border-white/10 focus:border-white/20 focus:bg-white/10 hover:bg-white/10 transition-all rounded-xl focus:ring-1 focus:ring-white/15 focus:outline-none resize-none text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Connections Privacy</label>
            <Select value={connectionsPrivacy} onValueChange={setConnectionsPrivacy}>
              <SelectTrigger className="bg-white/5 border border-white/10 focus:border-white/20 focus:bg-white/10 hover:bg-white/10 transition-all rounded-xl h-10.5 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900/90 backdrop-blur-md border border-white/10 text-white rounded-2xl">
                <SelectItem value="EVERYONE">Everyone</SelectItem>
                <SelectItem value="FRIENDS_ONLY">Friends only</SelectItem>
                <SelectItem value="ONLY_ME">Only me</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-zinc-500 mt-1 leading-normal">
              {connectionsPrivacy === "EVERYONE" && "Anyone can see your followers and following."}
              {connectionsPrivacy === "FRIENDS_ONLY" && "Only mutual friends can see your followers and following."}
              {connectionsPrivacy === "ONLY_ME" && "Only you can see your followers and following."}
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={submitting}
            className="w-full bg-white text-black hover:bg-zinc-100 font-bold h-10.5 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save Changes"}
          </motion.button>
        </form>
        </div>
      </DialogContent>
    </Dialog>

    <AvatarCropDialog
      open={cropOpen}
      imageSrc={rawImageSrc}
      onClose={() => setCropOpen(false)}
      onCropDone={handleCropDone}
    />
  </>
  );
}

export default EditProfileDialog;