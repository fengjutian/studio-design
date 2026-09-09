export interface DiffPart { value: string; type: "same" | "added" | "removed" }

const tokenize = (value: string) => value.match(/[\u3400-\u9fff]|[A-Za-z0-9_]+|\s+|./gu) ?? [];

export function diffPromptVersions(before: string, after: string): { before: DiffPart[]; after: DiffPart[] } {
  const left = tokenize(before);
  const right = tokenize(after);
  if (left.length * right.length > 1_000_000) return coarseDiff(left, right);
  const table = Array.from({ length: left.length + 1 }, () => new Uint16Array(right.length + 1));
  for (let i = left.length - 1; i >= 0; i -= 1) for (let j = right.length - 1; j >= 0; j -= 1) {
    table[i][j] = left[i] === right[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  }
  const oldParts: DiffPart[] = [], newParts: DiffPart[] = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) { push(oldParts, left[i], "same"); push(newParts, right[j], "same"); i += 1; j += 1; }
    else if (table[i + 1][j] >= table[i][j + 1]) { push(oldParts, left[i], "removed"); i += 1; }
    else { push(newParts, right[j], "added"); j += 1; }
  }
  while (i < left.length) push(oldParts, left[i++], "removed");
  while (j < right.length) push(newParts, right[j++], "added");
  return { before: oldParts, after: newParts };
}

function push(parts: DiffPart[], value: string, type: DiffPart["type"]) {
  const last = parts[parts.length - 1];
  if (last?.type === type) last.value += value;
  else parts.push({ value, type });
}

function coarseDiff(left: string[], right: string[]) {
  let start = 0;
  while (left[start] === right[start] && start < left.length && start < right.length) start += 1;
  let end = 0;
  while (left[left.length - 1 - end] === right[right.length - 1 - end] && end < left.length - start && end < right.length - start) end += 1;
  const prefix = left.slice(0, start).join(""), suffix = end ? left.slice(-end).join("") : "";
  return {
    before: [{ value: prefix, type: "same" as const }, { value: left.slice(start, left.length - end).join(""), type: "removed" as const }, { value: suffix, type: "same" as const }].filter((part) => part.value),
    after: [{ value: prefix, type: "same" as const }, { value: right.slice(start, right.length - end).join(""), type: "added" as const }, { value: suffix, type: "same" as const }].filter((part) => part.value),
  };
}
