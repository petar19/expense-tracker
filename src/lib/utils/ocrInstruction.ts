// Kept in sync with expense-tracker-bot/src/geminiVision.ts's DEFAULT_INSTRUCTION,
// which is what actually uses this — this copy exists so the admin panel can
// show the default as a placeholder without needing to ask the bot.
export const DEFAULT_OCR_INSTRUCTION =
  'You are extracting structured data from a photo of a receipt or bill for a family expense archive.';
