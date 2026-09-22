"use client";

import { useRef, useState, useTransition } from "react";
import { sendWelcomeEmail } from "@/app/events/actions";
import { EditableRecipientList } from "@/components/EditableRecipientList";
import { WELCOME_EMAIL_ATTACHMENT_FILENAME } from "@/lib/welcomeEmail";

export function WelcomeEmailForm({
  eventId,
  to1,
  to2,
  managerName,
  defaultSubject,
  defaultBody,
  cancelLabel,
  onSent,
  onCancel,
}: {
  eventId: string;
  to1: string | null;
  to2: string | null;
  managerName: string | null;
  defaultSubject: string;
  defaultBody: string;
  cancelLabel: string;
  onSent?: () => void;
  onCancel: () => void;
}) {
  const [sent, setSent] = useState(false);
  const [toList, setToList] = useState<string[]>([to1, to2].filter((v): v is string => !!v));
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSend() {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      for (const email of toList) formData.append("to", email);
      formData.set("subject", subject);
      formData.set("body", body);
      if (managerName) formData.set("managerName", managerName);
      if (attachment) formData.set("attachment", attachment);
      const result = await sendWelcomeEmail(eventId, formData);
      if (result) {
        setError(result);
        return;
      }
      setSent(true);
      onSent?.();
    });
  }

  if (sent) {
    return <p className="text-sm font-medium text-accent">המייל נשלח בהצלחה אל {toList.join(", ")}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <EditableRecipientList label="נשלח אל:" emails={toList} onChange={setToList} />

      <div className="flex flex-col gap-1 text-sm">
        <span className="text-foreground/70">
          קובץ מצורף: {attachment ? attachment.name : `"${WELCOME_EMAIL_ATTACHMENT_FILENAME}"`}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="self-start rounded-full border border-accent px-2 py-1 text-xs text-accent hover:bg-accent-soft"
          >
            {attachment ? "החלף קובץ" : "צרף קובץ אחר"}
          </button>
          {attachment && (
            <button
              type="button"
              onClick={() => {
                setAttachment(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="text-xs text-foreground/60 hover:underline"
            >
              חזרה לקובץ ברירת המחדל
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
        />
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">נושא</span>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="rounded-md border border-border-classic bg-surface px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">תוכן המייל</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={Math.max(20, body.split("\n").length + 4)}
          className="rounded-md border border-border-classic bg-surface px-3 py-2 font-sans"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSend}
          disabled={isPending || toList.length === 0}
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "שולח..." : "שלח מייל"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-foreground/60 hover:underline">
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}
