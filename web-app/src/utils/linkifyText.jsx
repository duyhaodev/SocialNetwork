const URL_REGEX = /(https?:\/\/[^\s]+)/g;

/**
 * Parse text và wrap URL thành <a> clickable.
 * Trả về array gồm string và JSX element.
 */
export function linkifyText(text) {
  if (!text) return text;

  const parts = text.split(URL_REGEX);

  return parts.map((part, i) => {
    if (URL_REGEX.test(part)) {
      // Reset lastIndex vì split + test dùng chung regex stateful
      URL_REGEX.lastIndex = 0;

      // Rút gọn URL dài để hiển thị gọn hơn
      let displayUrl = part;
      try {
        const url = new URL(part);
        displayUrl = url.hostname + (url.pathname !== "/" ? url.pathname : "");
        if (displayUrl.length > 40) displayUrl = displayUrl.slice(0, 40) + "…";
      } catch {}

      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:opacity-80 transition-opacity break-all"
          style={{ color: "inherit", textDecorationColor: "rgba(255,255,255,0.5)" }}
          onClick={(e) => e.stopPropagation()}
          title={part}
        >
          {displayUrl}
        </a>
      );
    }
    URL_REGEX.lastIndex = 0;
    return part;
  });
}
