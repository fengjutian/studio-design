import { describe, expect, it } from "vitest";
import { parseDirectorJson } from "./aiDirector";

describe("AI director response parser", () => {
  it("removes model thinking and JSON fences", () => {
    const result = parseDirectorJson('<think>planning</think>\n```json\n{"title":"雨夜","synopsis":"故事","visualStyle":"写实","scenes":[]}\n```');
    expect(result.title).toBe("雨夜");
  });
});
