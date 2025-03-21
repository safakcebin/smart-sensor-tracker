# Smart Sensor Tracker

Akıllı sensör ve cihaz verilerini izleme ve yönetme platformu.

## Özellikler

- Gerçek zamanlı sensör veri izleme
- Cihaz yönetimi ve takibi
- Şirket bazlı kullanıcı yönetimi
- Rol tabanlı erişim kontrolü
- Detaylı loglama sistemi
- WebSocket ile anlık veri akışı
- MQTT desteği
- InfluxDB ile zaman serisi veri depolama

## Gereksinimler

- Node.js (v18 veya üzeri)
- PostgreSQL (v14 veya üzeri)
- InfluxDB (v2.x)
- Docker (opsiyonel)

## Kullanılan Teknolojiler

### Ana Çerçeve ve Araçlar
- **NestJS**: Modern ve ölçeklenebilir Node.js web framework'ü
- **TypeScript**: Tip güvenli JavaScript süper kümesi
- **TypeORM**: Nesne ilişkisel eşleyici (ORM)
- **Passport**: Kimlik doğrulama middleware'i
- **JWT**: JSON Web Token tabanlı güvenlik

### Veritabanları
- **PostgreSQL**: İlişkisel veritabanı (kullanıcılar, şirketler, cihazlar)
- **InfluxDB**: Zaman serisi veritabanı (sensör verileri)

### WebSocket ve MQTT
- **Socket.io**: Gerçek zamanlı, çift yönlü iletişim
- **Paho MQTT**: MQTT protokolü desteği

### Güvenlik ve Validasyon
- **class-validator**: Veri doğrulama
- **class-transformer**: Nesne dönüşümü
- **bcrypt**: Şifreleme

### Loglama ve İzleme
- **Winston**: Gelişmiş loglama çözümü

## Kurulum

### Normal Kurulum

1. Depoyu klonlayın:
```bash
git clone https://github.com/kullanici/smart-sensor-tracker.git
cd smart-sensor-tracker
```

2. Bağımlılıkları yükleyin:
```bash
npm install
```

3. `.env` dosyasını oluşturun:
```env
# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=kullanici
POSTGRES_PASSWORD=sifre
POSTGRES_DB=sensor_tracker

# JWT
JWT_SECRET=gizli_anahtar
JWT_EXPIRATION=1h

# InfluxDB
INFLUXDB_URL=http://localhost:8086
INFLUXDB_TOKEN=influxdb_token
INFLUXDB_ORG=organizasyon
INFLUXDB_BUCKET=sensor_data
```

4. Uygulamayı başlatın:
```bash
# Geliştirme modu
npm run start:dev

# Üretim modu
npm run build
npm run start:prod
```

### Docker ile Kurulum

1. Docker imajını oluşturun:
```bash
docker build -t smart-sensor-tracker .
```

2. Docker Compose ile çalıştırın:
```bash
docker-compose up -d
```

## API Dokümantasyonu

Swagger UI üzerinden API dokümantasyonuna erişebilirsiniz:
```
http://localhost:3000/api/docs
```

## API Endpoints

### 🔐 Kimlik Doğrulama
- `POST /auth/login` - Kullanıcı girişi
  - Body: `{ "email": "user@example.com", "password": "password123" }`
  - Cevap: JWT token
- `POST /auth/register` - Yeni kullanıcı kaydı (SYSTEM_ADMIN veya COMPANY_ADMIN gerekli)
  - Body: `{ "email": "user@example.com", "password": "password123", "firstName": "John", "lastName": "Doe", "role": "USER", "companyId": "uuid" }`

### 🏢 Şirketler
- `POST /companies` - Yeni şirket oluştur (SYSTEM_ADMIN gerekli)
  - Body: `{ "name": "Acme Corp", "description": "Leading IoT solutions provider" }`
