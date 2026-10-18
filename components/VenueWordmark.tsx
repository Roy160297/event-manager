// The venue's name set as a wordmark: bold uppercase words, with any word that
// ends in a period ("No.") in a small italic serif - which is how
// "House No. Seven" has always been drawn, now generated from the name the
// venue sets in its settings.
export function VenueWordmark({ name, size }: { name: string; size: "sm" | "lg" }) {
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
