'use client'

import React from 'react'
import { Settings } from 'lucide-react'

export default function TeacherSettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <Settings className="mr-3 h-8 w-8 text-primary" />
        Ayarlar
      </h1>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Hesap Ayarları</h2>
        <p className="text-muted-foreground">
          Burada hesap bilgilerinizi güncelleyebilir veya diğer ayarları yönetebilirsiniz.
          (Bu bölüm henüz geliştirme aşamasındadır.)
        </p>
        {/* Ayar formları veya seçenekleri buraya eklenecek */}
      </div>

      {/* Diğer ayar bölümleri eklenebilir */}
      {/* 
      <div className="mt-6 rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Bildirim Ayarları</h2>
        <p className="text-muted-foreground">
          Bildirim tercihlerinizi buradan yönetin.
        </p>
      </div> 
      */}
    </div>
  )
} 