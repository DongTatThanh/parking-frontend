import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../Navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api/booking';
import BarkingLayoutScreen from './BarkingLayoutScreen';

const { width } = Dimensions.get('window');

// Định nghĩa các interface
interface ParkingZone {
  id: number;
  name: string;
  totalSpots: number;
  availableSpots: number;
  address?: string;
  parkingLotName?: string;
}

interface ParkingSpot {
  id: number;
  status: 'available' | 'occupied' | 'reserved';
  position: { row: number; col: number };
}

interface ZoneDetails extends ParkingZone {
  spots: ParkingSpot[];
}

interface PriceResponse {
  price: number;
  currency: string;
  priceDetails?: {
    basePrice: number;
    discounts?: { name: string; amount: number }[];
    taxes?: { name: string; amount: number }[];
  };
}
interface check_license_plate{
  licensePlate: string;
  userId: number;

}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface ZoneDetailsResponse {
  id: number;
  name: string;
  totalSpots: number;
  availableSpots: number;
  slots: Array<{
    id: number;
    code: string;
    status?: string;
    position_x: number;
    position_y: number;
  }>;
}

interface PriceCalculationResponse {
  totalPrice: number;
  currency: string;
  details?: {
    basePrice: number;
    taxes?: number;
    discounts?: number;
  };
}

interface BookingResponse {
  bookingId: string;
  status: string;
  totalPrice: number;
  currency: string;
  startTime: string;
  endTime: string;
  parkingZone: {
    id: number;
    name: string;
  };
  slot: {
    id: number;
    code: string;
  };
}

interface LicensePlateCheckResponse {
  isValid: boolean;
  message?: string;
}

// Progress bar component
const ProgressBar: React.FC<{ progress: number, color: string }> = ({ progress, color }) => {
  return (
    <View style={styles.progressBarContainer}>
      <View 
        style={[
          styles.progressBar, 
          { width: `${Math.max(0, Math.min(progress, 1)) * 100}%`, backgroundColor: color }
        ]} 
      />
    </View>
  );
};

const BookingScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'BookingScreen'>>();

  // State cho tab (Vé Ngày hoặc Vé Tháng)
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily');

  // State cho Vé Ngày
  const [dailyBookingDate, setDailyBookingDate] = useState<string>('Chưa chọn');
  const [dailyStartTime, setDailyStartTime] = useState<string>('Chưa chọn');
  const [dailyEndTime, setDailyEndTime] = useState<string>('Chưa chọn');
  const [dailyDuration, setDailyDuration] = useState<string>('');
  const [licensePlate, setLicensePlate] = useState<string>('');
  const [isLicensePlateConfirmed, setIsLicensePlateConfirmed] = useState<boolean>(false);

  // State cho Vé Tháng
  const [monthlyStartDate, setMonthlyStartDate] = useState<string>('Chưa chọn');
  const [monthlyEndDate, setMonthlyEndDate] = useState<string>('Chưa chọn');

  // State cho người dùng (nếu cần)
  const [user, setUser] = useState(null);

  // State cho số điện thoại
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [isPhoneNumberConfirmed, setIsPhoneNumberConfirmed] = useState<boolean>(false);

  // Thêm state để lưu danh sách khu vực
  const [parkingZones, setParkingZones] = useState<ParkingZone[]>([]);
  const [priceInfo, setPriceInfo] = useState<PriceResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Thêm hàm fetchParkingZones
  const fetchParkingZones = async () => {
    try {
      setLoading(true);
      console.log('Đang gọi API lấy danh sách khu vực đỗ xe');
      
      const response = await api.get<ApiResponse<ParkingZone[]>>('/bookings/zones');
      
      if (response.data.success && response.data.data) {
        setParkingZones(response.data.data);
      } else {
        throw new Error(response.data.message || 'Không thể tải danh sách khu vực đỗ xe');
      }
    } catch (error: any) {
      console.error('Lỗi khi lấy danh sách khu vực:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải danh sách khu vực đỗ xe');
      // Use sample data as fallback
      setParkingZones([
        { id: 1, name: 'Khu A', totalSpots: 50, availableSpots: 30 },
        { id: 2, name: 'Khu B', totalSpots: 40, availableSpots: 25 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Gọi API khi component mount
  useEffect(() => {
    fetchParkingZones();
  }, []);

  // Lấy thông tin người dùng từ AsyncStorage
  useEffect(() => {
    const fetchUser = async () => {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    };
    fetchUser();
  }, []);

  // Xử lý params từ ChooseTime.js (cho Vé Ngày)
  useEffect(() => {
    if (route.params) {
      const { bookingDate, startTime, endTime, duration } = route.params;
      if (bookingDate) setDailyBookingDate(bookingDate);
      if (startTime) setDailyStartTime(startTime);
      if (endTime) setDailyEndTime(endTime);
      if (duration) setDailyDuration(duration);
    }
  }, [route.params]);

  // Xử lý params từ ChooseTime.js (cho Vé Tháng)
  useEffect(() => {
    if (route.params && route.params.monthlyStartDate) {
      const startDate = new Date(route.params.monthlyStartDate);
      setMonthlyStartDate(formatDate(startDate));
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 30); // Tính ngày kết thúc (sau 30 ngày)
      setMonthlyEndDate(formatDate(endDate));
    }
  }, [route.params]);

  const formatDate = (date: Date): string => {
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  const formatLicensePlate = (text: string) => {
    // Remove all invalid characters
    text = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    // Extract parts
    const numbers1 = text.slice(0, 2).replace(/[^0-9]/g, ''); // First 2 digits
    const middle = text.slice(2, 4).replace(/[^A-Z0-9]/g, ''); // Next 2 characters (1 letter + 1 letter/number)
    const numbers2 = text.slice(4).replace(/[^0-9]/g, '').slice(0, 5); // Last 3-5 digits

    // Combine with hyphens
    let formatted = numbers1;
    if (middle) formatted += ` ${middle}`;
    if (numbers2) formatted += ` ${numbers2}`;
    return formatted.trim();
  };

  const validateLicensePlate = (plate: string) => {
    // Format: XX YZ NNNNN where:
    // XX: exactly 2 digits
    // Y: 1 letter
    // Z: 1 letter or number
    // NNNNN: 3 to 5 digits
    const pattern = /^[0-9]{2}\s[A-Z][A-Z0-9]\s[0-9]{3,5}$/;
    return pattern.test(plate);
  };

  const validatePhoneNumber = (phone: string) => {
    // Ensure the phone number is exactly 10 digits
    const pattern = /^[0-9]{10}$/;
    return pattern.test(phone);
  };

  const handleLicensePlateChange = (text: string) => {
    const formattedPlate = formatLicensePlate(text);
    setLicensePlate(formattedPlate);
  };

  const renderLicensePlateInput = () => (
    <View style={styles.formGroup}>
      <Text style={styles.label}>Biển số xe</Text>
      {!isLicensePlateConfirmed ? (
        <View style={styles.licensePlateInputContainer}>
          <TextInput
            style={styles.licensePlateInput}
            value={licensePlate}
            onChangeText={handleLicensePlateChange}
            placeholder="VD: 26 A1 12345"
            autoCapitalize="characters"
            maxLength={12}
          />
          <TouchableOpacity 
            style={[
              styles.confirmButton,
              (!licensePlate || !validateLicensePlate(licensePlate)) && styles.confirmButtonDisabled
            ]}
            onPress={() => setIsLicensePlateConfirmed(true)}
            disabled={!licensePlate || !validateLicensePlate(licensePlate)}
          >
            <Text style={styles.confirmButtonText}>Xác nhận</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.confirmedLicensePlate}>
          <Text style={styles.confirmedLicensePlateText}>{licensePlate}</Text>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => setIsLicensePlateConfirmed(false)}
          >
            <Text style={styles.editButtonText}>Sửa</Text>
          </TouchableOpacity>
        </View>
      )}
      {licensePlate && !validateLicensePlate(licensePlate) && (
        <Text style={styles.errorText}>
          Biển số không hợp lệ. Định dạng: 26 A1 12345
        </Text>
      )}
    </View>
  );

  const renderPhoneNumberInput = () => (
    <View style={styles.formGroup}>
      <Text style={styles.label}>Số điện thoại đặt vé</Text>
      {!isPhoneNumberConfirmed ? (
        <View style={styles.phoneNumberInputContainer}>
          <TextInput
            style={styles.phoneNumberInput}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="VD: 0987654321"
            keyboardType="numeric"
            maxLength={10}
          />
          <TouchableOpacity
            style={[
              styles.confirmButton,
              (!phoneNumber || !validatePhoneNumber(phoneNumber)) && styles.confirmButtonDisabled,
            ]}
            onPress={() => setIsPhoneNumberConfirmed(true)}
            disabled={!phoneNumber || !validatePhoneNumber(phoneNumber)}
          >
            <Text style={styles.confirmButtonText}>Xác nhận</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.confirmedPhoneNumber}>
          <Text style={styles.confirmedPhoneNumberText}>{phoneNumber}</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsPhoneNumberConfirmed(false)}
          >
            <Text style={styles.editButtonText}>Sửa</Text>
          </TouchableOpacity>
        </View>
      )}
      {phoneNumber && !validatePhoneNumber(phoneNumber) && (
        <Text style={styles.errorText}>
          Số điện thoại không hợp lệ. Định dạng: 10 chữ số.
        </Text>
      )}
    </View>
  );

  const renderDailyTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Đặt Vé Ngày</Text>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Ngày đặt chỗ</Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate('ChooseTime', { type: 'daily' })} 
          style={styles.dateInput}
        >
          <Text>{dailyBookingDate}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Giờ đặt chỗ</Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate('ChooseTime', { type: 'daily' })} 
          style={styles.dateInput}
        >
          <Text>{dailyStartTime} - {dailyEndTime}</Text>
        </TouchableOpacity>
      </View>
      {dailyDuration ? (
        <View style={styles.durationContainer}>
          <Text style={styles.durationLabel}>Tổng thời gian:</Text>
          <Text style={styles.durationValue}>{dailyDuration}</Text>
        </View>
      ) : null}
      
      {dailyBookingDate !== 'Chưa chọn' && dailyStartTime !== 'Chưa chọn' && (
        <TouchableOpacity 
          style={styles.calculateButton}
          onPress={calculatePrice}
        >
          <Text style={styles.calculateButtonText}>Tính giá vé</Text>
        </TouchableOpacity>
      )}
      
      {priceInfo && (
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Giá vé:</Text>
          <Text style={styles.priceValue}>{priceInfo.price.toLocaleString()} {priceInfo.currency}</Text>
        </View>
      )}
    </View>
  );

  const renderMonthlyTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Đặt Vé Tháng</Text>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Ngày bắt đầu</Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate('ChooseTime', { type: 'monthly' })} 
          style={styles.dateInput}
        >
          <Text>{monthlyStartDate}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Ngày kết thúc</Text>
        <TextInput
          style={[styles.dateInput, { backgroundColor: '#f0f0f0' }]}
          value={monthlyEndDate}
          editable={false}
        />
      </View>
      {monthlyStartDate !== 'Chưa chọn' && monthlyEndDate !== 'Chưa chọn' && (
        <View style={styles.durationContainer}>
          <Text style={styles.durationLabel}>Thời gian vé tháng:</Text>
          <Text style={styles.durationValue}>
            {monthlyStartDate} - {monthlyEndDate}
          </Text>
        </View>
      )}
    </View>
  );

  const fetchZoneDetails = async (zoneId: number | string) => {
    try {
      setLoading(true);
      console.log('Đang gọi API lấy chi tiết khu vực:', zoneId);
      
      const response = await api.get<ApiResponse<ZoneDetailsResponse>>(`/bookings/zones/${zoneId}`);
      
      if (response.data.success && response.data.data) {
        const zoneData = response.data.data;
        
        // Map the slots data to the expected format
        const mappedSlots = zoneData.slots.map(slot => ({
          id: slot.id || 0,
          code: slot.code || '',
          status: slot.status || 'available',
          position: {
            row: slot.position_x || 0,
            col: slot.position_y || 0
          }
        }));

        navigation.navigate('BarkingLayoutScreen', { 
          zoneId: zoneData.id.toString(),
          totalSpots: zoneData.totalSpots,
          availableSpots: zoneData.availableSpots,
          zoneData: JSON.stringify(mappedSlots)
        });
      } else {
        throw new Error(response.data.message || 'API trả về dữ liệu không hợp lệ');
      }
    } catch (error: any) {
      console.error(`Lỗi khi lấy chi tiết khu vực ${zoneId}:`, error);
      Alert.alert(
        'Lỗi',
        error.message || 'Không thể tải thông tin chi tiết khu vực. Vui lòng thử lại sau.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } finally {
      setLoading(false);
    }
  };

  const checkLicensePlate = async (licensePlate: string) => {
    try {
      const response = await api.get<ApiResponse<LicensePlateCheckResponse>>(`/validate/license-plate/${licensePlate}`);
      
      if (response.data.success && response.data.data) {
        return response.data.data.isValid;
      }
      return false;
    } catch (error) {
      console.error('Lỗi khi kiểm tra biển số xe:', error);
      return false;
    }
  };

  const calculatePrice = async () => {
    if (!dailyBookingDate || dailyStartTime === 'Chưa chọn' || dailyEndTime === 'Chưa chọn') {
      Alert.alert('Thông báo', 'Vui lòng chọn đầy đủ ngày và giờ đặt chỗ');
      return;
    }

    try {
      setLoading(true);
      
      const startDateTime = activeTab === 'daily' 
        ? `${dailyBookingDate} ${dailyStartTime}` 
        : monthlyStartDate;
        
      const endDateTime = activeTab === 'daily'
        ? `${dailyBookingDate} ${dailyEndTime}`
        : monthlyEndDate;
      
      const params = {
        lotId: 1,
        bookingType: activeTab,
        startTime: startDateTime,
        endTime: endDateTime
      };
      
      const response = await api.post<ApiResponse<PriceCalculationResponse>>('/calculate-price', params);
      
      if (response.data.success && response.data.data) {
        setPriceInfo({
          price: response.data.data.totalPrice,
          currency: response.data.data.currency,
          priceDetails: {
            basePrice: response.data.data.totalPrice
          }
        });
      } else {
        throw new Error(response.data.message || 'Không thể tính giá');
      }
    } catch (error: any) {
      console.error('Lỗi khi tính giá:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tính giá. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const createBooking = async (slotId: number, zoneId: string) => {
    if (!isLicensePlateConfirmed || !isPhoneNumberConfirmed) {
      Alert.alert('Thông báo', 'Vui lòng xác nhận biển số xe và số điện thoại');
      return;
    }

    const isLicensePlateValid = await checkLicensePlate(licensePlate);
    if (!isLicensePlateValid) {
      return;
    }

    try {
      setLoading(true);
      
      const userData = await AsyncStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;
      const userId = user?.id || 1;
      
      const startDateTime = activeTab === 'daily' 
        ? `${dailyBookingDate} ${dailyStartTime}:00`
        : `${monthlyStartDate} 00:00:00`;
        
      const endDateTime = activeTab === 'daily'
        ? `${dailyBookingDate} ${dailyEndTime}:00`
        : `${monthlyEndDate} 23:59:59`;
      
      const bookingData = {
        userId,
        lotId: 1,
        slotId,
        priceId: 1,
        bookingType: activeTab,
        startTime: startDateTime,
        endTime: endDateTime,
        licensePlate,
        phoneNumber
      };
      
      const response = await api.post<ApiResponse<BookingResponse>>('/bookings', bookingData);
      
      if (response.data.success) {
        Alert.alert('Success', `Booking created successfully! Booking ID: ${response.data.data.bookingId}`);
        // Reset form and navigate
        setLicensePlate('');
        setPhoneNumber('');
        navigation.navigate('HomeScreen');
      } else {
        Alert.alert('Error', response.data.message || 'Failed to create booking');
      }
    } catch (error: any) {
      console.error('Lỗi khi tạo booking:', error);
      Alert.alert('Lỗi', 'Không thể đặt chỗ. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Quay lại</Text>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Đặt Chỗ Đỗ Xe</Text>
          <Text style={styles.headerSubtitle}>
            Chọn thời gian và khu vực để đặt chỗ
          </Text>
        </View>
        
        <View style={styles.content}>
          <View style={styles.licensePlateSection}>
            <Text style={styles.sectionTitle}>Thông tin xe</Text>
            {renderLicensePlateInput()}
            {renderPhoneNumberInput()}
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'daily' && styles.activeTab]}
              onPress={() => setActiveTab('daily')}
            >
              <Text style={[styles.tabText, activeTab === 'daily' && styles.activeTabText]}>Vé Ngày</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'monthly' && styles.activeTab]}
              onPress={() => setActiveTab('monthly')}
            >
              <Text style={[styles.tabText, activeTab === 'monthly' && styles.activeTabText]}>Vé Tháng</Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'daily' ? renderDailyTab() : renderMonthlyTab()}

          <View style={styles.parkingZonesSection}>
            <Text style={styles.sectionTitle}>Chọn khu vực đỗ xe</Text>
            
            {loading ? (
              <ActivityIndicator size="large" color="#3b82f6" style={{marginVertical: 20}} />
            ) : (
              <View style={styles.zonesGrid}>
                {parkingZones.map((zone) => {
                  let availabilityColor = '#10b981';
                  if (zone.availableSpots === 0) {
                    availabilityColor = '#ef4444';
                  } else if (zone.availableSpots < 10) {
                    availabilityColor = '#f59e0b';
                  }
                  
                  const occupancyRate = (zone.totalSpots - zone.availableSpots) / zone.totalSpots;
                  
                  return (
                    <TouchableOpacity 
                      key={zone.id}
                      style={[
                        styles.zoneCard,
                        zone.availableSpots === 0 && styles.zoneCardDisabled
                      ]}
                      disabled={zone.availableSpots === 0}
                      onPress={() => {
                        // Đầu tiên gọi API để lấy chi tiết khu vực
                        fetchZoneDetails(zone.id);
                      }}
                    >
                      <View style={styles.zoneCardHeader}>
                        <Text style={styles.zoneName}>{zone.name}</Text>
                        <View 
                          style={[
                            styles.availabilityBadge, 
                            { backgroundColor: `${availabilityColor}20` }
                          ]}
                        >
                          <Text 
                            style={[
                              styles.availabilityText, 
                              { color: availabilityColor }
                            ]}
                          >
                            {zone.availableSpots > 0 
                              ? `${zone.availableSpots} chỗ trống`
                              : "Hết chỗ"
                            }
                          </Text>
                        </View>
                      </View>
                      <View style={styles.occupancyContainer}>
                        <ProgressBar 
                          progress={occupancyRate} 
                          color={availabilityColor} 
                        />
                        <Text style={styles.occupancyText}>
                          {zone.availableSpots}/{zone.totalSpots}
                        </Text>
                      </View>
                      
                      {zone.availableSpots > 0 ? (
                        <View style={styles.viewMapButton}>
                          <Text style={styles.viewMapText}>Xem sơ đồ</Text>
                          <Text style={styles.arrowIcon}>→</Text>
                        </View>
                      ) : (
                        <Text style={styles.noAvailabilityText}>
                          Khu vực hiện không có chỗ trống
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
          
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Thông tin hữu ích</Text>
            
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <View style={styles.infoIconContainer}>
                  <Text style={styles.infoIcon}>🕒</Text>
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Giờ hoạt động</Text>
                  <Text style={styles.infoText}>
                    Thứ Hai - Chủ Nhật: 6:00 - 22:00{'\n'}
                    Ngày lễ: 8:00 - 20:00
                  </Text>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <View style={styles.infoIconContainer}>
                  <Text style={styles.infoIcon}>💳</Text>
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Phương thức thanh toán</Text>
                  <Text style={styles.infoText}>
                    Chấp nhận thanh toán qua ví điện tử, thẻ tín dụng/ghi nợ và tiền mặt.
                  </Text>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <View style={styles.infoIconContainer}>
                  <Text style={styles.infoIcon}>📋</Text>
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Chính sách hủy</Text>
                  <Text style={styles.infoText}>
                    Miễn phí hủy đặt chỗ trước 2 giờ. Phí hủy 50% sau thời gian đó.
                  </Text>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <View style={styles.infoIconContainer}>
                  <Text style={styles.infoIcon}>📱</Text>
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Liên hệ hỗ trợ</Text>
                  <Text style={styles.infoText}>
                    Hotline: +84 972068334{'\n'}
                    Email: support@timbainha.vn
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 16,
    paddingTop: 8,
    backgroundColor: '#fff',
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#666',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    padding: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#ddd',
  },
  activeTab: {
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  tabContent: {
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: '#555',
  },
  dateInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
  },
  durationContainer: {
    marginTop: 8,
    backgroundColor: '#e6f7ff',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  durationLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0077cc',
  },
  durationValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0077cc',
  },
  parkingZonesSection: {
    marginBottom: 24,
  },
  zonesGrid: {
    flexDirection: 'column',
  },
  zoneCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  zoneCardDisabled: {
    backgroundColor: '#f9fafb',
    opacity: 0.8,
  },
  zoneCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  zoneName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  availabilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '500',
  },
  occupancyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  occupancyText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#666',
    minWidth: 50,
    textAlign: 'right',
  },
  viewMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewMapText: {
    color: '#3b82f6',
    fontSize: 14,
  },
  arrowIcon: {
    color: '#3b82f6',
    fontSize: 14,
    marginLeft: 4,
  },
  noAvailabilityText: {
    fontSize: 14,
    color: '#888',
  },
  infoSection: {
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  infoGrid: {
    flexDirection: 'column',
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoIcon: {
    fontSize: 18,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  licensePlateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  licensePlateInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    fontSize: 16,
  },
  confirmButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  confirmButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmedLicensePlate: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    justifyContent: 'space-between',
  },
  confirmedLicensePlateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  editButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  licensePlateSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  phoneNumberInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phoneNumberInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    fontSize: 16,
  },
  confirmedPhoneNumber: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    justifyContent: 'space-between',
  },
  confirmedPhoneNumberText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginVertical: 20,
  },
  calculateButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  calculateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  priceContainer: {
    marginTop: 16,
    backgroundColor: '#ecfdf5',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#047857',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '700',      
    color: '#047857',
  },
});

export default BookingScreen;