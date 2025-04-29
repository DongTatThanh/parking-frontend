import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import webSocketService from '../api/websocket';

// Định nghĩa các loại sự kiện mà WebSocket có thể nhận được
export type WebSocketEventTypes = 
  | 'zonesUpdated'
  | 'bookingCreated'
  | 'bookingCancelled'
  | 'bookingCheckedIn'
  | 'bookingCheckedOut'
  | 'bookingExpired';

// Định nghĩa kiểu dữ liệu cho thông tin debug
export interface WebSocketDebugInfo {
  connectionAttempts: number;
  successfulConnections: number;
  messagesReceived: number;
  lastErrorMessage: string;
  connectionDuration: number;
  eventsReceived: Record<string, number>;
  connectionState: string;
  isConnected: boolean;
  reconnectAttempts: number;
  registeredEventListeners: Array<{
    event: string;
    listenerCount: number;
  }>;
}

// Định nghĩa kiểu dữ liệu cho Context
interface WebSocketContextType {
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  addListener: <T>(event: WebSocketEventTypes, callback: (data: T) => void) => () => void;
  sendMessage: (message: any) => void;
  setTimeRange: (startTime: string, endTime: string) => void;
  debugInfo: WebSocketDebugInfo;
  getDebugInfo: () => WebSocketDebugInfo;
}

// Tạo Context
const WebSocketContext = createContext<WebSocketContextType | null>(null);

// Provider Component
export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [debugInfo, setDebugInfo] = useState<WebSocketDebugInfo>(webSocketService.getDebugInfo());

  // Theo dõi trạng thái kết nối WebSocket
  useEffect(() => {
    const checkConnection = () => {
      const connected = webSocketService.isConnected();
      setIsConnected(connected);
      setDebugInfo(webSocketService.getDebugInfo());
    };

    // Kiểm tra kết nối ban đầu
    checkConnection();

    // Thiết lập interval để kiểm tra kết nối định kỳ
    const interval = setInterval(checkConnection, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Kết nối WebSocket khi component được mount
  useEffect(() => {
    webSocketService.connect();

    return () => {
      // Không ngắt kết nối khi unmount để duy trì kết nối trong toàn ứng dụng
    };
  }, []);

  // Method để gửi khung giờ qua WebSocket
  const setTimeRange = (startTime: string, endTime: string) => {
    if (isConnected) {
      try {
        const setTimeFilterMessage = {
          type: 'setTimeFilter',
          data: {
            startTime: startTime,
            endTime: endTime
          }
        };
        webSocketService.sendMessage(setTimeFilterMessage);
        console.log('Sent time filter to WebSocket:', setTimeFilterMessage);
      } catch (e) {
        console.error('Error sending time filter:', e);
      }
    } else {
      console.warn('Cannot send time filter: WebSocket is not connected');
    }
  };

  // Định nghĩa các methods cho context
  const contextValue: WebSocketContextType = {
    isConnected,
    debugInfo,
    connect: webSocketService.connect.bind(webSocketService),
    disconnect: webSocketService.disconnect.bind(webSocketService),
    addListener: webSocketService.addListener.bind(webSocketService),
    sendMessage: webSocketService.sendMessage.bind(webSocketService),
    setTimeRange,
    getDebugInfo: webSocketService.getDebugInfo.bind(webSocketService)
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Custom hook để sử dụng WebSocketContext
export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}; 