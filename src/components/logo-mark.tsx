export function LogoMark({
  className,
  mono = false,
}: {
  className?: string;
  mono?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="64" height="64" rx="14" fill="#111318" />
      {/* table header row */}
      <rect x="14" y="14" width="36" height="7" rx="2" fill="#ffffff" />
      {/* body row 1 */}
      <rect x="14" y="25" width="16" height="10" rx="2" fill="#ffffff" />
      <rect x="34" y="25" width="16" height="10" rx="2" fill="#ffffff" />
      {/* body row 2 */}
      <rect x="14" y="40" width="16" height="10" rx="2" fill="#ffffff" />
      <rect
        x="34"
        y="40"
        width="16"
        height="10"
        rx="2"
        fill={mono ? "#ffffff" : "#16a34a"}
      />
    </svg>
  );
}
