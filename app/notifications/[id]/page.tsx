import { createClient } from "@/lib/supabase/server";
import { formatDate, formatTime } from "@/lib/labels";
import type { PushNotificationLogRow } from "@/lib/types";

export default async function NotificationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: notification } = await supabase
    .from("push_notification_log")
    .select("*")
    .eq("id", id)
    .maybeSingle<PushNotificationLogRow>();

  if (!notification) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-foreground/60">ההתראה לא נמצאה.</p>
      </div>
    );
  }

  const createdAt = new Date(notification.created_at);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border border-border-classic bg-surface p-4">
        <h1 className="text-xl font-bold">{notification.title}</h1>
        <p className="whitespace-pre-wrap text-foreground/80">{notification.body}</p>
        <p className="text-xs text-foreground/50">
          {formatDate(createdAt.toISOString().slice(0, 10))} · {formatTime(createdAt.toTimeString().slice(0, 5))}
        </p>
      </div>
    </div>
  );
}
