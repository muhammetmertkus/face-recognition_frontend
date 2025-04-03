import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpApi from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

// Sadece yapılandır, init() ÇAĞIRMA
i18n
  .use(HttpApi)
  .use(LanguageDetector)
  .use(initReactI18next);

// Başlatma seçeneklerini export et
export const i18nInitOptions = {
    debug: true, // Hata ayıklama için açık kalsın
    supportedLngs: ['tr', 'en'],
    fallbackLng: 'tr',
    backend: {
      loadPath: '/locales/{{lng}}/translation.json',
    },
    ns: ['translation'],
    defaultNS: 'translation',
    fallbackNS: 'translation',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    react: {
      useSuspense: true,
    }
};

// Yapılandırılmış örneği export et
export default i18n; 