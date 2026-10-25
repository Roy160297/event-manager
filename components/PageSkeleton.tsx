// What is shown the moment a link is clicked, while the next page is still being
// built on the server (the app's loading.tsx files). It only keeps the screen
// responsive; the page itself replaces it as soon as it is ready.
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-live="polite">
      <span className="sr-only">טוען...</span>
      <div className="h-7 w-1/3 animate-pulse rounded-md bg-foreground/10" />
      <div className="flex flex-col gap-3 rounded-lg border border-border-classic bg-surface p-4">
        <div className="h-4 w-2/3 animate-pulse rounded bg-foreground/10" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-foreground/10" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-foreground/10" />
      </div>
      <div className="flex flex-col gap-3 rounded-lg border border-border-classic bg-surface p-4">
        <div className="h-4 w-1/2 animate-pulse rounded bg-foreground/10" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-foreground/10" />
      </div>
    </div>
  );
}
