import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PRIVATE_EVENT_TYPE_LABELS } from "@/lib/privateEvents";
import { formatDate } from "@/lib/labels";
import { PrivateEventSubNav } from "@/components/PrivateEventSubNav";
import type { PrivateEventRow } from "@/lib/types";

export default async function PrivateEventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("private_events")
    .select("*")
    .eq("id", id)
    .returns<PrivateEventRow[]>()
    .single();

  if (!event) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-foreground/80">
          <Link href="/private-events">האירועים הפרטיים שלי</Link> / {event.name}
        </p>
        <h1 className="font-serif text-2xl font-bold">{event.name}</h1>
        <p className="text-sm text-foreground/80">
          {PRIVATE_EVENT_TYPE_LABELS[event.event_type]} · {formatDate(event.event_date)}
          {event.hall_name && ` · ${event.hall_name}`}
        </p>
      </div>

      <PrivateEventSubNav eventId={id} />

      {children}
    </div>
  );
}
