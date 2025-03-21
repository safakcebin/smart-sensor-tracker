import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InfluxDB, Point } from '@influxdata/influxdb-client';

@Injectable()
export class InfluxdbService {
  private influxDB: InfluxDB;
  private org: string;
  private bucket: string;
  private queryApi: any;

  constructor(private configService: ConfigService) {
    const url = this.configService.get<string>('INFLUXDB_URL', 'http://localhost:8086');
    const token = this.configService.get<string>('INFLUXDB_TOKEN', 'token');
    this.org = this.configService.get<string>('INFLUXDB_ORG', 'org');
    this.bucket = this.configService.get<string>('INFLUXDB_BUCKET', 'sensors');

    console.log('✅ InfluxDB Servisi Başlatılıyor...');
    console.log('🔗 InfluxDB URL:', url);
    console.log('🔑 InfluxDB Token:', token);
    console.log('📦 InfluxDB Bucket:', this.bucket);
    console.log('🏢 InfluxDB Org:', this.org);

    this.influxDB = new InfluxDB({ url, token });
    this.queryApi = this.influxDB.getQueryApi(this.org);
  }

  async saveDeviceData(sensorId: string, measurement: string, fields: Record<string, any>) {
    const writeApi = this.influxDB.getWriteApi(this.org, this.bucket);
    
    const point = new Point(measurement)
      .tag('sensorId', sensorId);

    // Add deviceId tag
    if (fields.deviceId) {
      point.tag('device_id', String(fields.deviceId));
      // deviceId'yi fields'dan çıkar, çünkü tag olarak ekledik
      delete fields.deviceId;
    }

    // Set timestamp
    if (fields.timestamp) {
      point.timestamp(new Date(fields.timestamp));
      delete fields.timestamp;
    } else {
      point.timestamp(new Date());
    }

    // Add remaining fields
    Object.entries(fields).forEach(([key, value]) => {
      if (typeof value === 'number') {
        point.floatField(key, value);
      } else if (value !== null && value !== undefined) {
        // Add only non-null, non-undefined string values
        point.stringField(key, String(value));
      }
    });

    writeApi.writePoint(point);
    await writeApi.close();
  }

  async getLatestDeviceData(sensorId: string) {
    const queryApi = this.influxDB.getQueryApi(this.org);

    const fluxQuery = `
      from(bucket: "${this.bucket}")
        |> range(start: -5m)
        |> filter(fn: (r) => r["sensorId"] == "${sensorId}")
        |> last()
    `;

    try {
      const rows = await queryApi.collectRows(fluxQuery);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error querying InfluxDB:', error);
      return null;
    }
  }

  async getDeviceDataHistory(sensorId: string, startTime: string, endTime: string) {
    const queryApi = this.influxDB.getQueryApi(this.org);

    const fluxQuery = `
      from(bucket: "${this.bucket}")
        |> range(start: ${startTime}, stop: ${endTime})
        |> filter(fn: (r) => r["sensorId"] == "${sensorId}")
    `;

    try {
      return await queryApi.collectRows(fluxQuery);
    } catch (error) {
      console.error('Error querying InfluxDB:', error);
      return [];
    }
  }

  async getAllDevicesData(timeRange?: { start: Date; end: Date }) {

    console.log('bucket', this.bucket);
    console.log('org', this.org);
    // Default to last 1 hour of data
    const end = new Date();
    const start = timeRange?.start || new Date(end.getTime() - 60 * 60 * 1000); // 1 hour ago

    // InfluxDB query
    const query = `from(bucket: "${this.bucket}")
      |> range(start: ${start.toISOString()}, stop: ${end.toISOString()})
      |> filter(fn: (r) => r["_measurement"] == "device_data" or r["_measurement"] == "sensor_data")`;

    return this.queryApi.collectRows(query);
  }

  async getDevicesData(deviceIds: string[], timeRange?: { start: Date; end: Date }) {
    if (!deviceIds.length) return [];

    // Default to last 1 hour of data
    const end = new Date();
    const start = timeRange?.start || new Date(end.getTime() - 60 * 60 * 1000); // 1 hour ago

    // InfluxDB query
    const query = `from(bucket: "${this.bucket}")
      |> range(start: ${start.toISOString()}, stop: ${end.toISOString()})
      |> filter(fn: (r) => r["_measurement"] == "device_data" or r["_measurement"] == "sensor_data")
      |> filter(fn: (r) => contains(value: r["device_id"], set: [${deviceIds.map(id => `"${id}"`).join(',')}]))`;

    return this.queryApi.collectRows(query);
  }
}