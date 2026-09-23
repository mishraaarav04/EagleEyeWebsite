// The Eagle Eye logo mark: a yellow disc with a stylized eye.
export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden className="logo-mark">
      <circle cx="24" cy="24" r="24" fill="var(--yellow-accent)" />
      <path d="M8 24 Q24 9 40 24 Q24 39 8 24 Z" fill="var(--ink)" />
      <circle cx="24" cy="24" r="6.5" fill="var(--yellow-accent)" />
      <circle cx="24" cy="24" r="2.8" fill="var(--ink)" />
    </svg>
  );
}
