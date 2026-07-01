import { describe, expect, it } from "vitest";
import {
  estimatePasswordStrength,
  generateRandomPassword,
  getInvalidSymbolCharacters,
  PASSWORD_CHARACTER_GROUPS,
  PASSWORD_MAX_LENGTH,
  type RandomInt,
} from "../src/lib/password-generator";

function createSequentialRandomInt(): RandomInt {
  let next = 0;

  return (maxExclusive) => {
    const value = next % maxExclusive;
    next += 1;
    return value;
  };
}

describe("password generator", () => {
  it("generates the requested length", () => {
    const password = generateRandomPassword(
      {
        length: 32,
        groups: ["lowercase", "uppercase", "numbers", "symbols"],
      },
      createSequentialRandomInt(),
    );

    expect(password).toHaveLength(32);
  });

  it("includes at least one character from every selected group", () => {
    const password = generateRandomPassword(
      {
        length: 12,
        groups: ["lowercase", "uppercase", "numbers", "symbols"],
      },
      createSequentialRandomInt(),
    );

    for (const group of PASSWORD_CHARACTER_GROUPS) {
      expect([...password].some((character) => group.characters.includes(character))).toBe(true);
    }
  });

  it("uses custom symbol characters when symbols are selected", () => {
    const password = generateRandomPassword(
      {
        length: 12,
        groups: ["lowercase", "symbols"],
        symbolCharacters: "@",
      },
      createSequentialRandomInt(),
    );

    expect(password).toContain("@");
    expect([...password].every((character) => /[a-z@]/.test(character))).toBe(true);
  });

  it("rejects empty custom symbol characters", () => {
    expect(() =>
      generateRandomPassword(
        {
          length: 12,
          groups: ["lowercase", "symbols"],
          symbolCharacters: "   ",
        },
        createSequentialRandomInt(),
      ),
    ).toThrowError("At least one symbol character must be selected.");
  });

  it("rejects non-symbol custom characters", () => {
    expect(() =>
      generateRandomPassword(
        {
          length: 12,
          groups: ["lowercase", "symbols"],
          symbolCharacters: "! 한漢a1",
        },
        createSequentialRandomInt(),
      ),
    ).toThrowError("Symbol characters must contain ASCII punctuation only.");
  });

  it("detects invalid symbol characters for UI validation", () => {
    expect(getInvalidSymbolCharacters("! 한漢a1")).toEqual([" ", "한", "漢", "a", "1"]);
  });

  it("estimates password strength from length and character set size", () => {
    expect(
      estimatePasswordStrength({
        length: 8,
        groups: ["lowercase"],
      }).level,
    ).toBe("weak");

    expect(
      estimatePasswordStrength({
        length: 12,
        groups: ["lowercase", "numbers"],
      }).level,
    ).toBe("medium");

    expect(
      estimatePasswordStrength({
        length: 24,
        groups: ["lowercase", "uppercase", "numbers", "symbols"],
      }).level,
    ).toBe("strong");
  });

  it("rejects lengths above the maximum", () => {
    expect(() =>
      generateRandomPassword(
        {
          length: PASSWORD_MAX_LENGTH + 1,
          groups: ["lowercase"],
        },
        createSequentialRandomInt(),
      ),
    ).toThrowError(`Password length must be between 1 and ${PASSWORD_MAX_LENGTH}.`);
  });

  it("rejects lengths shorter than the selected group count", () => {
    expect(() =>
      generateRandomPassword(
        {
          length: 2,
          groups: ["lowercase", "uppercase", "numbers"],
        },
        createSequentialRandomInt(),
      ),
    ).toThrowError("Password length must be at least the number of selected character groups.");
  });
});
