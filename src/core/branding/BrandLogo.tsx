import { Link } from "@tanstack/react-router";
import { PartyPopper } from "lucide-react";

const SIZES = {
  sm: { icon: "h-5 w-5", text: "text-xl" },
  md: { icon: "h-6 w-6", text: "text-2xl sm:text-3xl" },
  lg: { icon: "h-8 w-8", text: "text-3xl sm:text-4xl" },
} as const;

type BrandLogoProps = {
  size?: keyof typeof SIZES;
  textClassName?: string;
};

/** App brand: festive pictogram + "Ma Belle Table". */
export function BrandLogo({ size = "sm", textClassName = "text-accent" }: BrandLogoProps) {
  const s = SIZES[size];
  return (
    <Link to="/" className={`inline-flex items-center gap-2 font-serif font-extrabold ${s.text} ${textClassName}`}>
      <PartyPopper className={`${s.icon} -rotate-12 shrink-0`} strokeWidth={2.4} aria-hidden />
      <span className="truncate">Ma Belle Table</span>
    </Link>
  );
}
