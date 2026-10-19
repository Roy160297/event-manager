import { SaveDetailsForm } from "@/components/SaveDetailsForm";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { TrashIcon } from "@/components/icons";
import { removeVenueLogo, uploadVenueLogo } from "./logoActions";

// The venue logo shown in the site header and on the login page. Without one,
// the venue name is shown as text instead.
export function VenueLogo({ logoUrl, venueName, canEdit }: { logoUrl: string | null; venueName: string; canEdit: boolean }) {
  async function remove() {
    "use server";
    await removeVenueLogo();
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border-classic bg-surface p-4">
      <p className="font-serif text-lg font-bold">לוגו האולם</p>
      <p className="text-xs text-foreground/60">
        מוצג בכותרת האתר ובמסך ההתחברות במקום שם האולם. מומלצת תמונה עם רקע שקוף (PNG), באופן אופקי, עד 2MB.
      </p>

      <div className="flex min-h-20 items-center justify-center rounded-md border border-border-classic bg-background p-3">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={venueName} className="max-h-16 w-auto max-w-full object-contain" />
        ) : (
          <span className="text-sm text-foreground/60">לא הועלה לוגו, מוצג שם האולם כטקסט</span>
        )}
      </div>

      {canEdit && (
        <div className="flex flex-wrap items-center gap-3">
          <SaveDetailsForm
            action={uploadVenueLogo}
            message="הלוגו הועלה בהצלחה"
            clearOnSuccess
            className="flex flex-wrap items-center gap-2"
          >
            <input
              type="file"
              name="file"
              accept="image/png,image/jpeg,image/webp"
              required
              className="text-sm file:me-3 file:rounded-full file:border file:border-border-classic file:bg-background file:px-3 file:py-1.5 file:text-sm"
            />
            <button type="submit" className="rounded-full border border-accent px-4 py-1.5 text-sm text-accent hover:bg-accent-soft">
              {logoUrl ? "החלף לוגו" : "העלה לוגו"}
            </button>
          </SaveDetailsForm>
          {logoUrl && (
            <form action={remove}>
              <ConfirmSubmitButton
                message="להסיר את הלוגו? במקומו יוצג שם האולם כטקסט."
                className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50"
              >
                <TrashIcon className="h-4 w-4" />
                הסר לוגו
              </ConfirmSubmitButton>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
