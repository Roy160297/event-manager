"use client";

import { useActionState, useEffect, useRef, useState } from "react";

export function SaveDetailsForm({
  action,
  className,
  children,
  message = "הפרטים נשמרו בהצלחה",
  closeDetailsOnSave = false,
}: {
  action: (formData: FormData) => Promise<void>;
  className?: string;
  children: React.ReactNode;
  message?: string;
  /** Collapse the nearest ancestor <details> once the save succeeds. */
  closeDetailsOnSave?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [savedCount, formAction] = useActionState(async (prevCount: number, formData: FormData) => {
    await action(formData);
    return prevCount + 1;
  }, 0);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (savedCount === 0) return;
    setShowToast(true);
    const timeout = setTimeout(() => setShowToast(false), 2500);
    if (closeDetailsOnSave) formRef.current?.closest("details")?.removeAttribute("open");
    return () => clearTimeout(timeout);
  }, [savedCount, closeDetailsOnSave]);

  return (
    <form ref={formRef} action={formAction} className={className}>
      {children}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-lg">
          {message}
        </div>
      )}
    </form>
  );
}
