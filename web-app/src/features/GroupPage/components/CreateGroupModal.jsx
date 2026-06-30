import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Camera } from "lucide-react";
import groupApi from "@/api/groupApi";
import mediaApi from "@/api/mediaApi";
import { CoverCropDialog } from "@/components/CoverCropDialog/CoverCropDialog";

const schema = yup.object({
  name: yup.string().required("Vui lòng nhập tên nhóm").max(100, "Tên nhóm quá dài"),
  description: yup.string(),
  privacy: yup.string().oneOf(["PUBLIC", "PRIVATE"]).required(),
  requiresApproval: yup.boolean().required()
}).required();

export function CreateGroupModal({ isOpen, onClose, onSuccess }) {
  const [isLoading, setIsLoading] = useState(false);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState(null);

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      privacy: "PUBLIC",
      requiresApproval: true
    }
  });

  const watchPrivacy = watch("privacy");
  const watchRequiresApproval = watch("requiresApproval");

  const handleCoverChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setRawImageSrc(URL.createObjectURL(file));
      setCropOpen(true);
      e.target.value = ""; // Reset input để có thể chọn lại cùng file
    }
  };

  const handleCropDone = (croppedFile, croppedPreview) => {
    setCoverFile(croppedFile);
    setCoverPreview(croppedPreview);
  };

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      let finalCoverUrl = "";
      if (coverFile) {
        const formData = new FormData();
        formData.append("files", coverFile);
        const uploadRes = await mediaApi.upload(formData);
        
        let mediaObj = null;
        if (Array.isArray(uploadRes)) mediaObj = uploadRes[0];
        else if (Array.isArray(uploadRes.data)) mediaObj = uploadRes.data[0];
        else if (Array.isArray(uploadRes.data?.result)) mediaObj = uploadRes.data.result[0];
        
        finalCoverUrl = mediaObj?.mediaUrl || mediaObj?.url || "";
      }

      const payload = {
        name: data.name,
        description: data.description,
        privacy: data.privacy,
        requiresApproval: data.requiresApproval,
        coverImageUrl: finalCoverUrl
      };
      
      const res = await groupApi.createGroup(payload);
      if (res.code === 1000) {
        toast.success("Tạo nhóm thành công!");
        reset();
        setCoverFile(null);
        setCoverPreview(null);
        window.dispatchEvent(new Event('groupListChanged'));
        onSuccess && onSuccess(res.result);
        onClose();
      } else {
        toast.error("Tạo nhóm thất bại!");
      }
    } catch (error) {
      console.error(error);
      toast.error("Lỗi khi tạo nhóm!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Tạo nhóm mới</DialogTitle>
          <DialogDescription>
            Bắt đầu một cộng đồng mới ngay bây giờ.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Ảnh Bìa Nhóm</Label>
            <div className="relative w-full h-32 bg-muted/50 rounded-xl overflow-hidden border-2 border-dashed border-border flex items-center justify-center hover:bg-muted/80 transition-colors cursor-pointer group">
              {coverPreview ? (
                <img src={coverPreview} alt="Cover Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-muted-foreground flex flex-col items-center">
                  <Camera className="w-8 h-8 mb-2 opacity-50" />
                  <span className="text-sm font-medium">Tải ảnh lên</span>
                </div>
              )}
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleCoverChange} 
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Tên nhóm</Label>
            <Input id="name" placeholder="Ví dụ: Lập trình viên..." {...register("name")} />
            {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Mô tả (tùy chọn)</Label>
            <Textarea 
              id="description" 
              placeholder="Nhóm này dùng để làm gì?" 
              className="resize-none h-24"
              {...register("description")} 
            />
          </div>

          <div className="space-y-2">
            <Label>Quyền riêng tư</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  value="PUBLIC" 
                  {...register("privacy")} 
                  className="accent-primary"
                />
                Công khai
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  value="PRIVATE" 
                  {...register("privacy")} 
                  className="accent-primary"
                />
                Riêng tư
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Yêu cầu duyệt bài viết</Label>
              <p className="text-sm text-muted-foreground">Admin/Mod sẽ duyệt trước khi bài được hiện.</p>
            </div>
            <Switch 
              checked={watchRequiresApproval}
              onCheckedChange={(checked) => setValue("requiresApproval", checked)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>Hủy</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Đang tạo..." : "Tạo nhóm"}
            </Button>
          </div>
        </form>
      </DialogContent>
      
      <CoverCropDialog
        open={cropOpen}
        imageSrc={rawImageSrc}
        onClose={() => setCropOpen(false)}
        onCropDone={handleCropDone}
        aspect={3} // Tỉ lệ 3:1 cho cover
      />
    </Dialog>
  );
}
