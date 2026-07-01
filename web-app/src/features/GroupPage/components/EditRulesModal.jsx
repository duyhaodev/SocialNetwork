import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, GripVertical } from "lucide-react";
import groupApi from "@/api/groupApi";

const schema = yup.object({
  rules: yup.array().of(
    yup.object({
      title: yup.string().required("Tiêu đề không được để trống").max(200, "Tối đa 200 ký tự"),
      description: yup.string()
    })
  ).max(10, "Tối đa 10 điều luật")
}).required();

export function EditRulesModal({ isOpen, onClose, groupId, initialRules, onSuccess }) {
  const [isLoading, setIsLoading] = useState(false);

  const { register, control, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { rules: [] }
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "rules"
  });

  useEffect(() => {
    if (isOpen) {
      if (initialRules && initialRules.length > 0) {
        reset({ rules: initialRules.map(r => ({ title: r.title, description: r.description })) });
      } else {
        reset({ rules: [] });
      }
    }
  }, [isOpen, initialRules, reset]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const res = await groupApi.updateGroupRules(groupId, data);
      if (res.code === 1000) {
        toast.success("Cập nhật nội quy thành công!");
        onSuccess && onSuccess();
        onClose();
      } else {
        toast.error("Cập nhật thất bại!");
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Lỗi khi cập nhật nội quy!");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragStart = (e, index) => {
    e.dataTransfer.setData("text/plain", index);
  };

  const handleDrop = (e, index) => {
    const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (!isNaN(fromIndex) && fromIndex !== index) {
      move(fromIndex, index);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa Nội quy nhóm</DialogTitle>
          <DialogDescription>
            Thiết lập các điều luật (tối đa 10) mà thành viên cần tuân thủ. Kéo thả để sắp xếp lại thứ tự.
          </DialogDescription>
        </DialogHeader>

        <form id="rules-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto pr-2 space-y-4 mt-2">
          {fields.map((item, index) => (
            <div 
              key={item.id} 
              className="relative bg-muted/30 p-4 rounded-xl border group flex gap-3"
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, index)}
            >
              <div className="flex-shrink-0 cursor-grab text-muted-foreground/50 hover:text-foreground mt-2">
                <GripVertical className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <Input 
                    placeholder={`Điều ${index + 1}: Tiêu đề (Bắt buộc)`} 
                    {...register(`rules.${index}.title`)} 
                    className={errors.rules?.[index]?.title ? "border-red-500" : ""}
                  />
                  {errors.rules?.[index]?.title && (
                    <p className="text-red-500 text-xs mt-1">{errors.rules[index].title.message}</p>
                  )}
                </div>
                <div>
                  <Textarea 
                    placeholder="Mô tả chi tiết (Tùy chọn)" 
                    {...register(`rules.${index}.description`)} 
                    className="resize-none h-20"
                  />
                </div>
              </div>
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="text-red-500 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                onClick={() => remove(index)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}

          {fields.length < 10 && (
            <Button 
              type="button" 
              variant="outline" 
              className="w-full border-dashed gap-2 h-12"
              onClick={() => append({ title: "", description: "" })}
            >
              <Plus className="w-4 h-4" /> Thêm điều luật
            </Button>
          )}
          
          {errors.rules && typeof errors.rules.message === 'string' && (
             <p className="text-red-500 text-sm text-center">{errors.rules.message}</p>
          )}
        </form>

        <DialogFooter className="mt-4 pt-4 border-t">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>Hủy</Button>
          <Button type="submit" form="rules-form" disabled={isLoading}>
            {isLoading ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
