"use client";

import { unstable_rethrow } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

interface SaveState {
  count: number;
  error: string | null;
}

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
  /**
   * Collapse any open <details> once the save succeeds - the nearest ancestor
   * <li> (e.g. a list row with its own "edit" toggle) if there is one,
   * otherwise the nearest ancestor <details> itself.
   */
  closeDetailsOnSave?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  // Errors thrown by `action` (validation, duplicate-date checks, etc.) must
  // be caught here rather than left to bubble up to the nearest error
  // boundary: Next.js redacts thrown-error messages to a generic "something
  // went wrong" string in production regardless of where the throw happens,
  // so surfacing them ourselves is the only way the real message reaches the
  // user. unstable_rethrow lets Next's own control-flow signals (redirect,
  // notFound) pass through undisturbed for actions that use them.
  const [state, formAction] = useActionState<SaveState, FormData>(
    async (prevState, formData) => {
      try {
        await action(formData);
        return { count: prevState.count + 1, error: null };
      } catch (err) {
        unstable_rethrow(err);
        return { count: prevState.count, error: err instanceof Error ? err.message : "שגיאה בשמירה" };
      }
    },
    { count: 0, error: null },
  );
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (state.count === 0) return;
    setShowToast(true);
    const timeout = setTimeout(() => setShowToast(false), 2500);
    if (closeDetailsOnSave) {
      const row = formRef.current?.closest("li");
      if (row) {
        row.querySelectorAll("details[open]").forEach((details) => details.removeAttribute("open"));
      } else {
        formRef.current?.closest("details")?.removeAttribute("open");
      }
    }
    return () => clearTimeout(timeout);
  }, [state.count, closeDetailsOnSave]);

  return (
    <form
      ref={formRef}
      action={formAction}
      // React 19 form actions call the form's native reset() on every
      // submit (see requestFormReset in react-dom). Our custom select-based
      // DateField/TimeField pickers have no HTML `selected` attribute on any
      // <option>, so a native reset snaps them to the first option (e.g.
      // 01/01 and year-3, or 00:00) instead of leaving the real value alone.
      // Cancelling the reset event stops this entirely - these are all
      // edit-and-save forms, never "clear after submit" forms.
      onReset={(e) => e.preventDefault()}
      className={className}
    >
      {children}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-lg">
          {message}
        </div>
      )}
    </form>
  );
}
