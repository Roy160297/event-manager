// The venue's name set as a wordmark: bold uppercase words, with any word that
// ends in a period ("No.") in a small italic serif - which is how
// "House No. Seven" has always been drawn, now generated from the name the
// venue sets in its settings.
export function VenueWordmark({ name, size, logoUrl }: { name: string; size: "sm" | "lg"; logoUrl?: string | null }) {
  // A venue that uploaded a logo shows that instead of the name set as text.
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt={name} className={`w-auto shrink-0 object-contain ${size === "lg" ? "h-14 max-w-48" : "h-9 max-w-32"}`} />
    );
  }

  const words = name.trim().split(/\s+/).filter(Boolean);
  const bold = size === "lg" ? "text-2xl" : "text-lg";
  const small = size === "lg" ? "text-lg" : "text-sm";

  return (
    <div dir="ltr" aria-label={name} className={`flex shrink-0 items-baseline text-foreground ${size === "lg" ? "gap-1.5" : "gap-1"}`}>
      {words.map((word, index) =>
        word.endsWith(".") ? (
          <span key={index} className={`font-serif ${small} italic text-foreground/80`}>
            {word}
          </span>
        ) : (
          <span key={index} className={`${bold} font-black uppercase tracking-tight`}>
            {word}
          </span>
        ),
      )}
    </div>
  );
}
