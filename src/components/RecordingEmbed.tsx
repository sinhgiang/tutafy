'use client'
export function RecordingEmbed({ url }: { url: string }) {
  // Detect Loom
  const loomMatch = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/)
  if (loomMatch) {
    return (
      <div style={{ paddingBottom: '56.25%', position: 'relative', height: 0 }}>
        <iframe
          src={`https://www.loom.com/embed/${loomMatch[1]}`}
          frameBorder="0"
          allowFullScreen
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: 8 }}
        />
      </div>
    )
  }
  // Detect YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
  if (ytMatch) {
    return (
      <div style={{ paddingBottom: '56.25%', position: 'relative', height: 0 }}>
        <iframe
          src={`https://www.youtube.com/embed/${ytMatch[1]}`}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: 8 }}
        />
      </div>
    )
  }
  // Fallback: plain link
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-[13px]">
      View Recording &rarr;
    </a>
  )
}
