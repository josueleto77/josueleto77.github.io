/* eslint-disable @next/next/no-img-element */
export default function Avatar({
  src,
  name,
  size = 40,
  className = "",
}: {
  src?: string;
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
      loading="lazy"
    />
  );
}
