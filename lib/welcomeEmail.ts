// The body is a template the venue edits in its settings: {{manager_name}} is
// the assigned event manager's name (or, if none is assigned yet, whoever is
// sending the email) and {{signature}} that name plus their phone - the couple
// should hear from a real name and number, not a hardcoded signature.
export function buildWelcomeEmailBody(template: string, managerName: string, managerPhone: string | null): string {
  const signature = managerPhone ? `${managerName}, ${managerPhone}` : managerName;
  return template.replaceAll("{{manager_name}}", managerName).replaceAll("{{signature}}", signature);
}
