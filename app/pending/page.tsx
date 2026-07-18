import { signOut } from "@/app/login/actions";

export default function PendingPage() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-lg border border-border-classic bg-surface p-8 text-center">
        <h1 className="font-serif text-xl font-bold">ממתין לשיוך הרשאות</h1>
        <p className="text-sm text-foreground/60">
          המערכת זיהתה אתכם כאיש/אשת צוות, אך עדיין לא הוגדר עבורכם תפקיד. פנו למנהל המערכת כדי שיקצה לכם תפקיד בעמוד
          ניהול המשתמשים.
        </p>
        <form action={signOut}>
          <button type="submit" className="rounded-full border border-border-classic px-4 py-2 text-sm hover:bg-accent-soft">
            התנתקות
          </button>
        </form>
      </div>
    </div>
  );
}
