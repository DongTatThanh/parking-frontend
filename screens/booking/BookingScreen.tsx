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
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api/booking';
import BarkingLayoutScreen from './BarkingLayoutScreen';

// Define RootStackParamList here to include all the parameters we need
export type RootStackParamList = {
  BookingScreen: {
    bookingDate?: string;
    startTime?: string;
    endTime?: string;
    duration?: string;
    monthlyStartDate?: string;
    selectedSpotId?: number;
    selectedZoneId?: string;
    selectedSpotCode?: string;
    action?: 'proceed_to_payment';
  };
  ChooseTime: {
    type: 'daily' | 'monthly';
  };
  BarkingLayoutScreen: {
    zoneId: string;
    totalSpots: number;
    availableSpots: number;
    zoneData: string;
  };
  HomeScreen: undefined;
  PaymentScreen: {
    bookingId: string;
    totalPrice: number;
    currency: string;
    spotCode: string;
    zoneId: string;
  };
};

const { width } = Dimensions.get('window');

// Định nghĩa các interface
interface ParkingZone {
  id: number;
  name: string;
  totalSpots: number;
  availableSpots: number;
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

interface ZoneSlot {
  id: number;
  code: string;
  status?: string;
  position_x: number;
  position_y: number;
}

interface ZoneDetailsResponse {
  id: number;
  name: string;
  totalSpots: number;
  availableSpots: number;
  slots: ZoneSlot[];
  layout?: {
    layout_type: string;
    grid_rows: number;
    grid_cols: number;
    layout_data: any;
  };
}

interface PriceCalculationResponse {
  totalPrice: number;
  currency: string;
  priceId: number;
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

  // Lưu trữ dữ liệu người dùng vào AsyncStorage
  const saveUserInputToStorage = async () => {
    try {
      if (licensePlate) {
        await AsyncStorage.setItem('booking_license_plate', licensePlate);
      }
      if (isLicensePlateConfirmed) {
        await AsyncStorage.setItem('booking_license_plate_confirmed', 'true');
      }
      if (phoneNumber) {
        await AsyncStorage.setItem('booking_phone_number', phoneNumber);
      }
      if (isPhoneNumberConfirmed) {
        await AsyncStorage.setItem('booking_phone_number_confirmed', 'true');
      }
      console.log('Đã lưu dữ liệu người dùng vào AsyncStorage');
    } catch (error) {
      console.error('Lỗi khi lưu dữ liệu:', error);
    }
  };

  // Khôi phục dữ liệu người dùng từ AsyncStorage
  const loadUserInputFromStorage = async () => {
    try {
      const savedLicensePlate = await AsyncStorage.getItem('booking_license_plate');
      const savedLicensePlateConfirmed = await AsyncStorage.getItem('booking_license_plate_confirmed');
      const savedPhoneNumber = await AsyncStorage.getItem('booking_phone_number');
      const savedPhoneNumberConfirmed = await AsyncStorage.getItem('booking_phone_number_confirmed');
      
      if (savedLicensePlate) {
        setLicensePlate(savedLicensePlate);
      }
      if (savedLicensePlateConfirmed === 'true') {
        setIsLicensePlateConfirmed(true);
      }
      if (savedPhoneNumber) {
        setPhoneNumber(savedPhoneNumber);
      }
      if (savedPhoneNumberConfirmed === 'true') {
        setIsPhoneNumberConfirmed(true);
      }
      
      console.log('Đã khôi phục dữ liệu người dùng từ AsyncStorage');
    } catch (error) {
      console.error('Lỗi khi khôi phục dữ liệu:', error);
    }
  };

  // Gọi API khi component mount
  useEffect(() => {
    fetchParkingZones();
    loadUserInputFromStorage();
  }, []);

  // Lưu dữ liệu khi component unmount hoặc khi giá trị thay đổi
  useEffect(() => {
    return () => {
      saveUserInputToStorage();
    };
  }, [licensePlate, isLicensePlateConfirmed, phoneNumber, isPhoneNumberConfirmed]);

  // Lưu dữ liệu khi các giá trị xác nhận thay đổi
  useEffect(() => {
    if (isLicensePlateConfirmed || isPhoneNumberConfirmed) {
      saveUserInputToStorage();
    }
  }, [isLicensePlateConfirmed, isPhoneNumberConfirmed]);

