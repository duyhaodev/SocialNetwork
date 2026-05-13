import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Slider } from "../ui/slider";

// Dùng canvas để cắt ảnh theo vùng crop đã chọn
async function getCroppedBlob(imageSrc, croppedAreaPixels) {
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  const size = Math.min(croppedAreaPixels.width, croppedAreaPixels.height);
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");

  // Vẽ hình tròn để clip
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();

  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    size,
    size
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
  });
}

export function AvatarCropDialog({ open, imageSrc, onClose, onCropDone }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
    const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
    onCropDone(file, URL.createObjectURL(blob));
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden bg-zinc-950 border-zinc-800 text-white [&>button]:hidden">
        <DialogHeader className="border-b border-zinc-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white" onClick={onClose}>
              Cancel
            </Button>
            <DialogTitle className="text-base font-semibold">Crop Avatar</DialogTitle>
            <Button size="sm" className="bg-white text-black hover:bg-zinc-200 font-semibold" onClick={handleConfirm}>
              Apply
            </Button>
          </div>
        </DialogHeader>

        {/* Vùng crop */}
        <div className="relative w-full bg-black" style={{ height: 320 }}>
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
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
