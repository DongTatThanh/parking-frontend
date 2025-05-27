import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Switch
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api/booking';

// Interface cho item hiển thị trên UI
type HistoryItem = {
  id: string;
  date: string;
  parkingZone: string;
  duration: string;
  cost: string;
  status: 'completed' | 'cancelled' | 'ongoing';
  spotCode?: string;
  startTime?: string;
  endTime?: string;
  licensePlate?: string;
  userName?: string;
  bookingType: 'daily' | 'monthly';
};

// Interface cho dữ liệu từ API
type BookingHistoryItem = {
  bookingId: number;
  status: 'completed' | 'cancelled' | 'ongoing';
  licensePlate: string;
  vehicleType: string;
  zoneName: string;
  slotCode: string;
  startTime: string;
  endTime: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  amount: string;
  paymentStatus: string;
  createdAt: string;
  booking_type: 'daily' | 'monthly';
};

type PaginationInfo = {
  currentPage: number;
  limit: number;
  totalPages: number;
  totalRecords: number;
};

type HistoryResponse = {
  history: BookingHistoryItem[];
  pagination: PaginationInfo;
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

const HistoryScreen: React.FC = () => {
  const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Load history on component mount
  useEffect(() => {
    loadUserInfo().then(() => fetchBookingHistory(1));
  }, []);

  // Fetch history when showAllBookings changes (for admin toggle)
  useEffect(() => {
    if (isAdmin) {
      setCurrentPage(1);
      fetchBookingHistory(1);
    }
  }, [showAllBookings]);

  // Function to load user info from AsyncStorage
  const loadUserInfo = async () => {
    try {
      const userInfoStr = await AsyncStorage.getItem('userInfo');
      const userData = await AsyncStorage.getItem('user');
      
      let foundUserId = null;
      let userRole = '';
      
      if (userInfoStr) {
        const userInfo = JSON.parse(userInfoStr);
        if (userInfo.id) {
          foundUserId = userInfo.id;
          userRole = userInfo.role || '';
        }
      }
      
      if (!foundUserId && userData) {
        const user = JSON.parse(userData);
        if (user.id) {
          foundUserId = user.id;
          userRole = user.role || '';
        }
      }
      
      setUserId(foundUserId);
      setIsAdmin(userRole === 'admin');
      
      console.log('User info loaded:', { userId: foundUserId, isAdmin: userRole === 'admin' });
      return { userId: foundUserId, isAdmin: userRole === 'admin' };
    } catch (error) {
      console.error('Error loading user info:', error);
      return { userId: null, isAdmin: false };
    }
  };

  // Function to fetch user booking history
  const fetchUserBookingHistory = async (currentUserId: number, page = 1, limit = 10) => {
    try {
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('accessToken') || await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      const response = await api.get<ApiResponse<HistoryResponse>>(`/bookings/history/${currentUserId}`, {
        params: { page, limit },
        headers
      });
      
      if (response.success && response.data?.data?.history) {
        // Cập nhật thông tin phân trang
        setTotalPages(response.data.data.pagination.totalPages);
        setHasMoreData(page < response.data.data.pagination.totalPages);
        
        return response.data.data.history;
      } else {
        console.log('No user history data or invalid format:', response);
        return [];
      }
    } catch (error) {
      console.error('Error fetching user booking history:', error);
      if (error instanceof Error && error.message.includes('token')) {
        Alert.alert('Lỗi xác thực', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        // TODO: Redirect to login screen
      }
      throw error;
    }
  };

  // Function to fetch all booking history (admin only)
  const fetchAllBookingHistory = async () => {
    try {
      const response = await api.get('/bookings/history');
      
      if (response.success && Array.isArray(response.data)) {
        return response.data;
      } else {
        console.log('No admin history data or invalid format:', response);
        return [];
      }
    } catch (error) {
      console.error('Error fetching all booking history:', error);
      throw error;
    }
  };

  // Function to format booking data for display
  const formatBookingData = (bookings: BookingHistoryItem[]): HistoryItem[] => {
    return bookings.map((booking) => {
      // Convert date string to dd/mm/yyyy format
      const bookingDate = new Date(booking.createdAt);
      const formattedDate = `${bookingDate.getDate().toString().padStart(2, '0')}/${(bookingDate.getMonth() + 1).toString().padStart(2, '0')}/${bookingDate.getFullYear()}`;
      
      // Format time from API response
      const formatTime = (timeStr: string) => {
        if (!timeStr) return '';
        const time = new Date(timeStr);
        return `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
      };
      
      // Determine booking status
      let status: 'completed' | 'cancelled' | 'ongoing' = 'ongoing';
      if (booking.status === 'completed' || booking.paymentStatus === 'completed') {
        status = 'completed';
      } else if (booking.status === 'cancelled') {
        status = 'cancelled';
      }
      
      const startTimeFormatted = formatTime(booking.startTime);
      const endTimeFormatted = formatTime(booking.endTime);

      // Format duration based on booking type
      let duration = '';
      if (booking.booking_type === 'monthly') {
        const startDate = new Date(booking.startTime);
        const endDate = new Date(booking.endTime);
        duration = `${startDate.getDate()}/${startDate.getMonth() + 1} - ${endDate.getDate()}/${endDate.getMonth() + 1}`;
      } else {
        duration = `${startTimeFormatted} - ${endTimeFormatted}`;
      }
      
      return {
        id: booking.bookingId.toString(),
        date: formattedDate,
        parkingZone: booking.zoneName,
        spotCode: booking.slotCode,
        duration: duration,
        cost: `${parseInt(booking.amount).toLocaleString('vi-VN')} VND`,
        status: status,
        startTime: booking.startTime,
        endTime: booking.endTime,
        licensePlate: booking.licensePlate,
        userName: '',
        bookingType: booking.booking_type
      };
    });
  };

  // Main function to fetch booking history
  const fetchBookingHistory = async (page = 1, isLoadMore = false) => {
    try {
      if (!isLoadMore) {
      setLoading(true);
      }
      
      // Load user info if not already loaded
      const { userId: currentUserId, isAdmin: userIsAdmin } = 
        (userId && isAdmin !== undefined) ? { userId, isAdmin } : await loadUserInfo();
      
      if (!currentUserId && !userIsAdmin) {
        throw new Error('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
      }
      
      let bookingData = [];
      
      // Fetch data based on user role and view mode
      if (userIsAdmin && showAllBookings) {
        // Admin viewing all bookings
        bookingData = await fetchAllBookingHistory();
      } else if (currentUserId) {
        // User viewing their own bookings
        bookingData = await fetchUserBookingHistory(currentUserId, page, ITEMS_PER_PAGE);
      }
      
      // Format the data for display
      const formattedHistory = formatBookingData(bookingData);
      
      // Update state based on whether this is a load more operation
      if (isLoadMore) {
        setHistoryData(prev => [...prev, ...formattedHistory]);
      } else {
      setHistoryData(formattedHistory);
      }

      // Update pagination state
      setCurrentPage(page);
      
    } catch (error) {
      console.error('Error fetching booking history:', error);
      Alert.alert('Lỗi', 'Không thể tải lịch sử đặt chỗ. Vui lòng thử lại sau.');
      if (!isLoadMore) {
      setHistoryData([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Function to handle loading more data
  const handleLoadMore = () => {
    if (!loading && hasMoreData && currentPage < totalPages) {
      fetchBookingHistory(currentPage + 1, true);
    }
  };

  // Function to handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(1);
    await fetchBookingHistory(1);
  };

  // Function to handle refresh button click
  const handleRefreshClick = () => {
    setCurrentPage(1);
    fetchBookingHistory(1, false);
  };

  const renderHistoryItem = ({ item }: { item: HistoryItem }) => {
    const statusColor = item.status === 'completed' 
      ? '#4CAF50' 
      : item.status === 'ongoing' 
        ? '#2196F3' 
        : '#F44336';
        
    return (
      <View style={styles.historyCard}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyDate}>{item.date}</Text>
          <View style={styles.headerInfo}>
            <View style={[styles.typeBadge]}>
              <Text style={styles.typeText}>
                {item.bookingType === 'monthly' ? 'Vé tháng' : 'Vé ngày'}
              </Text>
            </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>
              {item.status === 'completed' ? 'Hoàn thành' : 
               item.status === 'ongoing' ? 'Đang diễn ra' : 'Đã hủy'}
            </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.historyDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Khu vực:</Text>
            <Text style={styles.detailValue}>{item.parkingZone}</Text>
          </View>
          
          {item.spotCode && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Vị trí:</Text>
              <Text style={styles.detailValue}>{item.spotCode}</Text>
            </View>
          )}
          
          {item.licensePlate && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Biển số xe:</Text>
              <Text style={styles.detailValue}>{item.licensePlate}</Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {item.bookingType === 'monthly' ? 'Thời hạn:' : 'Thời gian:'}
            </Text>
            <Text style={styles.detailValue}>{item.duration}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Chi phí:</Text>
            <Text style={styles.detailValue}>{item.cost}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>Không có lịch sử đặt chỗ</Text>
      <TouchableOpacity style={styles.refreshButton} onPress={handleRefreshClick}>
        <Text style={styles.refreshButtonText}>Tải lại</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lịch sử đỗ xe</Text>
      </View>
      
      {isAdmin && (
        <View style={styles.adminPanel}>
          <Text style={styles.adminPanelText}>
            {showAllBookings ? 'Xem tất cả đặt chỗ' : 'Chỉ xem đặt chỗ của tôi'}
          </Text>
          <Switch
            value={showAllBookings}
            onValueChange={setShowAllBookings}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={showAllBookings ? '#3b82f6' : '#f4f3f4'}
          />
        </View>
      )}
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Đang tải lịch sử...</Text>
        </View>
      ) : (
        <FlatList
          data={historyData}
          renderItem={renderHistoryItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#3b82f6']}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() => (
            loading && hasMoreData ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#3b82f6" />
              </View>
            ) : null
          )}
        />
      )}
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
  adminPanel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    padding: 12,
    marginBottom: 8,
  },
  adminPanelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0369a1',
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  historyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 8,
  },
  historyDate: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  historyDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    color: '#757575',
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  refreshButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  }
});

export default HistoryScreen;