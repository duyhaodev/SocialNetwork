import { useState } from "react";
import { toast } from "sonner";
import postApi from "@/api/postApi";

const LANG_NAMES = {
  EN: "Anh", JA: "Nhật", KO: "Hàn", ZH: "Trung",
  FR: "Pháp", DE: "Đức", ES: "Tây Ban Nha", IT: "Ý",
  RU: "Nga", PT: "Bồ Đào Nha", NL: "Hà Lan", PL: "Ba Lan",
  TH: "Thái", ID: "Indonesia", AR: "Ả Rập",
};

export function PostTranslation({ isNonVietnamese, content }) {
  const [translatedText, setTranslatedText] = useState(null);
  const [detectedLang, setDetectedLang] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  const handleTranslate = async (e) => {
    e.stopPropagation();
    if (translatedText) {
      setShowTranslation((v) => !v);
      return;
    }
    setTranslating(true);
    try {
      const res = await postApi.translate(content);
      setTranslatedText(res?.result?.translatedText || res?.translatedText);
      setDetectedLang(res?.result?.detectedSourceLang || res?.detectedSourceLang);
      setShowTranslation(true);
    } catch (err) {
      toast.error("Dịch thất bại, vui lòng thử lại sau.");
    } finally {
      setTranslating(false);
    }
  };

  if (!isNonVietnamese) return null;

  return (
    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
      {showTranslation && translatedText && (
        <div className="mt-2 rounded-xl bg-muted/40 border border-border/50 px-3.5 py-2.5 shadow-sm text-sm text-foreground/90 leading-relaxed transition-all duration-200">
          <p className="whitespace-pre-wrap">{translatedText}</p>
          {detectedLang && (
            <div className="flex items-center gap-1 mt-1.5">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                Được dịch từ tiếng {LANG_NAMES[detectedLang] ?? detectedLang}
              </span>
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleTranslate}
        disabled={translating}
        className="mt-1 text-xs font-semibold text-blue-400 hover:text-blue-500 hover:underline transition-colors disabled:opacity-40"
      >
        {translating
          ? "Đang dịch..."
          : showTranslation
          ? "Ẩn bản dịch"
          : "Dịch bài đăng"}
      </button>
    </div>
  );
}
