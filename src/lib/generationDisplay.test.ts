import { describe, expect, it } from "vitest";
import { createDirectorProposal } from "./director";
import { showContinuityWarnings } from "./generationDisplay";

describe("stale media during regeneration", () => {
  it("does not obscure progress, interrupted tasks or failures with stale warnings", () => {
    const shot = createDirectorProposal("雨夜").scenes[0].shots[0];
    shot.continuityStale = true;
    shot.generationStatus = "generating";
    expect(showContinuityWarnings(shot)).toBe(false);
    shot.generationStatus = "failed";
    expect(showContinuityWarnings(shot)).toBe(false);
    shot.generationStatus = "completed";
    expect(showContinuityWarnings(shot)).toBe(true);
  });
});
