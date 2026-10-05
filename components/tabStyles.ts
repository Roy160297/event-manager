// Shared look for section tabs (admin users/roles, reminders, the event and
// private-event sub-navs): filled pill for the current tab, outlined pill for
// the rest - the same visual language as the main nav.
export const TAB_NAV_CLASS = "flex flex-wrap gap-2";

export function tabLinkClass(isActive: boolean): string {
  return isActive
    ? "rounded-full border-2 border-accent bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-sm"
    : "rounded-full border-2 border-border-classic bg-background px-4 py-2 text-sm font-medium text-accent hover:bg-accent-soft";
}
