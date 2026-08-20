FROM nginx:alpine
COPY . /usr/share/nginx/html
RUN sed -ri 's/listen[[:space:]]+80;/listen 3000;/' /etc/nginx/conf.d/default.conf
EXPOSE 3000