  // Thêm hàm fetchParkingZones
  const fetchParkingZones = async () => {
    try {
      setLoading(true);
      console.log('Đang gọi API lấy danh sách khu vực đỗ xe');
      
      const response = await api.get<{ success: boolean; data: ParkingZone[] }>('/bookings/zones');
      console.log('Response from API:', response);
      
      if (response.success && Array.isArray(response.data)) {
        setParkingZones(response.data);
      } else {
        throw new Error('Không thể tải danh sách khu vực đỗ xe');
      }
    } catch (error: any) {
      console.error('Lỗi khi lấy danh sách khu vực:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách khu vực đỗ xe');
      // Use sample data as fallback
   
    } finally {
      setLoading(false);
    }
  };

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

  // Get parameters from route
  useEffect(() => {
    if (route.params) {
      const { 
        bookingDate, 
        startTime, 
        endTime, 
        duration, 
        selectedSpotId, 
        selectedZoneId,
        selectedSpotCode,
        action
      } = route.params;
      
      if (bookingDate) {
        setDailyBookingDate(bookingDate);
        // Auto-calculate price when time is selected
        updatePriceInfo();
      }
      
      if (startTime) {
        setDailyStartTime(startTime);
        // Auto-calculate price when time is selected 
        updatePriceInfo();
      }
      
      if (endTime) {
        setDailyEndTime(endTime);
        // Auto-calculate price when time is selected
        updatePriceInfo();
      }
      
      if (duration) setDailyDuration(duration);
      
      // Lưu thông tin thời gian vào AsyncStorage để khôi phục khi cần
      const saveBookingTimeInfo = async () => {
        try {
          if (bookingDate) await AsyncStorage.setItem('booking_date', bookingDate);
          if (startTime) await AsyncStorage.setItem('booking_start_time', startTime);
          if (endTime) await AsyncStorage.setItem('booking_end_time', endTime);
          if (duration) await AsyncStorage.setItem('booking_duration', duration);
        } catch (error) {
          console.error('Lỗi khi lưu thông tin thời gian:', error);
        }
      };
      
      saveBookingTimeInfo();
      
      // If coming back from spot selection with payment action
      if (selectedSpotId && selectedZoneId && action === 'proceed_to_payment') {
        console.log('Tiến hành thanh toán cho vị trí', selectedSpotCode, 'tại khu vực', selectedZoneId);
        
        // Kiểm tra xem đã có biển số xe và số điện thoại chưa
        if (!isLicensePlateConfirmed || !isPhoneNumberConfirmed) {
          Alert.alert('Thông báo', 'Vui lòng xác nhận biển số xe và số điện thoại trước khi tiến hành đặt chỗ');
          return;
        }
        
        // Kiểm tra đã có thông tin thời gian chưa
        if (dailyBookingDate === 'Chưa chọn' || dailyStartTime === 'Chưa chọn' || dailyEndTime === 'Chưa chọn') {
          Alert.alert('Thông báo', 'Vui lòng chọn ngày và giờ đặt chỗ');
          return;
        }
        
        // Nếu đã có đủ thông tin, tạo booking
        createBookingWithFixedPrice(selectedSpotId, selectedZoneId, selectedSpotCode);
      }
    }
  }, [route.params, isLicensePlateConfirmed, isPhoneNumberConfirmed]);

  // Load booking time info from AsyncStorage
  useEffect(() => {
    const loadBookingTimeInfo = async () => {
      try {
        const bookingDate = await AsyncStorage.getItem('booking_date');
        const startTime = await AsyncStorage.getItem('booking_start_time');
        const endTime = await AsyncStorage.getItem('booking_end_time');
        const duration = await AsyncStorage.getItem('booking_duration');
        
        if (bookingDate) setDailyBookingDate(bookingDate);
        if (startTime) setDailyStartTime(startTime);
        if (endTime) setDailyEndTime(endTime);
        if (duration) setDailyDuration(duration);
      } catch (error) {
        console.error('Lỗi khi khôi phục thông tin thời gian:', error);
      }
    };
    
    loadBookingTimeInfo();
  }, []);

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

  const handleLicensePlateConfirm = () => {
    setIsLicensePlateConfirmed(true);
    saveUserInputToStorage();
  };

