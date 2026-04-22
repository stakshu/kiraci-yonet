/* ── KiraciYonet — i18n Setup ── */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import tr from './locales/tr.json'
import en from './locales/en.json'
import de from './locales/de.json'

export const SUPPORTED_LANGUAGES = [
  { code: 'tr', label: 'Türkçe',    flag: 'TR', currency: 'TRY', locale: 'tr-TR' },
  { code: 'en', label: 'English',   flag: 'EN', currency: 'USD', locale: 'en-US' },
  { code: 'de', label: 'Deutsch',   flag: 'DE', currency: 'EUR', locale: 'de-DE' }
]

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      tr: { translation: tr },
      en: { translation: en },
      de: { translation: de }
    },
    fallbackLng: 'tr',
    supportedLngs: ['tr', 'en', 'de'],
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'kiraciyonet_lang',
      caches: ['localStorage']
    },
    interpolation: { escapeValue: false }
  })

export default i18n
