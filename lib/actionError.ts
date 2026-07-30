// Shared by every "use server" wrapper passed to SaveDetailsForm as its
// `action` prop: catch the real action's thrown error and return its
// message instead of letting it propagate, since Next.js redacts thrown
// Server Action error messages to a generic string in production - only a
// *returned* value crosses the wire with its real content intact.
export function actionErrorMessage(err: unknown, fallback = "שגיאה בשמירה"): string {
  return err instanceof Error ? err.message : fallback;
}
