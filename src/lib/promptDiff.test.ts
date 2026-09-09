import { describe, expect, it } from "vitest";
import { diffPromptVersions } from "./promptDiff";

describe("prompt version diff", () => {
  it("marks inserted and removed Chinese text", () => {
    const result = diffPromptVersions("雨夜，黑猫奔跑", "雨夜，黑猫快速奔跑");
    expect(result.after.filter((part) => part.type === "added").map((part) => part.value).join("")).toBe("快速");
    expect(result.before.filter((part) => part.type === "removed")).toHaveLength(0);
  });
});
