import { 
  WebSocketGateway, 
  WebSocketServer, 
  OnGatewayConnection, 
  OnGatewayDisconnect, 
  OnGatewayInit 
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { InfluxdbService } from '../influxdb/influxdb.service';
import { IotDevicesService } from '../iot-devices/iot-devices.service';
import { AuthService } from '../auth/auth.service';
import { UserRole } from '../auth/enums/user-role.enum';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true
  },
  transports: ['websocket', 'polling']
})
@Injectable()
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);
  private clients: Map<string, { socket: Socket; userId?: string; role?: UserRole }> = new Map();
  private dataIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly influxdbService: InfluxdbService,
    private readonly iotDevicesService: IotDevicesService,
    private readonly authService: AuthService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket gateway initialized');
  }

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    
    // Client'ı kaydet
    this.clients.set(client.id, { socket: client });

    // Bağlantı başarılı mesajını gönder
    client.emit('connected', { 
      message: 'Successfully connected to WebSocket server',
      timestamp: new Date().toISOString()
    });

    // Kullanıcı doğrulama bilgilerini bekle
    client.on('authenticate', async (data: { token: string }) => {
      try {
        // Token'ı doğrula
        const decoded = await this.authService.verifyToken(data.token);
        
        if (!decoded || !decoded.sub) {
          throw new Error('Invalid token');
        }
        
        // Kullanıcı bilgilerini güncelle
        this.clients.set(client.id, { 
          socket: client, 
          userId: decoded.sub,
          role: decoded.role
        });
        
        this.logger.log(`Client authenticated: ${client.id}, User: ${decoded.sub}, Role: ${decoded.role}`);
        
        // Doğrulama başarılı bilgisi gönder
        client.emit('authenticated', {
          message: 'Authentication successful',
          userId: decoded.sub,
          role: decoded.role,
          timestamp: new Date().toISOString()
        });
        
        // Tarihsel verileri gönder
        await this.sendHistoricalData(client, decoded.sub, decoded.role);
        
        // Gerçek zamanlı veri göndermeye başla
        this.startSendingData(client, decoded.sub, decoded.role);
        
      } catch (error) {
        this.logger.error(`Authentication error: ${error.message}`);
        
        // Doğrulama hatası bilgisi gönder
        client.emit('authentication_error', {
          message: 'Authentication failed',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Interval'i temizle
    const interval = this.dataIntervals.get(client.id);
    if (interval) {
      clearInterval(interval);
      this.dataIntervals.delete(client.id);
    }
    
    this.clients.delete(client.id);
  }

  /**
   * Kullanıcının rolüne göre erişebileceği cihaz ID'lerini döndürür
   */
  private async getAccessibleDeviceIds(userId: string, role: UserRole): Promise<string[]> {
    try {
      if (role === UserRole.SYSTEM_ADMIN) {
        // Sistem yöneticisi tüm cihazlara erişebilir
        const allDevices = await this.iotDevicesService.findAllDevices();
        return allDevices.map(device => device.id);
      } else if (role === UserRole.COMPANY_ADMIN) {
        // Şirket yöneticisi sadece kendi şirketinin cihazlarına erişebilir
        const user = await this.authService.findUserById(userId);
        if (!user || !user.companyId) {
          return [];
        }
        const companyDevices = await this.iotDevicesService.findByCompany(user.companyId);
        return companyDevices.map(device => device.id);
      } else {
        // Normal kullanıcı sadece kendisine atanmış cihazlara erişebilir
        const userDevices = await this.iotDevicesService.findByUser(userId);
        return userDevices.map(device => device.id);
      }
    } catch (error) {
      this.logger.error(`Error getting accessible devices: ${error.message}`);
      return [];
    }
  }

  /**
   * Bağlanan client'a kullanıcı rolüne göre tarihsel verileri gönderir
   */
  async sendHistoricalData(client: Socket, userId?: string, role?: UserRole) {
    try {
      this.logger.log(`Sending historical data to client: ${client.id}`);
      
      // Son 1 saatin verilerini al
      const end = new Date();
      const start = new Date(end.getTime() - 60 * 60 * 1000); // 1 saat öncesi
      
      let historicalData = [];
      
      if (!userId || !role) {
        // Doğrulanmamış kullanıcı - Veri gönderme
        client.emit('error', { 
          message: 'Authentication required to access data',
          error: 'Unauthorized'
        });
        return;
      }
      
      if (role === UserRole.SYSTEM_ADMIN) {
        // Sistem yöneticisi tüm verileri görür
        historicalData = await this.influxdbService.getAllDevicesData({ start, end });
      } else {
        // Diğer kullanıcılar sadece erişim yetkisi olan cihazların verilerini görür
        const deviceIds = await this.getAccessibleDeviceIds(userId, role);
        
        if (deviceIds.length > 0) {
          historicalData = await this.influxdbService.getDevicesData(deviceIds, { start, end });
        }
      }
      
      // Verileri client'a gönder
      client.emit('historicalData', {
        message: 'Historical data for the last hour',
        timestamp: new Date().toISOString(),
        data: historicalData
      });
      
      this.logger.log(`Historical data sent to client: ${client.id}, User: ${userId}, Role: ${role}, Data count: ${historicalData.length}`);
    } catch (error) {
      this.logger.error(`Error sending historical data to client ${client.id}: ${error.message}`);
      client.emit('error', { 
        message: 'Error fetching historical data',
        error: error.message
      });
    }
  }

  /**
   * Client'a periyodik olarak kullanıcı rolüne göre gerçek zamanlı veri göndermeye başlar
   */
  private startSendingData(client: Socket, userId?: string, role?: UserRole) {
    // Her 5 saniyede bir güncel verileri gönder
    const interval = setInterval(async () => {
      try {
        if (!this.clients.has(client.id)) {
          clearInterval(interval);
          return;
        }
        
        if (!userId || !role) {
          // Doğrulanmamış kullanıcı - Veri gönderme
          clearInterval(interval);
          return;
        }
        
        this.logger.log(`Sending realtime data to client: ${client.id}`);
        
        // Son 5 saniyelik verileri al
        const end = new Date();
        const start = new Date(end.getTime() - 5000); // Son 5 saniye
        
        let realtimeData = [];
        
        if (role === UserRole.SYSTEM_ADMIN) {
          // Sistem yöneticisi tüm verileri görür
          realtimeData = await this.influxdbService.getAllDevicesData({ start, end });
        } else {
          // Diğer kullanıcılar sadece erişim yetkisi olan cihazların verilerini görür
          const deviceIds = await this.getAccessibleDeviceIds(userId, role);
          
          if (deviceIds.length > 0) {
            realtimeData = await this.influxdbService.getDevicesData(deviceIds, { start, end });
          }
        }
        
        if (realtimeData.length > 0) {
          // Verileri client'a gönder
          client.emit('realtimeData', {
            message: 'Realtime device data',
            timestamp: new Date().toISOString(),
            data: realtimeData
          });
          
          this.logger.log(`Realtime data sent to client: ${client.id}, User: ${userId}, Role: ${role}, Data count: ${realtimeData.length}`);
        }
      } catch (error) {
        this.logger.error(`Error sending realtime data to client ${client.id}: ${error.message}`);
        client.emit('error', { 
          message: 'Error fetching realtime data',
          error: error.message
        });
      }
    }, 5000);
    
    // Interval'i kaydet
    this.dataIntervals.set(client.id, interval);
    
    // Bağlantı kesildiğinde interval'i temizle
    client.on('disconnect', () => {
      clearInterval(interval);
      this.dataIntervals.delete(client.id);
    });
  }
}
