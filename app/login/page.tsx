import { signInWithGoogle } from "./actions";

const ERROR_MESSAGES: Record<string, string> = {
  not_authorized: "כתובת האימייל שלך אינה רשומה כאנשי צוות במערכת. פנו למנהל המערכת כדי להוסיף אתכם.",
  auth: "אירעה שגיאה בתהליך ההתחברות. נסו שוב.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.auth) : null;

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-lg border border-border-classic bg-surface p-8 text-center">
        <div>
          <h1 className="font-serif text-2xl font-bold text-accent">ניהול אירועים</h1>
          <p className="mt-1 text-sm text-foreground/60">מערכת פנימית לצוות House No. Seven</p>
        </div>

        {errorMessage && <p className="w-full rounded-md bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>}

        <form action={signInWithGoogle} className="w-full">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-full border border-border-classic bg-background px-4 py-2.5 text-sm font-medium hover:bg-accent-soft"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.28 1.48-1.13 2.73-2.4 3.58v2.98h3.88c2.27-2.09 3.54-5.17 3.54-8.8z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.07 7.93-2.92l-3.88-2.98c-1.08.72-2.45 1.15-4.05 1.15-3.11 0-5.75-2.1-6.69-4.92H1.3v3.09C3.26 21.3 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.31 14.33c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28V6.68H1.3A11.98 11.98 0 0 0 0 12.05c0 1.93.46 3.76 1.3 5.37l4.01-3.09z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.3 6.68l4.01 3.09c.94-2.82 3.58-4.92 6.69-4.92z"
              />
            </svg>
            התחברות עם Google
          </button>
        </form>
      </div>
    </div>
  );
}
