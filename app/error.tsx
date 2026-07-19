"use client";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-border-classic bg-surface p-8 text-center">
      <p className="font-serif text-lg font-bold">משהו השתבש</p>
      <p className="text-sm text-foreground/60">{error.message || "אירעה שגיאה בלתי צפויה."}</p>
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
      >
        נסה שוב
      </button>
    </div>
  );
}
