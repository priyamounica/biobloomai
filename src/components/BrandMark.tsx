import logo from "@/assets/biobloom-logo.png";
import { cn } from "@/lib/utils";

export function BrandMark({
  size = 32,
  className,
  showWordmark = false,
}: {
  size?: number;
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img
        src={logo}
        alt="BioBloomai logo"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="rounded-xl"
      />
      {showWordmark && (
        <span className="font-serif text-xl tracking-tight">
          BioBloom<span className="text-terracotta">ai</span>
        </span>
      )}
    </span>
  );
}
