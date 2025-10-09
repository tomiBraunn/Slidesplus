import React, { useMemo } from "react";

type Props = {
  avatar?: string | null;
  size?: number;
};

function ensureDataUrl(v?: string | null): string | undefined {
  if (!v) return undefined;
  if (v.startsWith("data:")) return v; // ya viene completo
  // si guardaste solo el base64, usa el prefijo correcto (SVG o PNG según tu backend)
  return `data:image/svg+xml;base64,${v}`;
}

export default function UserPicture({ avatar, size = 38 }: Props) {
  const localUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const raw = avatar ?? localUser?.avatar ?? null;
  const src = ensureDataUrl(raw);

  return (
    <div
      className="rounded-full overflow-hidden bg-[#e5e7eb]"
      style={{ width: size, height: size }}
      title="User"
    >
      {src ? (
        <img
          src={src}
          alt="User"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          draggable={false}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#6b7280",
            fontWeight: 700,
          }}
        >
          ?
        </div>
      )}
    </div>
  );
}