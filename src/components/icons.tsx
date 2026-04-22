import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = (size?: number): SVGProps<SVGSVGElement> => ({
  width: size ?? 14,
  height: size ?? 14,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
});

export const IPlus = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><path d="M12 5v14M5 12h14"/></svg>
);
export const ISearch = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
);
export const IBell = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9Z"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>
);
export const IFilter = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><path d="M3 5h18M6 12h12M10 19h4"/></svg>
);
type ChevProps = IconProps & { dir?: "left" | "right" | "up" | "down" };
export const IChev = ({ size, dir = "right", ...p }: ChevProps) => {
  const d =
    dir === "down" ? "m6 9 6 6 6-6" :
    dir === "up"   ? "m6 15 6-6 6 6" :
    dir === "left" ? "m15 6-6 6 6 6" :
                     "m9 6 6 6-6 6";
  return <svg {...base(size ?? 12)} {...p}><path d={d}/></svg>;
};
export const IClock = ({ size, ...p }: IconProps) => (
  <svg {...base(size ?? 12)} {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
);
export const IMsg = ({ size, ...p }: IconProps) => (
  <svg {...base(size ?? 12)} {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/></svg>
);
export const ICheck = ({ size, ...p }: IconProps) => (
  <svg {...base(size ?? 12)} {...p}><path d="M4 12l5 5L20 6"/></svg>
);
export const IX = ({ size, ...p }: IconProps) => (
  <svg {...base(size ?? 12)} {...p}><path d="M6 6l12 12M18 6 6 18"/></svg>
);
export const ICal = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
);
export const IUser = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><circle cx="12" cy="8" r="4"/><path d="M3 21a9 9 0 0 1 18 0"/></svg>
);
export const IUsers = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0"/><path d="M16 4a4 4 0 0 1 0 8M22 20a7 7 0 0 0-4-6.3"/></svg>
);
export const IList = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
);
export const IKanban = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="17" y="4" width="4" height="13" rx="1"/></svg>
);
export const IHome = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><path d="M3 11 12 3l9 8v10a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1Z"/></svg>
);
export const IChart = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><path d="M3 21h18M6 17V10M11 17V5M16 17v-9M21 17v-4"/></svg>
);
export const ISettings = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
);
export const IMore = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></svg>
);
export const ISend = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><path d="m22 2-11 11M22 2l-7 20-4-9-9-4Z"/></svg>
);
export const ITag = ({ size, ...p }: IconProps) => (
  <svg {...base(size ?? 12)} {...p}><path d="m20 12-8 8a2 2 0 0 1-3 0l-6-6a2 2 0 0 1 0-3l8-8h6v6a2 2 0 0 1 0 3Z"/><circle cx="15" cy="9" r="1"/></svg>
);
export const IArrowR = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><path d="M5 12h14M13 5l7 7-7 7"/></svg>
);
export const ILock = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
);
export const IEye = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
);
export const IClip = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><path d="m21 12-8.5 8.5a5 5 0 0 1-7-7L14 5a3.5 3.5 0 0 1 5 5L10.5 18.5a2 2 0 0 1-3-3L16 7"/></svg>
);
export const IChat = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5Z"/></svg>
);
export const IFlag = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><path d="M4 22V4h14l-3 4 3 4H4"/></svg>
);
export const ITrash = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><path d="M3 7h18M8 7V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 7l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7"/><path d="M10 11v6M14 11v6"/></svg>
);
