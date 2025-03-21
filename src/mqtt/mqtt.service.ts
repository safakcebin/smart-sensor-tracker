import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, Message } from 'paho-mqtt';
import { InfluxdbService } from '../influxdb/influxdb.service';
import { IotDevicesService } from '../iot-devices/iot-devices.service';

interface SensorData {
  sensor_id: string;
  temperature: number;
  humidity: number;
  timestamp?: string;
}

@Injectable()
export class MqttService implements OnModuleInit {
  private client: Client;
  private readonly topic = 'sensor/data';
  private isConnected = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly influxdbService: InfluxdbService,
    private readonly iotDevicesService: IotDevicesService,
  ) {}

  onModuleInit() {
    this.setupMqttClient();
  }

  private setupMqttClient() {
    try {
      const host = this.configService.get<string>('MQTT_BROKER_HOST', 'localhost');
      const port = Number(this.configService.get<number>('MQTT_BROKER_PORT', 9001));
      
      console.log(`🔄 MQTT Bağlantısı başlatılıyor... (${host}:${port})`);

      this.client = new Client(
        String(host),
        Number(port),
        '/mqtt',
        `mqtt_client_${Math.random().toString(16).slice(2, 10)}`
      );

      this.setupEventHandlers();
      this.connect();
    } catch (error) {
      console.error('❌ MQTT Client kurulumunda hata:', error);
    }
  }

  private setupEventHandlers() {
    // Bağlantı koptuğunda
    this.client.onConnectionLost = (responseObject) => {
      this.isConnected = false;
      if (responseObject.errorCode !== 0) {
        console.error('❌ MQTT Bağlantısı koptu:', responseObject.errorMessage);
        // 5 saniye sonra yeniden bağlanmayı dene
        setTimeout(() => this.connect(), 5000);
      }
    };

    // Mesaj geldiğinde
    this.client.onMessageArrived = async (message: Message) => {
      try {
        console.log(`📩 MQTT Mesajı alındı (${message.destinationName})`);
        await this.processMessage(message);
      } catch (error) {
        console.error('❌ Mesaj işlenirken hata:', error);
      }
    };
  }

  private connect() {
    const connectOptions = {
      onSuccess: () => {
        this.isConnected = true;
        console.log('✅ MQTT Broker\'a bağlandı');
        this.subscribe();
      },
      onFailure: (error) => {
        this.isConnected = false;
        console.error('❌ MQTT Bağlantı hatası:', error);
        // 5 saniye sonra yeniden bağlanmayı dene
        setTimeout(() => this.connect(), 5000);
      },
      useSSL: false,
    };

    try {
      this.client.connect(connectOptions);
    } catch (error) {
      console.error('❌ MQTT Bağlantı girişimi başarısız:', error);
    }
  }

  private subscribe() {
    try {
      this.client.subscribe(this.topic);
      console.log(`✅ Topic'e abone olundu: ${this.topic}`);
    } catch (error) {
      console.error(`❌ Topic'e abone olurken hata: ${this.topic}`, error);
    }
  }

  private async processMessage(message: Message) {
    try {
      const data: SensorData = JSON.parse(message.payloadString);
      
      if (!this.validateSensorData(data)) {
        console.error('❌ Geçersiz sensör verisi formatı:', data);
        return;
      }

      const device = await this.iotDevicesService.findBySensorId(data.sensor_id);
      if (!device) {
        console.error(`❌ Cihaz bulunamadı (Sensor ID: ${data.sensor_id})`);
        return;
      }

      await this.saveToInfluxDB(data, device.id);
      
    } catch (error) {
      console.error('❌ Mesaj işlenirken hata:', error);
    }
  }

  private validateSensorData(data: any): data is SensorData {
    return (
      data &&
      typeof data.sensor_id === 'string' &&
      typeof data.temperature === 'number' &&
      typeof data.humidity === 'number'
    );
  }

  private async saveToInfluxDB(
    data: SensorData,
    deviceId: string,
  ) {
    try {
      await this.influxdbService.saveDeviceData(data.sensor_id, 'sensor_data', {
        temperature: data.temperature,
        humidity: data.humidity,
        deviceId: deviceId,
        timestamp: data.timestamp || new Date().toISOString(),
      });

      console.log(`✅ Veri InfluxDB'ye kaydedildi:`, {
        sensor_id: data.sensor_id,
        temperature: data.temperature,
        humidity: data.humidity,
      });
    } catch (error) {
      console.error('❌ InfluxDB\'ye kayıt hatası:', error);
    }
  }

  // Test için yardımcı method
  async sendTestData(sensorId: string, temperature: number, humidity: number) {
    if (!this.isConnected) {
      console.error('❌ MQTT bağlantısı yok');
      return;
    }

    const data: SensorData = {
      sensor_id: sensorId,
      temperature,
      humidity,
      timestamp: new Date().toISOString(),
    };

    const message = new Message(JSON.stringify(data));
    message.destinationName = this.topic;

    try {
      this.client.send(message);
      console.log('✅ Test verisi gönderildi:', data);
    } catch (error) {
      console.error('❌ Test verisi gönderilirken hata:', error);
    }
  }
}
