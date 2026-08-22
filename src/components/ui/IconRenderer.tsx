export function IconRenderer({ icon, size = "text-xl", className = "" }: { icon: string; size?: string; className?: string }) {
  if (!icon) return <span className={`${size} ${className}`}>📌</span>
  
  // Support full paths (like /icons/image-xxx.png) or just filenames (image-xxx.png)
  const isImage = icon.includes(".png") || icon.includes(".webp") || icon.includes(".jpg") || icon.includes(".svg")
  
  if (isImage) {
    const src = icon.startsWith("/") ? icon : `/icons/${icon}`
    return (
      <img 
        src={src}
        alt="icon" 
        className={`object-contain ${className}`}
        style={{ width: "1.5em", height: "1.5em" }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
      />
    )
  }
  
  return <span className={`${size} ${className}`}>{icon}</span>
}
