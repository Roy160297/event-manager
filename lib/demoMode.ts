// Set NEXT_PUBLIC_DEMO_MODE=1 (only in the separate demo environment, see
// .env.demo) to swap the venue's branding for a neutral placeholder and hide
// links to external systems, so the app can be screen-recorded for demos.
export const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "1";
export const DEMO_VENUE_NAME = "Demo Venue";
