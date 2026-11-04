
export const MAX_AMOUNT = 10000000;
export const MAX_PEOPLE_COUNT = 20;

export interface AmountResult {
  value: number | null;
  error: string;
}

export function sanitizeAmountInput(text: string): string {
  return text.replace(/[^0-9.,]/g, "");
}

function normalizeAmount(raw: string): string | null {
  const hasDot = raw.includes(".");
  const hasComma = raw.includes(",");
  let normalized = raw;

  if (hasDot && hasComma) {
    const decimalSep =
      raw.lastIndexOf(",") > raw.lastIndexOf(".") ? "," : ".";
    const thousandSep = decimalSep === "," ? "." : ",";
    normalized = raw.split(thousandSep).join("").replace(decimalSep, ".");
  } else if (hasComma) {
    if ((raw.match(/,/g) ?? []).length > 1) return null;
    normalized = raw.replace(",", ".");
  } else if (hasDot && /^\d{1,3}(\.\d{3})+$/.test(raw)) {
    normalized = raw.replaceAll(".", "");
  }

  return normalized;
}

export function parseAmount(text: string): AmountResult {
  const raw = text.trim().replace(/\s/g, "").replace("₺", "");

  if (!raw) return { value: null, error: "Enter an amount." };
  if (!/^[0-9.,]+$/.test(raw)) {
    return { value: null, error: "Use numbers only." };
  }

  const normalized = normalizeAmount(raw);
  if (normalized === null) {
    return { value: null, error: "Enter a valid number." };
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return {
      value: null,
      error: "Enter a valid number with up to 2 decimals.",
    };
  }

  const value = Number(normalized);

  if (value <= 0) {
    return { value: null, error: "The amount must be greater than zero." };
  }
  if (value > MAX_AMOUNT) {
    return { value: null, error: "The amount you entered is too high." };
  }

  return { value, error: "" };
}

export function parsePeopleCount(text: string): AmountResult {
  const raw = text.trim();

  if (!raw) {
    return { value: null, error: "Enter the number of people." };
  }

  if (!/^\d+$/.test(raw)) {
    return { value: null, error: "Enter a whole number." };
  }

  const value = Number(raw);

  if (!Number.isSafeInteger(value) || value <= 0) {
    return { value: null, error: "The number of people must be greater than zero." };
  }

  if (value > MAX_PEOPLE_COUNT) {
    return { value: null, error: "Number of people is too much." };
  }

  return { value, error: "" };
  
}

