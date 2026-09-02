/** SKEMA logo — the official uncropped brand lockup. */
export function Logo({ className = "h-12" }: { className?: string }) {
  return (
    <img
      src="/skema-logo.png"
      alt="SKEMA, la solution tout-en-un pour votre établissement"
      className={`w-auto ${className}`}
    />
  );
}
