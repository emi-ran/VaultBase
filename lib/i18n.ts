import { tr } from "./locales/tr";
import { en } from "./locales/en";

export type Locale = "tr" | "en";

export const translations = { tr, en };

export function getTranslations(locale: Locale): typeof tr {
  return translations[locale] || translations.tr;
}

export function getT(locale: Locale) {
  const dict = getTranslations(locale);
  return (path: string) => translate(dict, path);
}

export function translate(dict: any, path: string, vars?: Record<string, string | number>): string {
  if (!dict) return path;
  const keys = path.split(".");
  let current = dict;
  for (const key of keys) {
    if (current === null || current === undefined || current[key] === undefined) {
      return path;
    }
    current = current[key];
  }
  if (typeof current !== "string") return path;
  if (!vars) return current;
  return current.replace(/\{(\w+)\}/g, (_, key) => {
    const val = vars[key];
    return val !== undefined ? String(val) : `{${key}}`;
  });
}
