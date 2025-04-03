@echo off

echo Frontend projesi guncellemeler gonderiliyor...
echo ------------------------------------------

:: Git repo başlat (eğer ilk kez yapıyorsanız)
:: git init

:: Tüm değişiklikleri hazırla
git add .

:: Değişiklikleri commit et
git commit -m "chore: Frontend guncellemeleri"

:: GitHub repo bağlantısı ekle (eğer ilk kez yapıyorsanız)
:: git remote add origin https://github.com/muhammetmertkus/face-recognition_frontend.git

:: Ana dalı main olarak ayarla (eğer ilk kez yapıyorsanız)
:: git branch -M main

:: GitHub'a gönder
git push origin main

echo.
echo İşlem tamamlandı!
echo Repository: https://github.com/muhammetmertkus/face-recognition_frontend
echo.
echo Son adımlar:
echo 1. Netlify'da projeyi yeniden deploy edin
echo 2. Backend'de CORS ayarlarını kontrol edin
echo 3. Uygulamayı test edin
echo.
pause 