import React, { useMemo } from "react";

const SpotifyView = ({ url }) => {
  const embedUrl = useMemo(() => {
    if (!url) return null;
    const match = url.match(/track\/([a-zA-Z0-9]+)/);
    if (match && match[1]) {
      return `https://open.spotify.com/embed/track/${match[1]}?utm_source=generator&theme=0`;
    }
    return null;
  }, [url]);

  if (!embedUrl) return null;

  return (
    <div className="mb-4 w-full w-full animate-in fade-in duration-700">
      <iframe
        style={{ borderRadius: "12px" }}
        src={embedUrl}
        width="100%"
        height="80"
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        title="Spotify Preview"
      ></iframe>
    </div>
  );
};

export default SpotifyView;