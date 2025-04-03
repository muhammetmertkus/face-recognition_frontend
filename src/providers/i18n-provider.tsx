"use client";

import React, { useEffect, useState, useRef } from 'react';
import { I18nextProvider } from 'react-i18next';
// i18n örneğini ve başlatma seçeneklerini import ediyoruz
import i18nInstance, { i18nInitOptions } from '../i18n';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(i18nInstance.isInitialized);
  const initStarted = useRef(false); // Ref to track initialization start

  useEffect(() => {
    // Zaten başlatıldıysa veya başlatma zaten başladıysa tekrar deneme
    if (i18nInstance.isInitialized || initStarted.current) {
      if (!initialized) setInitialized(true); // State'i senkronize et
      return;
    }

    // Başlatmayı başlat olarak işaretle
    initStarted.current = true;
    let isMounted = true; // Prevent state update on unmounted component

    const initialize = async () => {
      // Sadece istemcide başlat
      if (typeof window !== 'undefined') {
        try {
          await i18nInstance.init(i18nInitOptions);
          if (isMounted) {
            setInitialized(true);
          }
        } catch (err) {
          console.error("i18next init error:", err);
          // Hata durumunda belki initStarted.current = false; yapılabilir?
        }
      }
    };

    initialize();

    const handleLanguageChanged = () => {
      // Dil değişikliği için özel bir şey yapmaya gerek yok
    };
    i18nInstance.on('languageChanged', handleLanguageChanged);

    return () => {
      isMounted = false;
      i18nInstance.off('languageChanged', handleLanguageChanged);
    };

  }, [initialized]); // `initialized` state'i senkronize etmek için bağımlılık olarak kalabilir

  // i18next başlatılana kadar hiçbir şey render etme (veya bir yükleyici göster)
  if (!initialized) {
    // TODO: Daha iyi bir yükleyici gösterilebilir
    return null; // veya <YourGlobalLoader />
  }

  return <I18nextProvider i18n={i18nInstance}>{children}</I18nextProvider>;
} 