import { useState } from "react";
import { Sparkles, RefreshCw, ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import aiApi from "../../api/aiApi";

const DEFAULT_NUM = 5;

export default function AISuggestPanel({ open, onOpenChange, onUseSuggestion }) {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [index, setIndex] = useState(0);

  const handleGenerate = async () => {
    const t = topic.trim();
    if (!t) return;

    setLoading(true);
    try {
      const res = await aiApi.suggest({
        context: t,
        language: "vi",
        num_suggestions: DEFAULT_NUM,
      });

      const items = res?.suggestions || [];
      if (!items.length) {
        toast.error("No suggestions generated, try a different topic!");
        setSuggestions([]);
        return;
      }
      setSuggestions(items);
      setIndex(0);
    } catch (err) {
      toast.error(err?.message || "Failed to generate AI suggestions!");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (!suggestions.length) return;
    setIndex((i) => (i + 1) % suggestions.length);
  };

  const handlePrev = () => {
    if (!suggestions.length) return;
    setIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
  };

  const handleUse = () => {
    const current = suggestions[index];
    if (!current) return;
    onUseSuggestion?.(current.text);
    onOpenChange(false);
    toast.success("Suggestion applied!");
  };

  const currentText = suggestions[index]?.text || "";
  const hasSuggestions = suggestions.length > 0;

  return (
    <div className="mt-2">
      {/* Toggle button - inline, nhỏ gọn */}
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm text-purple-300 hover:bg-purple-500/10 transition-colors cursor-pointer"
      >
        <Sparkles className="w-3 h-3" />
        <span>AI Suggest</span>
      </button>

      {open && (
        <div className="mt-1.5 rounded-lg border border-[#2a2a2a] bg-[#111] p-2 space-y-2">
          {/* Input + Generate - 1 dòng */}
          <div className="flex gap-1.5">
            <input
              placeholder="Topic..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              maxLength={120}
              className="flex-1 min-w-0 h-8 px-2.5 text-sm rounded-md bg-[#0a0a0a] border border-[#2a2a2a] text-foreground placeholder:text-muted-foreground outline-none focus:border-purple-500/50"
            />
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading || !topic.trim()}
              className="h-8 px-2.5 rounded-md text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40 cursor-pointer flex items-center gap-1 shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate</span>
                </>
              )}
            </button>
          </div>

          {/* Suggestion result - compact */}
          {hasSuggestions && (
            <div className="rounded-md bg-[#0a0a0a] border border-[#2a2a2a] px-2.5 py-2">
              <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
                {currentText}
              </p>

              {/* Controls - 1 dòng gọn */}
              <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-[#2a2a2a]">
                <span className="text-xs text-muted-foreground">
                  {index + 1}/{suggestions.length}
                </span>

                <div className="flex items-center gap-0.5">
                  <button type="button" onClick={handlePrev} disabled={suggestions.length < 2}
                    className="h-6 w-6 flex items-center justify-center rounded hover:bg-white/10 disabled:opacity-30 cursor-pointer" title="Previous">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={handleNext} disabled={suggestions.length < 2}
                    className="h-6 w-6 flex items-center justify-center rounded hover:bg-white/10 disabled:opacity-30 cursor-pointer" title="Next">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={handleGenerate} disabled={loading}
                    className="h-6 w-6 flex items-center justify-center rounded hover:bg-white/10 disabled:opacity-30 cursor-pointer" title="Regenerate">
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  </button>
                  <button type="button" onClick={handleUse}
                    className="h-6 ml-1 px-2 rounded-md text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white cursor-pointer flex items-center gap-0.5">
                    <Check className="w-2.5 h-2.5" />
                    Use
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
