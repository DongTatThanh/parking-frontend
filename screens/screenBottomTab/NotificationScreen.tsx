import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';

type Notification = {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
};

const notificationsData: Notification[] = [
  {
    id: '1',
    title: 'Khuyến mãi đặc biệt',
    message: 'Giảm 50% phí đỗ xe cho khách hàng mới trong tháng 3/2025',
    time: '2 giờ trước',
    read: false,
  },
  {
    id: '2',
    title: 'Cảnh báo thời gian',
    message: 'Thời gian đỗ xe của bạn sắp hết. Vui lòng gia hạn hoặc di chuyển xe.',
    time: '1 ngày trước',
    read: true,
  },
  {
    id: '3',
    title: 'Xác nhận đặt chỗ',
    message: 'Đặt chỗ của bạn tại Khu D vị trí D12 đã được xác nhận.',
    time: '2 ngày trước',
    read: true,
  },
  {
    id: '4',
    title: 'Cập nhật ứng dụng',
    message: 'Phiên bản mới đã sẵn sàng. Cập nhật ngay để trải nghiệm tính năng mới!',
    time: '1 tuần trước',
    read: true,
  },
];

const NotificationsScreen: React.FC = () => {
  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity 
      style={[
        styles.notificationCard, 
        item.read ? styles.readNotification : styles.unreadNotification
      ]}
    >
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationMessage}>{item.message}</Text>
        <Text style={styles.notificationTime}>{item.time}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thông báo</Text>
      </View>
      
      <FlatList
        data={notificationsData}
        renderItem={renderNotificationItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: 'black',
    padding: 16,
    paddingTop: 24,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  notificationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  readNotification: {
    opacity: 0.8,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2196F3',
    marginLeft: 8,
  },
});

export default NotificationsScreen;