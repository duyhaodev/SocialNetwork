import { toast } from "sonner";

export const DEFAULT_AVATAR = "https://res.cloudinary.com/dqdivgrkz/image/upload/v1766129961/Gemini_Generated_Image_y5h7uy5h7uy5h7uy_r2wtrj.png";

export const showUnderDevelopmentToast = () => {
  toast.info("This feature is under development.");
};

