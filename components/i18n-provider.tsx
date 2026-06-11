"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Locale, getTranslations, translate } from "../lib/i18n";

interface LanguageContextProps {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (path: string) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export function LanguageProvider({
  children,
  initialLocale = "tr",
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [dictionary, setDictionary] = useState(() => getTranslations(initialLocale));

  useEffect(() => {
    // Read from cookie on load if present
    const match = document.cookie.match(/(?:^|; )locale=([^;]*)/);
    if (match && (match[1] === "tr" || match[1] === "en")) {
      const savedLocale = match[1] as Locale;
      setLocaleState(savedLocale);
      setDictionary(getTranslations(savedLocale));
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    setDictionary(getTranslations(newLocale));
    document.cookie = `locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    // Refresh to update server-side components
    window.location.reload();
  };

  const t = (path: string) => {
    return translate(dictionary, path);
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
}
