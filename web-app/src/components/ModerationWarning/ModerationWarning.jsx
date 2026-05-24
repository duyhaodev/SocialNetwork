import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { ShieldAlert, ShieldX, AlertTriangle, X } from "lucide-react";

const LEVEL_CONFIG = {
  mild: {
    icon: AlertTriangle,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10 border-yellow-400/30",
    label: "Mild Warning",
    canPost: true,
  },
  moderate: {
    icon: ShieldAlert,
    color: "text-orange-400",
    bg: "bg-orange-400/10 border-orange-400/30",
    label: "Content Violation",
    canPost: false,
  },
  severe: {
    icon: ShieldX,
    color: "text-red-500",
    bg: "bg-red-500/10 border-red-500/30",
    label: "Severe Violation",
    canPost: false,
  },
};

const CATEGORY_COLORS = {
  profanity: "bg-yellow-500/20 text-yellow-300",
  hate_speech: "bg-orange-500/20 text-orange-300",
  violence: "bg-red-500/20 text-red-300",
  adult_content: "bg-pink-500/20 text-pink-300",
  personal_info: "bg-blue-500/20 text-blue-300",
  spam: "bg-gray-500/20 text-gray-300",
};

export default function ModerationWarning({
  open,
  onClose,
  onPostAnyway,
  result,
}) {
  if (!result || !open) return null;

  const level = LEVEL_CONFIG[result.warning_level] || LEVEL_CONFIG.moderate;
  const Icon = level.icon;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-[400px] p-0 gap-0 bg-[#181818] border-[#2a2a2a] [&>button]:hidden"
        aria-describedby="moderation-desc"
      >
        <DialogTitle className="sr-only">{level.label}</DialogTitle>
        <DialogDescription id="moderation-desc" className="sr-only">
          Content moderation warning
        </DialogDescription>

        {/* Header */}
        <div className={`flex items-center gap-3 px-4 py-3 border-b border-[#2a2a2a] ${level.bg}`}>
          <Icon className={`w-5 h-5 ${level.color}`} />
          <span className={`font-semibold ${level.color}`}>{level.label}</span>
          <button
            onClick={onClose}
            className="ml-auto p-1 rounded hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Message */}
          <p className="text-sm text-foreground">{result.message}</p>

          {/* Flagged items */}
          {result.flagged_items?.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Flagged content
              </span>
              <div className="flex flex-wrap gap-2">
                {result.flagged_items.map((item, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      CATEGORY_COLORS[item.category] || "bg-gray-500/20 text-gray-300"
                    }`}
                  >
                    <span className="font-semibold">"{item.word}"</span>
                    <span className="opacity-70">- {item.category_label}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suggestion */}
          {result.suggestion && (
            <div className="rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] p-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Suggestion
              </span>
              <p className="text-sm text-foreground mt-1">{result.suggestion}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#2a2a2a] flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="cursor-pointer"
          >
            Edit content
          </Button>
          {level.canPost && (
            <Button
              size="sm"
              variant="destructive"
              onClick={onPostAnyway}
              className="cursor-pointer"
            >
              Post anyway
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
