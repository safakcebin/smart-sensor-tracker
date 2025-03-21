# Node.js 18 Alpine tabanlı resmi imajını kullanıyoruz
FROM node:18-alpine

# Çalışma dizinini ayarla
WORKDIR /usr/src/app

# package.json ve package-lock.json dosyalarını kopyala
COPY package*.json ./

# Bağımlılıkları yükle
RUN npm ci

# Kodu kopyala
COPY . .

# TypeScript'i derle
RUN npm run build

# Gereksiz dosyaları temizle
RUN npm prune --production && \
    rm -rf src/ && \
    rm -rf node_modules/@types

# Port ayarı
EXPOSE 3000

# Uygulamayı başlat
CMD ["node", "dist/main"]
