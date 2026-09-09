import { describe, expect, it } from "vitest";
import { cleanExpandedIdea, parseDirectorJson, parsePromptAnalysis } from "./aiDirector";

describe("AI director response parser", () => {
  it("removes model thinking and JSON fences", () => {
    const result = parseDirectorJson('<think>planning</think>\n```json\n{"title":"雨夜","synopsis":"故事","visualStyle":"写实","scenes":[]}\n```');
    expect(result.title).toBe("雨夜");
  });

  it("cleans thinking and fences from an expanded idea", () => {
    expect(cleanExpandedIdea("<think>plan</think>\n```text\n雨夜，一名邮差送来十年前的信。\n```")).toBe("雨夜，一名邮差送来十年前的信。");
  });

  it("parses and clamps a video prompt analysis", () => {
    const result = parsePromptAnalysis('```json\n{"score":108,"verdict":"适合","summary":"画面明确","strengths":["动作清楚"],"risks":[],"suggestions":["补充时长"]}\n```');
    expect(result.score).toBe(100);
    expect(result.verdict).toBe("适合");
    expect(result.suggestions).toEqual(["补充时长"]);
  });

  it("rejects malformed video prompt analyses", () => {
    expect(() => parsePromptAnalysis('{"score":80,"verdict":"也许"}')).toThrow("无法解析");
  });
});
