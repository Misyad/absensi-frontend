# Menggunakan image Nginx versi ringan
FROM nginx:alpine

# Menyalin file source code ke direktori publik Nginx
COPY ./src /usr/share/nginx/html

# Mengekspos port 80 untuk lalu lintas web
EXPOSE 80

# Menjalankan Nginx di foreground
CMD ["nginx", "-g", "daemon off;"]