import type { Shot } from "../types";

// Existing media may stay stale while its replacement is running or has failed.
// The task's progress, recovery action or error must remain visible in that case.
export function showContinuityWarnings(shot?: Shot) {
  return shot?.generationStatus !== "generating" && shot?.generationStatus !== "failed";
}
