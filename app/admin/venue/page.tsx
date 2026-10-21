import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { canRead, canWrite } from "@/lib/permissions";
import { NoPermissionNotice } from "@/components/NoPermissionNotice";
import { SaveDetailsForm } from "@/components/SaveDetailsForm";
import { venueLogoUrl, type VenueSettings } from "@/lib/venueSettings";
import { saveVenueSettings } from "./actions";
import { WelcomeAttachments } from "./WelcomeAttachments";
import { VenueLogo } from "./VenueLogo";

export default async function VenueSettingsPage() {
  const currentStaff = await getCurrentStaff();
  if (!currentStaff || !canRead(currentStaff.permissions, "venue_settings")) return <NoPermissionNotice />;
  const canEdit = canWrite(currentStaff.permissions, "venue_settings");

  const supabase = await createClient();
  const { data } = await supabase.from("venue_settings").select("*").eq("id", true).maybeSingle<VenueSettings>();
  if (!data) return <p className="text-foreground/60">הגדרות האולם לא נמצאו.</p>;

  const inputClass = "rounded-md border border-border-classic bg-surface px-3 py-2 disabled:opacity-70";
  const labelClass = "flex flex-col gap-1 text-sm";
  const hintClass = "text-xs text-foreground/60";

  return (
    <div className="flex flex-col gap-6">
      <SaveDetailsForm
        action={saveVenueSettings}
        message="ההגדרות נשמרו בהצלחה"
        className="flex flex-col gap-6 rounded-lg border border-border-classic bg-surface p-4"
      >
        <fieldset disabled={!canEdit} className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <p className="font-serif text-lg font-bold">זהות האולם</p>
            <label className={labelClass}>
              <span className="font-medium">שם האולם</span>
              <input name="venue_name" defaultValue={data.venue_name} required className={inputClass} />
              <span className={hintClass}>מוצג בכותרת האתר, בעמוד ההתחברות, כשם השולח של מיילים ובאפליקציה המותקנת.</span>
            </label>
            <label className={labelClass}>
              <span className="font-medium">שם היומן</span>
              <input name="calendar_name" defaultValue={data.calendar_name} required className={inputClass} />
              <span className={hintClass}>השם שיופיע ביומן Google או Apple אחרי הוספת האירועים אליו.</span>
            </label>
          </section>

          <section className="flex flex-col gap-3">
            <p className="font-serif text-lg font-bold">מייל סיכום האירוע (הצ&apos;קליסטים והדוח)</p>
            <label className={labelClass}>
              <span className="font-medium">נמענים</span>
              <textarea
                name="checklist_email_to"
                rows={5}
                defaultValue={data.checklist_email_to.join("\n")}
                className={inputClass}
                dir="ltr"
              />
              <span className={hintClass}>כתובת אחת בכל שורה. אלה ברירות המחדל, ואפשר לשנות אותן גם בזמן השליחה.</span>
            </label>
            <label className={labelClass}>
              <span className="font-medium">עותק (CC)</span>
              <textarea
                name="checklist_email_cc"
                rows={3}
                defaultValue={data.checklist_email_cc.join("\n")}
                className={inputClass}
                dir="ltr"
              />
            </label>
          </section>

          <section className="flex flex-col gap-3">
            <p className="font-serif text-lg font-bold">מייל הפתיחה לזוג</p>
            <label className={labelClass}>
              <span className="font-medium">נושא</span>
              <input name="welcome_email_subject" defaultValue={data.welcome_email_subject} className={inputClass} />
            </label>
            <label className={labelClass}>
              <span className="font-medium">תוכן המייל</span>
              <textarea name="welcome_email_body" rows={18} defaultValue={data.welcome_email_body} className={inputClass} />
              <span className={hintClass}>
                אפשר להשתמש ב-<bdi>{"{{manager_name}}"}</bdi> (שם מנהל האירוע) וב-<bdi>{"{{signature}}"}</bdi> (שם וטלפון),
                והם יתמלאו אוטומטית בכל אירוע. לפני השליחה אפשר עדיין לערוך את הטקסט.
              </span>
            </label>
            <label className={labelClass}>
              <span className="font-medium">שם הקובץ המצורף כפי שהזוג יראה אותו</span>
              <input
                name="welcome_email_attachment_filename"
                defaultValue={data.welcome_email_attachment_filename}
                className={inputClass}
              />
            </label>
          </section>

          <section className="flex flex-col gap-3">
            <p className="font-serif text-lg font-bold">אירועים חדשים</p>
            <label className={labelClass}>
              <span className="font-medium">טקסט התחלתי בשדה &quot;מידע נוסף&quot; בחתונות</span>
              <textarea name="default_additional_info" rows={5} defaultValue={data.default_additional_info} className={inputClass} />
              <span className={hintClass}>
                מופיע בסקירה של אירוע (שאינו אירוע עסקי) שבו עדיין לא נכתב מידע נוסף, למשל שאלות שחשוב לעבור עליהן בפגישה עם הזוג.
              </span>
            </label>
          </section>

          {canEdit && (
            <button
              type="submit"
              className="self-start rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
            >
              שמירת הגדרות
            </button>
          )}
        </fieldset>
      </SaveDetailsForm>

      <VenueLogo logoUrl={venueLogoUrl(data)} venueName={data.venue_name} canEdit={canEdit} />

      <WelcomeAttachments canEdit={canEdit} />
    </div>
  );
}
