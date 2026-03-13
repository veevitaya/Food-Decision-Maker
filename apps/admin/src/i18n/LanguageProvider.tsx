import React, { createContext, useContext, useState, useCallback } from "react";

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

const translations: Record<string, Record<string, string>> = {
  en: {
    "navigation.explore": "Explore",
    "navigation.trending": "Trending",
    "navigation.profile": "Profile",
    "navigation.back": "Back",
  },
  th: {
    "navigation.explore": "สำรวจ",
    "navigation.trending": "ยอดนิยม",
    "navigation.profile": "โปรไฟล์",
    "navigation.back": "ย้อนกลับ",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState("en");

  const t = useCallback(
    (key: string, params?: Record<string, string>) => {
      let text = translations[language]?.[key] || translations["en"]?.[key] || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(`{{${k}}}`, v);
        });
      }
      return text;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
