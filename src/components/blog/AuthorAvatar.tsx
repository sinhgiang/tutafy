// Leo Yang's author photo — AVIF with a WebP fallback, kept tiny (~19 KB).
export function AuthorAvatar({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`inline-block rounded-full overflow-hidden bg-indigo-100 flex-shrink-0 ${className}`} style={{ width: size, height: size }}>
      <picture>
        <source srcSet="/leo-yang.avif" type="image/avif" />
        <img src="/leo-yang.webp" alt="Leo Yang" width={size} height={size} className="w-full h-full object-cover" loading="lazy" />
      </picture>
    </span>
  )
}
