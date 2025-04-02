@echo off
echo Yüz Tanıma Frontend GitHub Yükleme Aracı
echo ------------------------------------------

:: Git repo başlat (eğer ilk kez yapıyorsanız)
git init

:: Dosyaları hazırla
git add .

:: İlk commit (Eğer bu ilk commit'iniz değilse bu kısmı atlayabilirsiniz)
git commit -m "İlk sürüm: Yüz Tanıma Frontend Uygulaması"

:: GitHub repo bağlantısı ekle (eğer ilk kez yapıyorsanız)
git remote add origin https://github.com/muhammetmertkus/face-recognition_frontend.git

:: Ana dalı main olarak ayarla (eğer ilk kez yapıyorsanız)
git branch -M main

:: GitHub'a gönder (ilk kez yapıyorsanız)
git push -u origin main

:: Öğrenci modülü güncelleme
git add src/app/dashboard/teacher/students
git commit -m "Öğrenci yönetim modülü eklendi ve güncellendi"
git push

:: Yoklama sistemi güncelleme
git add src/app/dashboard/teacher/attendance
git commit -m "Yoklama kayıt sistemi ve yüz tanıma entegrasyonu tamamlandı"
git push

echo.
echo İşlem tamamlandı!
echo Repository: https://github.com/muhammetmertkus/face-recognition_frontend
echo.
echo Yapılan güncellemeler:
echo 1. Temel proje yapısı oluşturuldu
echo 2. Öğrenci yönetim modülü eklendi
echo 3. Yoklama kayıt sistemi ve yüz tanıma entegrasyonu tamamlandı
echo.
echo Canlı ortama dağıtım için: npm run build
pause 