# Menggunakan image Nginx versi ringan
FROM nginx:alpine

# Menyalin source lalu aktifkan konfigurasi produksi secara eksplisit.
COPY --chmod=0644 ./src /usr/share/nginx/html
COPY --chmod=0644 ./src/config.production.js /usr/share/nginx/html/config.js

# Mengekspos port 80 untuk lalu lintas web
EXPOSE 80

# Menjalankan Nginx di foreground
CMD ["nginx", "-g", "daemon off;"]