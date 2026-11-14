import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import vi from "./locales/vi.json";
import zh from "./locales/zh.json";
import fr from "./locales/fr.json";

// Coverage note: navigation, home, login, register, and discover are fully translated.
// Everything past that (dashboards, provider console, messages, booking forms) is
// English-only for now — see docs/architecture.md for what's covered vs not, and why
// machine-translated strings here need native-speaker review before a real launch,
// especially Vietnamese, the primary market.
export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "zh", label: "中文" },
  { code: "fr", label: "Français" },
] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      vi: { translation: vi },
      zh: { translation: zh },
      fr: { translation: fr },
    },
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });

export default i18n;
