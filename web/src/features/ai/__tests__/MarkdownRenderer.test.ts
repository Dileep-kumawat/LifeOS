import { describe, it, expect } from "vitest";
import { preprocessMarkdown } from "../components/MarkdownRenderer";

describe("preprocessMarkdown", () => {
  it("returns empty string when input is empty or null", () => {
    expect(preprocessMarkdown("")).toBe("");
  });

  it("leaves standard paragraphs and regular text unchanged", () => {
    const input = "Hello world!\n\nThis is a normal paragraph.\n\nAnother line.";
    expect(preprocessMarkdown(input)).toBe(input);
  });

  it("leaves clean GFM tables unchanged", () => {
    const table = [
      "| Time | Item | Action |",
      "|------|------|--------|",
      "| 08:00 | Deep work | Focus |",
      "| 09:30 | Review | Analyze |"
    ].join("\n");

    expect(preprocessMarkdown(table)).toBe(table);
  });

  it("collapses single and multiple blank lines between table rows", () => {
    const brokenTable = [
      "| Time | Item | Action |",
      "|------|------|--------|",
      "",
      "| 08:00 | Deep work | Focus |",
      "",
      "",
      "| 09:30 | Review | Analyze |"
    ].join("\n");

    const expected = [
      "| Time | Item | Action |",
      "|------|------|--------|",
      "| 08:00 | Deep work | Focus |",
      "| 09:30 | Review | Analyze |"
    ].join("\n");

    expect(preprocessMarkdown(brokenTable)).toBe(expected);
  });

  it("preserves blank lines separating tables from subsequent paragraphs", () => {
    const input = [
      "| Time | Item | Action |",
      "|------|------|--------|",
      "| 08:00 | Deep work | Focus |",
      "",
      "Here is a summary paragraph after the table."
    ].join("\n");

    expect(preprocessMarkdown(input)).toBe(input);
  });

  it("preserves blank lines separating paragraphs from subsequent tables", () => {
    const input = [
      "Here is an introductory paragraph before the table:",
      "",
      "| Time | Item | Action |",
      "|------|------|--------|",
      "| 08:00 | Deep work | Focus |"
    ].join("\n");

    expect(preprocessMarkdown(input)).toBe(input);
  });

  it("never modifies pipes or blank lines inside code fences (```)", () => {
    const input = [
      "```markdown",
      "| Col 1 | Col 2 |",
      "",
      "| Val 1 | Val 2 |",
      "```"
    ].join("\n");

    expect(preprocessMarkdown(input)).toBe(input);
  });

  it("never modifies pipes or blank lines inside tilde code fences (~~~)", () => {
    const input = [
      "~~~text",
      "| A | B |",
      "",
      "| C | D |",
      "~~~"
    ].join("\n");

    expect(preprocessMarkdown(input)).toBe(input);
  });

  it("handles indented table rows with blank lines between them", () => {
    const input = [
      "  | Time | Item |",
      "  |------|------|",
      "",
      "  | 08:00 | Focus |"
    ].join("\n");

    const expected = [
      "  | Time | Item |",
      "  |------|------|",
      "  | 08:00 | Focus |"
    ].join("\n");

    expect(preprocessMarkdown(input)).toBe(expected);
  });

  it("safely handles half-streamed table chunks without error", () => {
    const partial1 = "| Time | Item |";
    expect(preprocessMarkdown(partial1)).toBe(partial1);

    const partial2 = "| Time | Item |\n|---|";
    expect(preprocessMarkdown(partial2)).toBe(partial2);

    const partial3 = "| Time | Item |\n|---|---|\n| 08:00";
    expect(preprocessMarkdown(partial3)).toBe(partial3);
  });
});
