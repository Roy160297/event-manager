import { PageSkeleton } from "@/components/PageSkeleton";

// Shown inside the event's own layout, so the event header and tabs stay put
// while a tab's content is loading.
export default function Loading() {
  return <PageSkeleton />;
}
