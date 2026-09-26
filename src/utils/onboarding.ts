export const ONBOARDING_COMPLETED_KEY = "rumo:onboarding-completed";
export function isOnboardingCompleted() {
  try { return localStorage.getItem(ONBOARDING_COMPLETED_KEY) === "true"; }
  catch { return false; }
}
export function saveOnboardingCompleted() {
  try { localStorage.setItem(ONBOARDING_COMPLETED_KEY, "true"); }
  catch { /* Keep navigation available if browser storage is blocked or full. */ }
}