- `GET /companies` - Tüm şirketleri listele (SYSTEM_ADMIN gerekli)
- `GET /companies/{id}` - Şirket detaylarını getir
- `PATCH /companies/{id}` - Şirket bilgilerini güncelle (SYSTEM_ADMIN gerekli)
- `DELETE /companies/{id}` - Şirket sil (SYSTEM_ADMIN gerekli)
- `GET /companies/{id}/users` - Şirket kullanıcılarını listele
- `PATCH /companies/{id}/deactivate` - Şirketi deaktif et (SYSTEM_ADMIN gerekli)

### 📱 IoT Cihazları
- `POST /iot-devices` - Yeni cihaz ekle
  - Body: `{ "name": "Temperature Sensor 1", "sensorId": "SENSOR001", "companyId": "uuid" }`
- `GET /iot-devices` - Tüm cihazları listele
- `GET /iot-devices/{id}` - Cihaz detaylarını getir
- `GET /iot-devices/sensor/{sensorId}` - Sensör ID'ye göre cihaz bul

### 🔑 Cihaz İzinleri
- `POST /device-permissions` - Cihaz erişimi ver
  - Body: `{ "userId": "uuid", "deviceId": "uuid", "canManage": true }`
- `DELETE /device-permissions/{userId}/{deviceId}` - Cihaz erişimini kaldır

### 📊 Loglar
- `GET /logs/company/{companyId}` - Şirket loglarını getir
  - Query: `startDate` ve `endDate` (Unix timestamp)

Not: Tüm istekler için JWT token gereklidir (login hariç). Token'ı Authorization header'ında gönderin:
```
Authorization: Bearer your_jwt_token
```

## Sensör Simülasyonu

Sensör verilerini simüle etmek için [iot-device-emulator](https://github.com/safakcebin/iot-device-emulator) reposunu kullanabilirsiniz. Bu simülasyon aracı:

- PostgreSQL veritabanından sensör ID'lerini çeker
- Mosquitto MQTT broker' veriler gönderilerek proje simüle edilir


## Test

```bash
# Unit testler
npm run test

# E2E testler
npm run test:e2e

# Test coverage
npm run test:cov
```

## InfluxDB Sorguları

Sensör verilerini sorgulama örneği:
```flux
from(bucket: "sensor_data")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "device_data")
  |> filter(fn: (r) => r["device_id"] == "device_1")
```

## Güvenlik

- JWT tabanlı kimlik doğrulama
- Rol tabanlı yetkilendirme (SYSTEM_ADMIN, COMPANY_ADMIN, USER)
- Rate limiting
- Request loglama
- Şifrelenmiş hassas veriler

## WebSocket Test

### HTML Test Sayfası
Proje içerisinde bulunan `websocket-test.html` dosyasını kullanarak WebSocket bağlantılarını test edebilirsiniz:

1. Tarayıcıda `websocket-test.html` dosyasını açın
2. JWT token'ınızı girin
3. "Bağlan" butonuna tıklayın
4. Gerçek zamanlı veri akışını izleyin

### wscat ile Test
[wscat](https://github.com/websockets/wscat) kullanarak komut satırından WebSocket bağlantılarını test edebilirsiniz:

1. wscat'i yükleyin:
```bash
npm install -g wscat
```

2. WebSocket sunucusuna bağlanın:
```bash
# JWT token ile bağlanma
wscat -c "ws://localhost:3000/events?token=YOUR_JWT_TOKEN"

# Belirli bir şirkete ait verileri dinleme
wscat -c "ws://localhost:3000/events/company/YOUR_COMPANY_ID?token=YOUR_JWT_TOKEN"
```

3. Örnek komutlar:
```bash
# Tüm sensör verilerini dinleme
> {"event": "subscribe", "data": "sensor_data"}

# Belirli bir cihazın verilerini dinleme
> {"event": "subscribe", "data": "device_YOUR_DEVICE_ID"}

# Aboneliği sonlandırma
> {"event": "unsubscribe", "data": "sensor_data"}
```

## Katkıda Bulunma

1. Fork'layın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'feat: Add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.
