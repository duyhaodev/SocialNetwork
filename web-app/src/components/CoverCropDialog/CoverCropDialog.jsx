import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Slider } from "../ui/slider";
import { motion } from "framer-motion";

// Dùng canvas để cắt ảnh theo vùng crop đã chọn (hình chữ nhật)
async function getCroppedBlob(imageSrc, croppedAreaPixels) {
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = croppedAreaPixels.width;
  canvas.height = croppedAreaPixels.height;

  const ctx = canvas.getContext("2d");

  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    croppedAreaPixels.width,
    croppedAreaPixels.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
  });
}

export function CoverCropDialog({ open, imageSrc, onClose, onCropDone, aspect = 3 }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
    const file = new File([blob], "cover.jpg", { type: "image/jpeg" });
    onCropDone(file, URL.createObjectURL(blob));
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden bg-zinc-950/65 backdrop-blur-xl border border-white/10 text-white [&>button]:hidden rounded-3xl shadow-2xl">
        <DialogHeader className="border-b border-white/10 px-5 py-4">
          <div className="flex items-center justify-between">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              className="text-sm font-semibold text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all duration-200 cursor-pointer"
              onClick={onClose}
            >
              Cancel
            </motion.button>
            <DialogTitle className="text-base font-bold tracking-tight text-foreground">Crop Cover Image</DialogTitle>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              className="bg-white text-black hover:bg-zinc-100 font-bold text-sm px-4 py-1.5 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center h-8"
              onClick={handleConfirm}
            >
              Apply
            </motion.button>
          </div>
        </DialogHeader>

        {/* Vùng crop */}
        <div className="relative w-full bg-black" style={{ height: 320 }}>
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              cropShape="rect"
              showGrid={true}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>

        {/* Zoom slider */}
        <div className="px-6 py-4 space-y-2">
          <p className="text-xs text-zinc-400 text-center">Pinch or scroll to zoom</p>
          <Slider
            min={1}
            max={3}
            step={0.01}
            value={[zoom]}
            onValueChange={([val]) => setZoom(val)}
            className="w-full"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
