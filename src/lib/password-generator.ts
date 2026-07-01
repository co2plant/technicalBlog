export const PASSWORD_MIN_LENGTH = 1;
export const PASSWORD_MAX_LENGTH = 72;
export const DEFAULT_PASSWORD_SYMBOLS = "!@._#$";

export type PasswordCharacterGroup = "lowercase" | "uppercase" | "numbers" | "symbols";

type PasswordCharacterGroupConfig = {
  key: PasswordCharacterGroup;
  label: string;
  sample: string;
  characters: string;
};

export const PASSWORD_CHARACTER_GROUPS: PasswordCharacterGroupConfig[] = [
  {
    key: "lowercase",
    label: "소문자",
    sample: "a-z",
    characters: "abcdefghijklmnopqrstuvwxyz",
  },
  {
    key: "uppercase",
    label: "대문자",
    sample: "A-Z",
    characters: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  },
  {
    key: "numbers",
    label: "숫자",
    sample: "0-9",
    characters: "0123456789",
  },
  {
    key: "symbols",
    label: "특수문자",
    sample: "!@.",
    characters: DEFAULT_PASSWORD_SYMBOLS,
  },
];

export type PasswordGeneratorOptions = {
  length: number;
  groups: PasswordCharacterGroup[];
  symbolCharacters?: string;
};

export type PasswordStrengthLevel = "weak" | "medium" | "strong";

export type PasswordStrength = {
  level: PasswordStrengthLevel;
  label: "약함" | "보통" | "강함";
  entropyBits: number;
  characterSetSize: number;
};

export type RandomInt = (maxExclusive: number) => number;

const PASSWORD_CHARACTER_GROUPS_BY_KEY = new Map(PASSWORD_CHARACTER_GROUPS.map((group) => [group.key, group]));

export function generateRandomPassword(options: PasswordGeneratorOptions, randomInt: RandomInt = secureRandomInt): string {
  validatePasswordOptions(options);

  const selectedGroups = getUniqueSelectedGroups(options.groups, options.symbolCharacters);
  const requiredCharacters = selectedGroups.map((group) => pickRandomCharacter(group.characters, randomInt));
  const allCharacters = selectedGroups.map((group) => group.characters).join("");
  const remainingLength = options.length - requiredCharacters.length;
  const remainingCharacters = Array.from({ length: remainingLength }, () => pickRandomCharacter(allCharacters, randomInt));

  return shuffleCharacters([...requiredCharacters, ...remainingCharacters], randomInt).join("");
}

export function estimatePasswordStrength(options: PasswordGeneratorOptions): PasswordStrength {
  validatePasswordOptions(options);

  const selectedGroups = getUniqueSelectedGroups(options.groups, options.symbolCharacters);
  const characterSetSize = new Set(selectedGroups.flatMap((group) => Array.from(group.characters))).size;
  const entropyBits = options.length * Math.log2(characterSetSize);

  if (entropyBits < 50) {
    return {
      level: "weak",
      label: "약함",
      entropyBits,
      characterSetSize,
    };
  }

  if (entropyBits < 80) {
    return {
      level: "medium",
      label: "보통",
      entropyBits,
      characterSetSize,
    };
  }

  return {
    level: "strong",
    label: "강함",
    entropyBits,
    characterSetSize,
  };
}

export function normalizeSymbolCharacters(characters: string): string {
  return [...new Set(Array.from(characters.trim()))].join("");
}

export function getInvalidSymbolCharacters(characters: string): string[] {
  return Array.from(normalizeSymbolCharacters(characters)).filter((character) => !isAllowedSymbolCharacter(character));
}

export function secureRandomInt(maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > 0x100000000) {
    throw new Error("Random range must be a positive 32-bit integer.");
  }

  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("Secure random source is unavailable.");
  }

  const values = new Uint32Array(1);
  const limit = 0x100000000 - (0x100000000 % maxExclusive);
  let value = 0;

  do {
    globalThis.crypto.getRandomValues(values);
    value = values[0];
  } while (value >= limit);

  return value % maxExclusive;
}

function validatePasswordOptions(options: PasswordGeneratorOptions): void {
  if (!Number.isInteger(options.length)) {
    throw new Error("Password length must be an integer.");
  }

  if (options.length < PASSWORD_MIN_LENGTH || options.length > PASSWORD_MAX_LENGTH) {
    throw new Error(`Password length must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH}.`);
  }

  const selectedGroups = getUniqueSelectedGroups(options.groups, options.symbolCharacters);

  if (selectedGroups.length === 0) {
    throw new Error("At least one character group must be selected.");
  }

  if (options.length < selectedGroups.length) {
    throw new Error("Password length must be at least the number of selected character groups.");
  }
}

function getUniqueSelectedGroups(groups: PasswordCharacterGroup[], symbolCharacters: string | undefined): PasswordCharacterGroupConfig[] {
  const uniqueGroups = [...new Set(groups)];

  return uniqueGroups.map((groupKey) => {
    const group = PASSWORD_CHARACTER_GROUPS_BY_KEY.get(groupKey);

    if (!group) {
      throw new Error(`Unknown character group: ${groupKey}`);
    }

    if (group.key !== "symbols" || symbolCharacters === undefined) {
      return group;
    }

    const normalizedSymbols = normalizeSymbolCharacters(symbolCharacters);

    if (normalizedSymbols === "") {
      throw new Error("At least one symbol character must be selected.");
    }

    if (getInvalidSymbolCharacters(normalizedSymbols).length > 0) {
      throw new Error("Symbol characters must contain ASCII punctuation only.");
    }

    return {
      ...group,
      characters: normalizedSymbols,
    };
  });
}

function pickRandomCharacter(characters: string, randomInt: RandomInt): string {
  return characters[randomInt(characters.length)];
}

function isAllowedSymbolCharacter(character: string): boolean {
  const codePoint = character.codePointAt(0);

  if (codePoint === undefined) {
    return false;
  }

  return (
    (codePoint >= 33 && codePoint <= 47) ||
    (codePoint >= 58 && codePoint <= 64) ||
    (codePoint >= 91 && codePoint <= 96) ||
    (codePoint >= 123 && codePoint <= 126)
  );
}

function shuffleCharacters(characters: string[], randomInt: RandomInt): string[] {
  const shuffled = [...characters];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    const current = shuffled[index];
    shuffled[index] = shuffled[swapIndex];
    shuffled[swapIndex] = current;
  }

  return shuffled;
}
