// Croatia's official fixed HRK→EUR conversion peg, in effect since 2023-01-01.
export const HRK_TO_EUR_PEG = 7.5345;

/** Amounts dated before the 2023-01-01 currency switch were recorded in HRK. */
export function needsConversion(isoDate: string): boolean {
  return isoDate < '2023-01-01';
}

export function convertIfNeeded(isoDate: string, amount: number): number {
  return needsConversion(isoDate) ? amount / HRK_TO_EUR_PEG : amount;
}
