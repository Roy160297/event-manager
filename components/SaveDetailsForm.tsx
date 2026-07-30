"use client";

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
  // Return an error message to show it inline instead of saving. This must
  // be a *returned* string, not a thrown Error: Next.js redacts thrown-error
  // messages to a generic "something went wrong" string in production for
  // any Server Action invoked this way, no matter where the throw is caught
  // on the client - returning the message is the only way the real text
  // reaches the user.
  action: (formData: FormData) => Promise<string | void>;
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
  const [state, formAction] = useActionState<SaveState, FormData>(
    async (prevState, formData) => {
      const error = await action(formData);
      if (error) return { count: prevState.count, error };
      return { count: prevState.count + 1, error: null };
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
