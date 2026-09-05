import { describe, expect, it } from "vitest";
import { cleanExpandedIdea, parseDirectorJson } from "./aiDirector";

describe("AI director response parser", () => {
  it("removes model thinking and JSON fences", () => {
    const result = parseDirectorJson('<think>planning</think>\n```json\n{"title":"雨夜","synopsis":"故事","visualStyle":"写实","scenes":[]}\n```');
    expect(result.title).toBe("雨夜");
  });

  it("cleans thinking and fences from an expanded idea", () => {
    expect(cleanExpandedIdea("<think>plan</think>\n```text\n雨夜，一名邮差送来十年前的信。\n```")).toBe("雨夜，一名邮差送来十年前的信。");
  });
});
