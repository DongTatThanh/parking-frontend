import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Đọc địa chỉ IP từ axiosConfig để đảm bảo tính nhất quán
const BASE_URL = 'ws://172.20.10.4:3000/updates';

// Debug log function
const logDebug = (message: string, data?: any) => {
  console.log(`[WebSocket] ${message}`, data || '');
};

interface WebSocketMessage {
  event: string;
  data: any;
}

class WebSocketService {
  private static instance: WebSocketService;
  private socket: WebSocket | null = null;
  private listeners: { [key: string]: ((data: any) => void)[] } = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private lastMessageTime: number = 0;
  private connectionStartTime: number = 0;

  // Public properties for debugging
  public debugInfo = {
    connectionAttempts: 0,
    successfulConnections: 0,
    messagesReceived: 0,
    lastErrorMessage: '',
    connectionDuration: 0,
    eventsReceived: {} as Record<string, number>
  };

  private constructor() {}

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      logDebug('WebSocket is already connected or connecting');
      return;
    }

    this.debugInfo.connectionAttempts++;
    this.connectionStartTime = Date.now();
    logDebug(`Connecting to WebSocket: ${BASE_URL}`);

    try {
      this.socket = new WebSocket(BASE_URL);

      this.socket.onopen = () => {
        logDebug('WebSocket connected successfully');
        this.reconnectAttempts = 0;
        this.lastMessageTime = Date.now();
        this.debugInfo.successfulConnections++;
        
        // Gửi ping định kỳ để giữ kết nối và kiểm tra trạng thái
        this.startPingInterval();
      };

      this.socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.lastMessageTime = Date.now();
          this.debugInfo.messagesReceived++;
          
          // Đếm số lượng sự kiện theo loại
          if (message.event) {
            this.debugInfo.eventsReceived[message.event] = 
              (this.debugInfo.eventsReceived[message.event] || 0) + 1;
          }
          
          logDebug(`Message received: ${message.event}`, message.data);
          this.notifyListeners(message.event, message.data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          this.debugInfo.lastErrorMessage = `Parse error: ${error}`;
        }
      };

      this.socket.onclose = (event) => {
        this.stopPingInterval();
        if (this.connectionStartTime > 0) {
          this.debugInfo.connectionDuration += (Date.now() - this.connectionStartTime) / 1000;
          this.connectionStartTime = 0;
        }
        
        logDebug(`WebSocket disconnected: Code ${event.code}, Reason: ${event.reason || 'No reason provided'}`);
        this.attemptReconnect();
      };

      this.socket.onerror = (error) => {
        this.debugInfo.lastErrorMessage = `Connection error: ${error}`;
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.debugInfo.lastErrorMessage = `Creation error: ${error}`;
      this.attemptReconnect();
    }
  }

  private startPingInterval(): void {
    this.stopPingInterval(); // Clear any existing interval
    
    // Ping mỗi 30 giây để giữ kết nối
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        try {
          // Gửi ping để giữ kết nối
          this.socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          logDebug('Ping sent');
          
          // Check if we haven't received a message in 2 minutes
          const timeSinceLastMessage = Date.now() - this.lastMessageTime;
          if (timeSinceLastMessage > 120000) { // 2 minutes
            logDebug('No messages received for 2 minutes, reconnecting...');
            this.reconnect();
          }
        } catch (error) {
          console.error('Error sending ping:', error);
          this.reconnect();
        }
      }
    }, 30000);
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private reconnect(): void {
    if (this.socket) {
      try {
        this.socket.close();
      } catch (e) {
        // Ignore errors on close
      }
      this.socket = null;
    }
    this.connect();
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logDebug('Max reconnect attempts reached');
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    logDebug(`Attempting to reconnect in ${delay / 1000} seconds. Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  public disconnect(): void {
    logDebug('Manually disconnecting WebSocket');
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.stopPingInterval();
    this.listeners = {};
    this.reconnectAttempts = 0;
  }

  public addListener(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    logDebug(`Listener added for event: ${event}`);

    // Return a function to remove this specific listener
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
      logDebug(`Listener removed for event: ${event}`);
    };
  }

  private notifyListeners(event: string, data: any): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket listener for event ${event}:`, error);
        }
      });
    }
  }

  public isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  public getConnectionState(): string {
    if (!this.socket) return 'CLOSED';
    
    switch(this.socket.readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'OPEN';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }

  public getDebugInfo() {
    return {
      ...this.debugInfo,
      connectionState: this.getConnectionState(),
      isConnected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      registeredEventListeners: Object.keys(this.listeners).map(event => ({
        event,
        listenerCount: this.listeners[event].length
      }))
    };
  }

  public sendMessage(message: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(message));
        logDebug('Message sent:', message);
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        this.debugInfo.lastErrorMessage = `Send error: ${error}`;
      }
    } else {
      logDebug('WebSocket is not connected. Message not sent:', message);
    }
  }

  /**
   * Gửi thông tin khung giờ để lọc các booking theo thời gian
   * @param startTime Thời gian bắt đầu (định dạng ISO)
   * @param endTime Thời gian kết thúc (định dạng ISO)
   */
  public setTimeRange(startTime: string, endTime: string): void {
    const message = {
      type: 'setTimeFilter',
      data: {
        startTime,
        endTime
      }
    };
    this.sendMessage(message);
    logDebug(`Time filter set: ${startTime} → ${endTime}`);
  }
}

// Hook để sử dụng WebSocket trong component React
export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const wsService = useRef(WebSocketService.getInstance());
  const [debugInfo, setDebugInfo] = useState(wsService.current.getDebugInfo());

  useEffect(() => {
    const connectWebSocket = async () => {
      // Kiểm tra xem người dùng đã đăng nhập chưa trước khi kết nối
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        wsService.current.connect();
        setIsConnected(wsService.current.isConnected());

        // Thêm listener để theo dõi trạng thái kết nối
        const checkConnectionInterval = setInterval(() => {
          const connected = wsService.current.isConnected();
          setIsConnected(connected);
          setDebugInfo(wsService.current.getDebugInfo());
        }, 5000);

        return () => {
          clearInterval(checkConnectionInterval);
        };
      }
    };

    connectWebSocket();

    return () => {
      // Không ngắt kết nối khi component unmount để giữ kết nối trong toàn bộ ứng dụng
    };
  }, []);

  return {
    isConnected,
    debugInfo,
    addListener: wsService.current.addListener.bind(wsService.current),
    sendMessage: wsService.current.sendMessage.bind(wsService.current),
    connect: wsService.current.connect.bind(wsService.current),
    disconnect: wsService.current.disconnect.bind(wsService.current),
    getDebugInfo: wsService.current.getDebugInfo.bind(wsService.current)
  };
};

// Export singleton instance
const webSocketService = WebSocketService.getInstance();
export default webSocketService; 