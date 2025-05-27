import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, FlatList } from 'react-native';
import { useWebSocketContext, WebSocketDebugInfo } from '../../context/WebSocketContext';
import webSocketService from '../../api/websocket';

// Kiểu dữ liệu cho các log event
interface LogEvent {
  id: number;
  time: string;
  type: 'connection' | 'message' | 'error';
  message: string;
  data?: any;
}

const WebSocketDebugger: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({ visible, onClose }) => {
  const { isConnected, connect, disconnect, debugInfo } = useWebSocketContext();
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [autoscroll, setAutoscroll] = useState(true);
  const [showDetailedInfo, setShowDetailedInfo] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const eventIdCounter = useRef(0);

  // Thêm event vào log
  const addLogEvent = (type: 'connection' | 'message' | 'error', message: string, data?: any) => {
    const newEvent: LogEvent = {
      id: eventIdCounter.current++,
      time: new Date().toLocaleTimeString(),
      type,
      message,
      data
    };
    
    setEvents(prev => {
      // Giới hạn số lượng events (giữ 50 event gần nhất)
      const updated = [newEvent, ...prev].slice(0, 50);
      return updated;
    });
  };

  // Theo dõi trạng thái kết nối
  useEffect(() => {
    addLogEvent('connection', isConnected ? 'Kết nối thành công' : 'Mất kết nối');
  }, [isConnected]);

  // Đăng ký listener cho tất cả các loại sự kiện
  useEffect(() => {
    const eventHandler = (data: any) => {
      addLogEvent('message', 'Nhận event', data);
    };
    
    // Đăng ký theo dõi tất cả các loại events
    const eventTypes = ['zonesUpdated', 'bookingCreated', 'bookingCancelled', 'bookingCheckedIn', 'bookingCheckedOut', 'bookingExpired'];
    const unsubscribers = eventTypes.map(eventType => 
      webSocketService.addListener(eventType, eventHandler)
    );
    
    return () => {
      // Hủy đăng ký khi component unmount
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  // Auto-scroll xuống bottom khi có event mới
  useEffect(() => {
    if (autoscroll && scrollViewRef.current && events.length > 0) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [events, autoscroll]);

  // Định dạng hiển thị dữ liệu
  const formatData = (data: any): string => {
    try {
      return JSON.stringify(data, null, 2);
    } catch (e) {
      return String(data);
    }
  };

  // Tính thời gian kết nối dưới dạng chuỗi
  const formatConnectionTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.floor(seconds)} giây`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phút ${Math.floor(seconds % 60)} giây`;
    return `${Math.floor(seconds / 3600)} giờ ${Math.floor((seconds % 3600) / 60)} phút`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>WebSocket Debugger</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Đóng</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Trạng thái:</Text>
          <Text style={[
            styles.statusValue,
            { color: isConnected ? '#10b981' : '#ef4444' }
          ]}>
            {isConnected ? 'Đã kết nối' : 'Chưa kết nối'} 
            ({debugInfo?.connectionState || 'UNKNOWN'})
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.detailsToggle} 
          onPress={() => setShowDetailedInfo(!showDetailedInfo)}
        >
          <Text style={styles.detailsToggleText}>
            {showDetailedInfo ? 'Ẩn thông tin chi tiết' : 'Hiển thị thông tin chi tiết'}
          </Text>
        </TouchableOpacity>

        {showDetailedInfo && (
          <View style={styles.detailsContainer}>
            <Text style={styles.detailTitle}>Thông tin kết nối</Text>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Số lần thử kết nối:</Text>
              <Text style={styles.detailValue}>{debugInfo?.connectionAttempts || 0}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Kết nối thành công:</Text>
              <Text style={styles.detailValue}>{debugInfo?.successfulConnections || 0}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Thời gian kết nối:</Text>
              <Text style={styles.detailValue}>
                {formatConnectionTime(debugInfo?.connectionDuration || 0)}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Tin nhắn đã nhận:</Text>
              <Text style={styles.detailValue}>{debugInfo?.messagesReceived || 0}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Lỗi gần nhất:</Text>
              <Text style={[styles.detailValue, styles.errorText]}>
                {debugInfo?.lastErrorMessage || 'Không có lỗi'}
              </Text>
            </View>

            {debugInfo?.eventsReceived && Object.keys(debugInfo.eventsReceived).length > 0 && (
              <>
                <Text style={styles.detailSectionTitle}>Số lượng sự kiện theo loại</Text>
                {Object.entries(debugInfo.eventsReceived).map(([event, count]) => (
                  <View key={event} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{event}:</Text>
                    <Text style={styles.detailValue}>{count}</Text>
                  </View>
                ))}
              </>
            )}

            {debugInfo?.registeredEventListeners && debugInfo.registeredEventListeners.length > 0 && (
              <>
                <Text style={styles.detailSectionTitle}>Các sự kiện đã đăng ký lắng nghe</Text>
                {debugInfo.registeredEventListeners.map((listener: {event: string, listenerCount: number}, index: number) => (
                  <View key={index} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{listener.event}:</Text>
                    <Text style={styles.detailValue}>{listener.listenerCount} lắng nghe</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            onPress={connect} 
            style={[styles.actionButton, { backgroundColor: '#3b82f6' }]}
            disabled={isConnected}
          >
            <Text style={styles.actionButtonText}>Kết nối</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={disconnect} 
            style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
            disabled={!isConnected}
          >
            <Text style={styles.actionButtonText}>Ngắt kết nối</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => setEvents([])} 
            style={[styles.actionButton, { backgroundColor: '#9ca3af' }]}
          >
            <Text style={styles.actionButtonText}>Xóa log</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.autoscrollContainer}>
          <TouchableOpacity onPress={() => setAutoscroll(!autoscroll)}>
            <Text style={styles.autoscrollText}>
              Auto-scroll: {autoscroll ? 'Bật' : 'Tắt'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.eventsTitle}>
          Lịch sử sự kiện ({events.length})
        </Text>
        
        <ScrollView 
          ref={scrollViewRef} 
          style={styles.eventsContainer}
          onContentSizeChange={() => {
            if (autoscroll && scrollViewRef.current) {
              scrollViewRef.current.scrollToEnd({ animated: true });
            }
          }}
        >
          {events.map((event) => (
            <View 
              key={event.id}
              style={[
                styles.eventItem,
                event.type === 'connection' && styles.connectionEvent,
                event.type === 'message' && styles.messageEvent,
                event.type === 'error' && styles.errorEvent
              ]}
            >
              <Text style={styles.eventTime}>{event.time}</Text>
              <Text style={styles.eventMessage}>{event.message}</Text>
              
              {event.data && (
                <View style={styles.eventData}>
                  <Text style={styles.eventDataText}>
                    {formatData(event.data)}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
    paddingTop: 40
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  closeButton: {
    padding: 8
  },
  closeButtonText: {
    fontSize: 16,
    color: '#3b82f6'
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  detailsToggle: {
    alignItems: 'center',
    marginBottom: 8,
    padding: 8
  },
  detailsToggleText: {
    color: '#3b82f6',
    fontSize: 14
  },
  detailsContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
    color: '#4b5563'
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280'
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827'
  },
  errorText: {
    color: '#ef4444'
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: 16
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center'
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '500'
  },
  autoscrollContainer: {
    alignItems: 'flex-end',
    marginBottom: 8
  },
  autoscrollText: {
    fontSize: 12,
    color: '#666'
  },
  eventsTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8
  },
  eventsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8
  },
  eventItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  connectionEvent: {
    backgroundColor: '#f0f9ff'
  },
  messageEvent: {
    backgroundColor: '#f0fdf4'
  },
  errorEvent: {
    backgroundColor: '#fef2f2'
  },
  eventTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  eventMessage: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4
  },
  eventData: {
    backgroundColor: '#f1f5f9',
    padding: 8,
    borderRadius: 4
  },
  eventDataText: {
    fontSize: 12,
    fontFamily: 'monospace'
  }
});

// Hook để sử dụng WebSocketDebugger
export const useWebSocketDebugger = () => {
  const [debugVisible, setDebugVisible] = useState(false);
  
  const showDebugger = () => setDebugVisible(true);
  const hideDebugger = () => setDebugVisible(false);
  
  const DebuggerComponent = () => (
    <WebSocketDebugger 
      visible={debugVisible} 
      onClose={hideDebugger} 
    />
  );
  
  return {
    showDebugger,
    hideDebugger,
    DebuggerComponent
  };
};

export default WebSocketDebugger; 