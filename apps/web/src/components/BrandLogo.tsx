type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
  compact?: boolean;
};

export const BRAND_NAME = "Haseen Plus+";
export const BRAND_TAGLINE = "Compliance at its Smartest";
export const BRAND_LOGO_SRC = "/haseen-plus-logo.jpg";

export default function BrandLogo({
  className = "",
  imageClassName = "",
  compact = false,
}: BrandLogoProps) {
  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-gray-200 shadow-sm ${className}`}
    >
      <img
        src={BRAND_LOGO_SRC}
        alt={BRAND_NAME}
        className={`block object-contain ${compact ? "h-8 max-w-28" : "h-16 max-w-52"} ${imageClassName}`}
      />
    </span>
  );
}
