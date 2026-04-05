export type DeterministicSeedHelper = {
  nextId: () => number;
  reset: () => void;
};

export function createDeterministicSeedHelper(initialValue = 1): DeterministicSeedHelper {
  let cursor = initialValue;

  return {
    nextId() {
      const current = cursor;
      cursor += 1;
      return current;
    },
    reset() {
      cursor = initialValue;
    },
  };
}