  const handlePhoneNumberConfirm = () => {
    setIsPhoneNumberConfirmed(true);
    saveUserInputToStorage();
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
            onPress={handleLicensePlateConfirm}
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
            onPress={handlePhoneNumberConfirm}
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
      
      const response = await api.get(`/bookings/zones/${zoneId}`);
      console.log('Zone details response:', response);
      
      // Response từ axiosConfig đã được xử lý - trả về data trực tiếp
      if (response && response.success && response.data) {
        // Lấy dữ liệu từ response.data với type assertion
        const zoneDetails = response.data as ZoneDetailsResponse;
        
        if (!zoneDetails.slots || !Array.isArray(zoneDetails.slots)) {
          throw new Error('Dữ liệu vị trí đỗ xe không hợp lệ');
        }
        
        // Map the slots data to the expected format
        const mappedSlots = zoneDetails.slots.map((slot: ZoneSlot) => ({
          id: slot.id,
          code: slot.code,
          status: slot.status || 'available',
          position: {
            row: slot.position_x,
            col: slot.position_y
          }
        }));

        // Logging dữ liệu để debug
        console.log('Mapped slots:', mappedSlots);
        console.log('Total slots:', mappedSlots.length);
        console.log('Zone details - totalSpots:', zoneDetails.totalSpots);
        console.log('Zone details - availableSpots:', zoneDetails.availableSpots);

        // Đảm bảo tổng số chỗ đúng với số lượng slots từ API
        const actualTotalSpots = mappedSlots.length;
        const actualAvailableSpots = mappedSlots.filter(spot => spot.status === 'available').length;

        // Navigate to BarkingLayoutScreen with the mapped data
        navigation.navigate('BarkingLayoutScreen', { 
          zoneId: zoneId.toString(),
          totalSpots: actualTotalSpots,
          availableSpots: actualAvailableSpots,
          zoneData: JSON.stringify(mappedSlots)
        });
      } else {
        throw new Error('Không thể tải thông tin chi tiết khu vực');
      }
    } catch (error: any) {
      console.error(`Lỗi khi lấy chi tiết khu vực ${zoneId}:`, error);
      Alert.alert(
        'Lỗi',
        error.message || 'Không thể tải thông tin chi tiết khu vực. Vui lòng thử lại sau.'
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

  // Hàm tự động tính giá dựa trên API khi thời gian được chọn
  const updatePriceInfo = async () => {
    if (dailyBookingDate !== 'Chưa chọn' && dailyStartTime !== 'Chưa chọn' && dailyEndTime !== 'Chưa chọn') {
      try {
        setLoading(true);
        
        const startDateTime = `${dailyBookingDate} ${dailyStartTime}:00`;
        const endDateTime = `${dailyBookingDate} ${dailyEndTime}:00`;
        
        // Gọi API tính giá
        const params = {
          bookingType: activeTab,
          startTime: startDateTime,
          endTime: endDateTime
        };
        
        console.log('Gọi API tính giá với params:', params);
        
        try {
          // Thử gọi API tính giá
          const priceResponse = await api.post('/calculate-price', params);
          console.log('Price response from API:', priceResponse);
          
          if (priceResponse && priceResponse.success && priceResponse.data) {
            // Sử dụng type assertion để TypeScript hiểu cấu trúc của data
            const priceData = priceResponse.data as unknown as PriceCalculationResponse;
            
            setPriceInfo({
              price: priceData.totalPrice,
              currency: priceData.currency || 'VND',
              priceDetails: {
                basePrice: priceData.totalPrice
              }
            });
            
            console.log('Giá từ API:', priceData.totalPrice, priceData.currency || 'VND');
          } else {
            // Nếu API không trả về đúng định dạng, tính giá mặc định
            calculateDefaultPrice(startDateTime, endDateTime);
          }
        } catch (error) {
          console.error('Lỗi khi gọi API tính giá:', error);
          // Nếu API lỗi, tính giá mặc định
          calculateDefaultPrice(startDateTime, endDateTime);
        }
      } catch (error) {
        console.error('Lỗi khi tính giá:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  // Hàm tính giá mặc định dựa trên thời gian (fallback khi API lỗi)
  const calculateDefaultPrice = (startTimeStr: string, endTimeStr: string) => {
    try {
      const startTime = new Date(startTimeStr);
      const endTime = new Date(endTimeStr);
      
      // Tính số giờ
      const durationInHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      
      // Tính giá: 20,000 VND mỗi giờ
      const hourlyRate = 20000;
      const totalPrice = Math.max(hourlyRate, Math.ceil(durationInHours) * hourlyRate);
      
      setPriceInfo({
        price: totalPrice,
        currency: 'VND',
        priceDetails: {
          basePrice: totalPrice
        }
      });
      
      console.log('Tính giá mặc định:', totalPrice, 'VND cho', Math.ceil(durationInHours), 'giờ');
    } catch (error) {
      console.error('Lỗi khi tính giá mặc định:', error);
    }
  };

  // Hàm tạo booking với API
  const createBookingWithFixedPrice = async (slotId: number, zoneId: string, spotCode?: string) => {
    if (!isLicensePlateConfirmed || !isPhoneNumberConfirmed) {
      Alert.alert('Thông báo', 'Vui lòng xác nhận biển số xe và số điện thoại');
      return;
    }

    if (!dailyBookingDate || dailyStartTime === 'Chưa chọn' || dailyEndTime === 'Chưa chọn') {
      Alert.alert('Thông báo', 'Vui lòng chọn đầy đủ thời gian đặt chỗ');
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
      
      let priceId = 1; // ID giá mặc định
      let price = priceInfo ? priceInfo.price : 50000; // Giá mặc định
      
      // Nếu chưa có thông tin giá, gọi API tính giá
      if (!priceInfo) {
        try {
          // Gọi API tính giá
          const params = {
            bookingType: activeTab,
            startTime: startDateTime,
            endTime: endDateTime
          };
          
          console.log('Gọi API tính giá trước khi đặt chỗ:', params);
          
          const priceResponse = await api.post('/calculate-price', params);
          console.log('Price response before booking:', priceResponse);
          
          if (priceResponse && priceResponse.success && priceResponse.data) {
            const priceData = priceResponse.data as unknown as PriceCalculationResponse;
            priceId = priceData.priceId || 1;
            price = priceData.totalPrice || 50000;
            
            setPriceInfo({
              price: priceData.totalPrice,
              currency: priceData.currency || 'VND',
              priceDetails: {
                basePrice: priceData.totalPrice
              }
            });
          }
        } catch (error) {
          console.error('Lỗi khi tính giá trước khi đặt chỗ:', error);
          // Tiếp tục với giá mặc định
        }
      }
      
      // Tạo dữ liệu booking
      const bookingData = {
        userId,
        slotId,
        priceId,
        bookingType: activeTab,
        startTime: startDateTime,
        endTime: endDateTime,
        licensePlate,
        phoneNumber,
        vehicleType: 'sedan' // Default vehicle type
      };
      
      console.log('Dữ liệu booking:', bookingData);
      
      // Gọi API tạo booking hoặc tạo booking giả lập
      let bookingId, totalPrice, currency;
      
      try {
        // Thử gọi API tạo booking
        const response = await api.post('/bookings', bookingData);
        console.log('Booking response from API:', response);
        
        if (response && response.success && response.data) {
          const bookingData = response.data as unknown as BookingResponse;
          bookingId = bookingData.bookingId;
          totalPrice = bookingData.totalPrice;
          currency = bookingData.currency;
        }
      } catch (error) {
        console.log('Không thể tạo booking qua API, sử dụng dữ liệu mẫu');
        console.error('Booking error:', error);
      }
      
      // Nếu API không hoạt động, sử dụng dữ liệu mẫu
      if (!bookingId) {
        bookingId = `BK${Math.floor(Math.random() * 1000000)}`;
        totalPrice = price;
        currency = 'VND';
      }
      
      // Xóa dữ liệu đã lưu sau khi đặt chỗ thành công
      await AsyncStorage.removeItem('booking_license_plate');
      await AsyncStorage.removeItem('booking_license_plate_confirmed');
      await AsyncStorage.removeItem('booking_phone_number');
      await AsyncStorage.removeItem('booking_phone_number_confirmed');
      await AsyncStorage.removeItem('booking_date');
      await AsyncStorage.removeItem('booking_start_time');
      await AsyncStorage.removeItem('booking_end_time');
      await AsyncStorage.removeItem('booking_duration');
      
      // Reset state
      setLicensePlate('');
      setPhoneNumber('');
      setIsLicensePlateConfirmed(false);
      setIsPhoneNumberConfirmed(false);
      setPriceInfo(null);
      setDailyBookingDate('Chưa chọn');
      setDailyStartTime('Chưa chọn');
      setDailyEndTime('Chưa chọn');
      
      // Chuyển sang màn hình thanh toán trực tiếp
      try {
        navigation.navigate('PaymentScreen', {
          bookingId: bookingId || `BK${Math.floor(Math.random() * 1000000)}`,
          totalPrice: totalPrice || price,
          currency: currency || 'VND',
          spotCode: spotCode || 'A01',
          zoneId: zoneId || '1'
        });
      } catch (error) {
        // Hiển thị thông báo thành công nếu không có màn hình thanh toán
        Alert.alert(
          'Đặt chỗ thành công',
          `Bạn đã đặt chỗ thành công! Mã đặt chỗ: ${bookingId || `BK${Math.floor(Math.random() * 1000000)}`}`,
          [
            { 
              text: 'OK', 
              onPress: () => {
                navigation.navigate('HomeScreen');
              }
            }
          ]
        );
      }
    } catch (error: any) {
      console.error('Lỗi khi tạo booking:', error);
      Alert.alert('Lỗi', error.message || 'Không thể đặt chỗ. Vui lòng thử lại sau.');
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