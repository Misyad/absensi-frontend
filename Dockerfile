# Menggunakan image Nginx versi ringan
FROM nginx:alpine

# Menyalin source lalu aktifkan konfigurasi produksi secara eksplisit.
COPY ./src /usr/share/nginx/html
COPY ./src/config.production.js /usr/share/nginx/html/config.js
RUN chmod -R a+rX /usr/share/nginx/html

# Mengekspos port 80 untuk lalu lintas web
EXPOSE 80

# Menjalankan Nginx di foreground
CMD ["nginx", "-g", "daemon off;"]