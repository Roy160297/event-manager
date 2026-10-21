import type { Guide } from "@/lib/guides";

const cardClass = "flex flex-col gap-3 rounded-lg border border-border-classic bg-surface p-4";
const listClass = "flex flex-col gap-1.5 text-sm";

// A guide page: a title, a short intro, then one card per section with its bullet items.
// Used by the couple-meeting guide and the event manager's procedures.
export function GuidePage({ guide }: { guide: Guide }) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{guide.title}</h1>
      {guide.intro && <p className="on-photo text-sm">{guide.intro}</p>}

      {guide.sections.map((section) => (
        <div key={section.id} className={cardClass}>
          <p className="text-sm font-semibold underline">{section.label}</p>
          <ul className={listClass}>
            {section.items.map((item) => (
              <li key={item.id}>{item.text}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
