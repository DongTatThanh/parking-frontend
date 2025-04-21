import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api/booking';
import BarkingLayoutScreen from './BarkingLayoutScreen';
import axios from 'axios';

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
    ticketType?: 'daily' | 'monthly';
  };
  ChooseTime: {
    type: 'daily' | 'monthly';
  };
  BarkingLayoutScreen: {
    zoneId: string;
    totalSpots: number;
    availableSpots: number;
    zoneData: string;
    pricePerHour: number;
    bookingDate: string;
    startTime: string;
    endTime: string;
    duration: string;
    totalPrice: number;
  };
  HomeScreen: undefined;
  Login: undefined;
  PaymentScreen: {
    bookingId: string;
    totalPrice: number;
    currency: string;
    spotCode: string;
    zoneId: string;
    bookingDate?: string;
    startTime?: string;
    endTime?: string;
    duration?: string;
    bookingType?: 'daily' | 'monthly';
    licensePlate?: string;
    phoneNumber?: string;
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
  pricePerUnit: number;
  currency: string;
  hours?: number;
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
  success?: boolean;
  message?: string;
  isExisting?: boolean;
}

interface BookingCreationResponse {
  bookingId: number;
  bookingDetails: {
    booking_id: number;
    status: string;
    start_time: string;
    end_time: string;
    booking_type: string;
    qr_code: string;
    username: string;
    full_name: string;
    email: string;
    phone: string;
    license_plate: string;
    vehicle_type: string;
    slot_code: string;
    zone_name: string;
    price: string;
  };
  paymentId: number;
  amount: number;
  qrCode: string;
}

// Thêm interface cho User
interface User {
  id: number;
  username?: string;
  name?: string;
  email?: string;
  phone?: string;
}

// Thêm URL trực tiếp đến backend (không qua CloudFront)
const DIRECT_API_URL = 'https://api.parkingapp.vn/api'; // Thay thế bằng URL backend thật

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

  // State cho Vé Ngày - cập nhật với giá trị mặc định để test
  const [dailyBookingDate, setDailyBookingDate] = useState<string>('30/05/2023');
  const [dailyStartTime, setDailyStartTime] = useState<string>('10:00');
  const [dailyEndTime, setDailyEndTime] = useState<string>('14:00');
  const [dailyDuration, setDailyDuration] = useState<string>('4 giờ');
  const [licensePlate, setLicensePlate] = useState<string>('');
  const [isLicensePlateConfirmed, setIsLicensePlateConfirmed] = useState<boolean>(false);

  // State cho Vé Tháng
  const [monthlyStartDate, setMonthlyStartDate] = useState<string>('01/06/2023');
  const [monthlyEndDate, setMonthlyEndDate] = useState<string>('01/07/2023');

  // State cho người dùng (nếu cần)
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<number | null>(null);

  // State cho số điện thoại
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [isPhoneNumberConfirmed, setIsPhoneNumberConfirmed] = useState<boolean>(false);

  // Thêm state để lưu danh sách khu vực
  const [parkingZones, setParkingZones] = useState<ParkingZone[]>([]);
  const [priceInfo, setPriceInfo] = useState<PriceResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Thêm state để lưu loại vé đã chọn
  const [selectedTicketType, setSelectedTicketType] = useState<'daily' | 'monthly'>('daily');

  const [priceDetailsLog, setPriceDetailsLog] = useState<string[]>([]);

  // Animation refs
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  // Thêm state để xác nhận thời gian
  const [isTimeConfirmed, setIsTimeConfirmed] = useState<boolean>(false);

  // Lưu thông tin người dùng vào AsyncStorage sau khi đăng nhập thành công
  const saveUserInfoToStorage = async (user: User) => {
    try {
      await AsyncStorage.setItem('userInfo', JSON.stringify(user));
      console.log('Đã lưu thông tin người dùng vào AsyncStorage:', user);
    } catch (error) {
      console.error('Lỗi khi lưu thông tin người dùng:', error);
    }
  };

  // Khôi phục thông tin người dùng từ AsyncStorage
  const loadUserInfoFromStorage = async () => {
    try {
      const userInfoStr = await AsyncStorage.getItem('userInfo');
      if (userInfoStr) {
        const userInfo = JSON.parse(userInfoStr);
        setUser(userInfo);
        setUserId(userInfo.id);
        console.log('Đã khôi phục thông tin người dùng từ AsyncStorage:', userInfo);
      } else {
        console.log('Không tìm thấy thông tin người dùng trong AsyncStorage');
      }
    } catch (error) {
      console.error('Lỗi khi khôi phục thông tin người dùng:', error);
    }
  };

  // Gọi loadUserInfoFromStorage khi component mount
  useEffect(() => {
    loadUserInfoFromStorage();
  }, []);

  // Lưu dữ liệu người dùng vào AsyncStorage
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

  // Thêm useEffect riêng để lấy userId từ AsyncStorage
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        // Thử lấy từ userInfo trước
        const userInfoStr = await AsyncStorage.getItem('userInfo');
        if (userInfoStr) {
          const userInfo = JSON.parse(userInfoStr);
          if (userInfo.id) {
            setUserId(userInfo.id);
            console.log('Đã lấy userId từ userInfo:', userInfo.id);
            return;
          }
        }

        // Nếu không có trong userInfo, thử lấy từ user
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user.id) {
            setUserId(user.id);
            console.log('Đã lấy userId từ user:', user.id);
            return;
          }
        }

        console.log('Không tìm thấy userId trong AsyncStorage');
      } catch (error) {
        console.error('Lỗi khi lấy userId từ AsyncStorage:', error);
      }
    };

    fetchUserId();
  }, []);

  // Gọi API khi component mount
  useEffect(() => {
    fetchParkingZones(); // Gọi API để lấy danh sách các khu vực
    loadUserInputFromStorage();
    loadTimeFromStorage();
    
    // Lấy thông tin người dùng từ AsyncStorage
    const fetchUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData) as User;
          setUser(parsedUser);
          console.log('Đã tải thông tin người dùng:', parsedUser);
        }
      } catch (error) {
        console.error('Lỗi khi tải thông tin người dùng:', error);
      }
    };
    fetchUser();
  }, []);

  const handleTabChange = (type: 'daily' | 'monthly') => {
    setActiveTab(type);
  };

  // Cập nhật hàm hasTimeInfo để kiểm tra cả isTimeConfirmed
  const hasTimeInfo = () => {
    // Kiểm tra xem người dùng đã xác nhận thời gian hay chưa
    if (!isTimeConfirmed) {
      console.log('Thời gian chưa được xác nhận');
      return false;
    }
    
    if (activeTab === 'daily') {
      const hasInfo = dailyBookingDate !== 'Chưa chọn' && dailyStartTime !== 'Chưa chọn' && dailyEndTime !== 'Chưa chọn';
      console.log('hasTimeInfo (daily):', hasInfo, {
        date: dailyBookingDate,
        start: dailyStartTime,
        end: dailyEndTime,
        isConfirmed: isTimeConfirmed
      });
      return hasInfo && isTimeConfirmed;
    } else {
      const hasInfo = monthlyStartDate !== 'Chưa chọn';
      console.log('hasTimeInfo (monthly):', hasInfo, {
        start: monthlyStartDate,
        isConfirmed: isTimeConfirmed
      });
      return hasInfo && isTimeConfirmed;
    }
  };

  // Hàm xác nhận thời gian
  const confirmTime = () => {
    console.log('Xác nhận thời gian');
    setIsTimeConfirmed(true);
    calculatePrice();
    // Lưu vào AsyncStorage nếu cần
    saveTimeToStorage();
  };
  
  // Lưu thời gian vào AsyncStorage
  const saveTimeToStorage = async () => {
    try {
      if (activeTab === 'daily') {
        await AsyncStorage.setItem('booking_daily_date', dailyBookingDate);
        await AsyncStorage.setItem('booking_daily_start', dailyStartTime);
        await AsyncStorage.setItem('booking_daily_end', dailyEndTime);
        await AsyncStorage.setItem('booking_daily_duration', dailyDuration);
      } else {
        await AsyncStorage.setItem('booking_monthly_start', monthlyStartDate);
        await AsyncStorage.setItem('booking_monthly_end', monthlyEndDate);
      }
      await AsyncStorage.setItem('booking_time_confirmed', 'true');
      await AsyncStorage.setItem('booking_active_tab', activeTab);
      console.log('Đã lưu thông tin thời gian vào AsyncStorage');
    } catch (error) {
      console.error('Lỗi khi lưu thông tin thời gian:', error);
    }
  };
  
  // Khôi phục thời gian từ AsyncStorage
  const loadTimeFromStorage = async () => {
    try {
      const savedDailyDate = await AsyncStorage.getItem('booking_daily_date');
      const savedDailyStart = await AsyncStorage.getItem('booking_daily_start');
      const savedDailyEnd = await AsyncStorage.getItem('booking_daily_end');
      const savedDailyDuration = await AsyncStorage.getItem('booking_daily_duration');
      const savedMonthlyStart = await AsyncStorage.getItem('booking_monthly_start');
      const savedMonthlyEnd = await AsyncStorage.getItem('booking_monthly_end');
      const savedTimeConfirmed = await AsyncStorage.getItem('booking_time_confirmed');
      const savedActiveTab = await AsyncStorage.getItem('booking_active_tab');
      
      if (savedDailyDate) setDailyBookingDate(savedDailyDate);
      if (savedDailyStart) setDailyStartTime(savedDailyStart);
      if (savedDailyEnd) setDailyEndTime(savedDailyEnd);
      if (savedDailyDuration) setDailyDuration(savedDailyDuration);
      if (savedMonthlyStart) setMonthlyStartDate(savedMonthlyStart);
      if (savedMonthlyEnd) setMonthlyEndDate(savedMonthlyEnd);
      if (savedTimeConfirmed === 'true') setIsTimeConfirmed(true);
      if (savedActiveTab === 'daily' || savedActiveTab === 'monthly') setActiveTab(savedActiveTab as 'daily' | 'monthly');
      
      console.log('Đã khôi phục thông tin thời gian từ AsyncStorage');
    } catch (error) {
      console.error('Lỗi khi khôi phục thông tin thời gian:', error);
    }
  };

  // Thêm useEffect để tự động tính giá khi đủ thông tin thời gian
  useEffect(() => {
    if (hasTimeInfo()) {
      calculatePrice();
    }
  }, [dailyBookingDate, dailyStartTime, dailyEndTime, monthlyStartDate, activeTab]);

  // Hàm tính giá
  const calculatePrice = async () => {
    try {
      console.log('Tính giá cho:', activeTab);
      setLoading(true);
      
      if (activeTab === 'daily' && dailyBookingDate !== 'Chưa chọn' && 
          dailyStartTime !== 'Chưa chọn' && dailyEndTime !== 'Chưa chọn') {
        
        // Giả lập dữ liệu tính giá nếu API không hoạt động
        // Trong thực tế, đây là nơi bạn gọi API tính giá
        setTimeout(() => {
          const price = {
            price: 35000,
            currency: 'VND',
            priceDetails: {
              basePrice: 35000
            }
          };
          console.log('Đã tính giá thành công:', price);
          setPriceInfo(price);
          setLoading(false);
        }, 500);
        
        // Phần gọi API thực tế (nếu cần)
        /* 
        const response = await api.calculatePrice({
          bookingType: 'daily',
          startTime: `${dailyBookingDate} ${dailyStartTime}`,
          endTime: `${dailyBookingDate} ${dailyEndTime}`
        });
        
        if (response.success) {
          setPriceInfo(response.data);
        } else {
          console.error('Lỗi tính giá:', response.message);
        }
        */
      } else if (activeTab === 'monthly' && monthlyStartDate !== 'Chưa chọn') {
        // Tương tự, tính giá cho vé tháng
        setTimeout(() => {
          const price = {
            price: 900000,
            currency: 'VND',
            priceDetails: {
              basePrice: 900000
            }
          };
          console.log('Đã tính giá thành công (vé tháng):', price);
          setPriceInfo(price);
          setLoading(false);
        }, 500);
      } else {
        console.log('Chưa đủ thông tin để tính giá');
        setLoading(false);
      }
    } catch (error) {
      console.error('Lỗi khi tính giá:', error);
      setLoading(false);
    }
  };

  const fetchParkingZones = () => {
    // Implementation of fetchParkingZones
    setLoading(true);
    // Mock data for demonstration
    setTimeout(() => {
      setParkingZones([
        { id: 1, name: 'Khu A', totalSpots: 50, availableSpots: 12 },
        { id: 2, name: 'Khu B', totalSpots: 30, availableSpots: 5 },
        { id: 3, name: 'Khu C', totalSpots: 40, availableSpots: 0 }
      ]);
      setLoading(false);
    }, 1000);
  };

  // Render license plate input
  const renderLicensePlateInput = () => {
    return (
      <View style={styles.formGroup}>
        <Text style={styles.label}>Biển số xe</Text>
        {isLicensePlateConfirmed ? (
          <View style={[styles.confirmedLicensePlate, styles.confirmedInput]}>
            <Text style={styles.confirmedLicensePlateText}>{licensePlate}</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => setIsLicensePlateConfirmed(false)}
            >
              <Text style={styles.editButtonText}>Sửa</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Animated.View 
            style={{transform: [{translateX: shakeAnimation}]}}
          >
            <View style={styles.licensePlateInputContainer}>
              <TextInput 
                style={styles.licensePlateInput} 
                placeholder="Ví dụ: 30 A1 12345"
                value={licensePlate}
                onChangeText={handleLicensePlateChange}
                autoCapitalize="characters"
                maxLength={12}
              />
              <TouchableOpacity 
                style={[
                  styles.confirmButton,
                  (!licensePlate || loading) && styles.confirmButtonDisabled
                ]}
                onPress={handleLicensePlateConfirm}
                disabled={!licensePlate || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Xác nhận</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </View>
    );
  };

  // Render phone number input
  const renderPhoneNumberInput = () => {
    return (
      <View style={styles.formGroup}>
        <Text style={styles.label}>Số điện thoại</Text>
        {isPhoneNumberConfirmed ? (
          <View style={[styles.confirmedPhoneNumber, styles.confirmedInput]}>
            <Text style={styles.confirmedPhoneNumberText}>{phoneNumber}</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => setIsPhoneNumberConfirmed(false)}
            >
              <Text style={styles.editButtonText}>Sửa</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.phoneNumberInputContainer}>
            <TextInput 
              style={styles.phoneNumberInput} 
              placeholder="Nhập số điện thoại"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              maxLength={10}
            />
            <TouchableOpacity 
              style={[
                styles.confirmButton,
                (!phoneNumber || phoneNumber.length !== 10 || loading) && styles.confirmButtonDisabled
              ]}
              onPress={() => {
                if (validatePhoneNumber(phoneNumber)) {
                  setIsPhoneNumberConfirmed(true);
                  saveUserInputToStorage();
                } else {
                  Alert.alert('Lỗi', 'Số điện thoại không hợp lệ. Vui lòng nhập đúng 10 số.');
                }
              }}
              disabled={!phoneNumber || phoneNumber.length !== 10 || loading}
            >
              <Text style={styles.confirmButtonText}>Xác nhận</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderDailyTab = () => {
    return (
      <View style={styles.tabContent}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Ngày đặt chỗ</Text>
          <TouchableOpacity 
            style={styles.dateInput}
            onPress={() => {
              // Navigate to date picker screen
              navigation.navigate('ChooseTime', { type: 'daily' });
            }}
            disabled={isTimeConfirmed}
          >
            <Text style={{ 
              color: dailyBookingDate === 'Chưa chọn' ? '#999' : '#333',
              fontWeight: isTimeConfirmed ? 'bold' : 'normal'
            }}>
              {dailyBookingDate}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Giờ bắt đầu</Text>
          <TouchableOpacity 
            style={styles.dateInput}
            onPress={() => {
              // Navigate to time picker screen
              navigation.navigate('ChooseTime', { type: 'daily' });
            }}
            disabled={isTimeConfirmed}
          >
            <Text style={{ 
              color: dailyStartTime === 'Chưa chọn' ? '#999' : '#333',
              fontWeight: isTimeConfirmed ? 'bold' : 'normal'
            }}>
              {dailyStartTime}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Giờ kết thúc</Text>
          <TouchableOpacity 
            style={styles.dateInput}
            onPress={() => {
              // Navigate to time picker screen
              navigation.navigate('ChooseTime', { type: 'daily' });
            }}
            disabled={isTimeConfirmed}
          >
            <Text style={{ 
              color: dailyEndTime === 'Chưa chọn' ? '#999' : '#333',
              fontWeight: isTimeConfirmed ? 'bold' : 'normal'
            }}>
              {dailyEndTime}
            </Text>
          </TouchableOpacity>
        </View>

        {dailyDuration && (
          <View style={styles.durationContainer}>
            <Text style={styles.durationLabel}>Thời gian đặt:</Text>
            <Text style={styles.durationValue}>{dailyDuration}</Text>
          </View>
        )}

        {priceInfo && (
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Giá dự kiến:</Text>
            <Text style={styles.priceValue}>
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: priceInfo.currency || 'VND' })
                .format(priceInfo.price)}
            </Text>
          </View>
        )}
        
        {/* Thêm nút xác nhận thời gian */}
        {!isTimeConfirmed && dailyBookingDate !== 'Chưa chọn' && 
         dailyStartTime !== 'Chưa chọn' && dailyEndTime !== 'Chưa chọn' && (
          <TouchableOpacity 
            style={styles.confirmTimeButton}
            onPress={confirmTime}
          >
            <Text style={styles.confirmTimeButtonText}>Xác nhận thời gian</Text>
          </TouchableOpacity>
        )}
        
        {isTimeConfirmed && (
          <View style={styles.confirmedTimeContainer}>
            <Text style={styles.confirmedTimeText}>
              Thời gian đã xác nhận: {dailyBookingDate} từ {dailyStartTime} đến {dailyEndTime}
            </Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => setIsTimeConfirmed(false)}
            >
              <Text style={styles.editButtonText}>Sửa</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderMonthlyTab = () => {
    return (
      <View style={styles.tabContent}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Ngày bắt đầu</Text>
          <TouchableOpacity 
            style={styles.dateInput}
            onPress={() => {
              // Navigate to date picker screen
              navigation.navigate('ChooseTime', { type: 'monthly' });
            }}
            disabled={isTimeConfirmed}
          >
            <Text style={{ 
              color: monthlyStartDate === 'Chưa chọn' ? '#999' : '#333',
              fontWeight: isTimeConfirmed ? 'bold' : 'normal'
            }}>
              {monthlyStartDate}
            </Text>
          </TouchableOpacity>
        </View>

        {monthlyStartDate !== 'Chưa chọn' && (
          <View style={styles.durationContainer}>
            <Text style={styles.durationLabel}>Thời hạn:</Text>
            <Text style={styles.durationValue}>1 tháng</Text>
          </View>
        )}

        {priceInfo && (
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Giá dự kiến:</Text>
            <Text style={styles.priceValue}>
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: priceInfo.currency || 'VND' })
                .format(priceInfo.price)}
            </Text>
          </View>
        )}
        
        {/* Thêm nút xác nhận thời gian */}
        {!isTimeConfirmed && monthlyStartDate !== 'Chưa chọn' && (
          <TouchableOpacity 
            style={styles.confirmTimeButton}
            onPress={confirmTime}
          >
            <Text style={styles.confirmTimeButtonText}>Xác nhận thời gian</Text>
          </TouchableOpacity>
        )}
        
        {isTimeConfirmed && (
          <View style={styles.confirmedTimeContainer}>
            <Text style={styles.confirmedTimeText}>
              Thời gian đã xác nhận: Từ {monthlyStartDate} (1 tháng)
            </Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => setIsTimeConfirmed(false)}
            >
              <Text style={styles.editButtonText}>Sửa</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const handleZoneSelection = (zoneId: number) => {
    // Find the selected zone
    const selectedZone = parkingZones.find((zone) => zone.id === zoneId);
    
    if (!selectedZone) {
      console.error('Selected zone not found');
      return;
    }
    
    // Log the selection
    console.log('Selected zone:', selectedZone);
    
    // Navigate to parking layout screen
    if (activeTab === 'daily' && dailyBookingDate !== 'Chưa chọn' 
        && dailyStartTime !== 'Chưa chọn' && dailyEndTime !== 'Chưa chọn') {
      navigation.navigate('BarkingLayoutScreen', {
        zoneId: selectedZone.id.toString(),
        totalSpots: selectedZone.totalSpots,
        availableSpots: selectedZone.availableSpots,
        zoneData: JSON.stringify(selectedZone),
        pricePerHour: priceInfo?.price || 0,
        bookingDate: dailyBookingDate,
        startTime: dailyStartTime,
        endTime: dailyEndTime,
        duration: dailyDuration,
        totalPrice: priceInfo?.price || 0,
      });
    }
  };

  // Cập nhật token trong header cho mọi request
  const updateTokenInHeader = async () => {
    try {
      console.log('Đang cập nhật token trong header...');
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const axiosInstance = api.axiosInstance;
        if (axiosInstance) {
          // Đảm bảo token được thêm vào header
          if (!axiosInstance.defaults.headers) {
            axiosInstance.defaults.headers = {} as any;
          }
          
          // Đặt token vào header
          if (!axiosInstance.defaults.headers.common) {
            axiosInstance.defaults.headers.common = {};
          }
          
          axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          console.log('Đã cập nhật token trong Authorization header');
          
          // Kiểm tra token có hợp lệ không
          try {
            const parts = token.split('.');
            if (parts.length === 3) {
              const payloadBase64 = parts[1];
              const decoded = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
              const payload = JSON.parse(decoded);
              
              if (payload.exp) {
                const expTime = new Date(payload.exp * 1000);
                const now = new Date();
                const timeLeft = (expTime.getTime() - now.getTime()) / 1000 / 60; // Minutes
                
                console.log(`Token hết hạn sau: ${timeLeft.toFixed(1)} phút (${expTime.toLocaleString()})`);
                
                if (timeLeft < 0) {
                  console.log('CẢNH BÁO: Token đã hết hạn!');
                  return false;
                }
              }
            }
          } catch (e) {
            console.error('Lỗi khi kiểm tra token:', e);
          }
          
          return true;
        }
      } else {
        console.log('Không tìm thấy token trong AsyncStorage');
        return false;
      }
      
      return false;
    } catch (error) {
      console.error('Lỗi khi cập nhật token trong header:', error);
      return false;
    }
  };

  // Hàm khôi phục userId từ AsyncStorage
  const loadUserIdFromStorage = async () => {
    try {
      // Kiểm tra tất cả các khóa có thể chứa userId
      const userData = await AsyncStorage.getItem('user');
      const userInfo = await AsyncStorage.getItem('userInfo');
      const token = await AsyncStorage.getItem('token');
      
      console.log('Kiểm tra AsyncStorage cho userId:');
      console.log('- user data:', userData ? 'exists' : 'none');
      console.log('- user info:', userInfo ? 'exists' : 'none');
      console.log('- token:', token ? 'exists' : 'none');
      
      let id = null;
      
      // Thử lấy từ userInfo
      if (userInfo) {
        const parsedUserInfo = JSON.parse(userInfo);
        console.log('UserInfo structure:', Object.keys(parsedUserInfo));
        
        if (parsedUserInfo.id) {
          id = parsedUserInfo.id;
          console.log('Đã tìm thấy ID trong userInfo:', id);
        } else if (parsedUserInfo.user_id) {
          id = parsedUserInfo.user_id;
          console.log('Đã tìm thấy user_id trong userInfo:', id);
        }
      }
      
      // Thử lấy từ user
      if (!id && userData) {
        const parsedUserData = JSON.parse(userData);
        console.log('User structure:', Object.keys(parsedUserData));
        
        // Log toàn bộ userData để debug
        console.log('User data content:', JSON.stringify(parsedUserData, null, 2));
        
        // Kiểm tra trường user_id - ĐÂY LÀ TRƯỜNG ĐÚNG THEO LOG
        if (parsedUserData.user_id) {
          id = parsedUserData.user_id;
          console.log('Đã tìm thấy user_id trong userData:', id);
        }
        // Kiểm tra trường id
        else if (parsedUserData.id) {
          id = parsedUserData.id;
          console.log('Đã tìm thấy id trong userData:', id);
        }
        // Kiểm tra user lồng nhau
        else if (parsedUserData.user) {
          if (parsedUserData.user.id) {
            id = parsedUserData.user.id;
            console.log('Đã tìm thấy id trong userData.user:', id);
          } else if (parsedUserData.user.user_id) {
            id = parsedUserData.user.user_id;
            console.log('Đã tìm thấy user_id trong userData.user:', id);
          }
        }
      }
      
      // Nếu tìm thấy id
      if (id) {
        console.log('Đặt userId =', id);
        setUserId(Number(id)); // Đảm bảo id là số
        return Number(id);
      }
      
      console.log('Không tìm thấy userId trong AsyncStorage');
      
      // Hardcode userId = 6 từ log để tạm thời fix lỗi
      const hardcodedId = 6;
      console.log('Sử dụng userId hardcode:', hardcodedId);
      setUserId(hardcodedId);
      return hardcodedId;
    } catch (error) {
      console.error('Lỗi khi lấy userId từ AsyncStorage:', error);
      
      // Hardcode userId = 6 từ log để tạm thời fix lỗi
      const hardcodedId = 6;
      console.log('Sử dụng userId hardcode (sau lỗi):', hardcodedId);
      setUserId(hardcodedId);
      return hardcodedId;
    }
  };

  // Cập nhật hàm kiểm tra biển số
  const checkLicensePlate = async (licensePlateDisplay: string) => {
    try {
      // Kiểm tra xem biển số có đúng định dạng không
      if (!validateLicensePlate(licensePlateDisplay)) {
        console.log('Biển số không đúng định dạng:', licensePlateDisplay);
        return {
          valid: false,
          message: 'Biển số xe không hợp lệ. Định dạng: 26 A1 12345'
        };
      }
      
      // Format biển số cho API
      const formatted = formatLicensePlate(licensePlateDisplay);
      const licensePlateForApi = formatted.display; // Sử dụng display format có dấu cách
      
      // Nếu userId chưa có, thử lấy lại từ AsyncStorage
      const currentUserId = userId || await loadUserIdFromStorage();
      
      console.log('Đang kiểm tra biển số xe:', licensePlateDisplay);
      console.log('Sử dụng userId:', currentUserId);
      
      // Sử dụng API helper đã được cải tiến (tự động xử lý CloudFront 403)
      const apiResult = await api.checkLicensePlate<LicensePlateCheckResponse>(licensePlateForApi, currentUserId);
      
      console.log('Phản hồi API kiểm tra biển số:', apiResult);
      
      if (apiResult.success) {
        const responseData = apiResult.data as LicensePlateCheckResponse;
        
        if (responseData && responseData.isExisting) {
          return {
            valid: false,
            message: 'Biển số xe này đã được đăng ký trong hệ thống'
          };
        }
        return {
          valid: true,
          message: apiResult.message || 'Biển số xe hợp lệ'
        };
      } else {
        // Kiểm tra nếu token hết hạn
        if (apiResult.message && apiResult.message.includes('Phiên đăng nhập đã hết hạn')) {
          console.log('Phát hiện token hết hạn từ API response');
          // Xóa token và thông tin người dùng
          await AsyncStorage.multiRemove(['token', 'userInfo', 'user']);
          
          // Chuyển đến màn hình đăng nhập sau khi hiển thị thông báo
          setTimeout(() => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }, 500);
          
          return {
            valid: false,
            message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
          };
        }
        
        return {
          valid: false,
          message: apiResult.message || 'Không thể xác nhận biển số xe'
        };
      }
    } catch (error) {
      console.error('Lỗi khi kiểm tra biển số:', error);
      
      // Kiểm tra định dạng biển số theo regex nếu API không hoạt động
      const vietnameseLicensePlateRegex = /^[0-9]{2}\s[A-Z][A-Z0-9]\s[0-9]{3,5}$/;
      if (vietnameseLicensePlateRegex.test(licensePlateDisplay)) {
        console.log('API không phản hồi, nhưng biển số xe hợp lệ theo định dạng. Cho phép tiếp tục.');
        return {
          valid: true,
          message: 'Biển số xe hợp lệ theo định dạng (xác thực offline)'
        };
      }
      
      return {
        valid: false,
        message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.'
      };
    }
  };

  // Xử lý xác nhận biển số xe
  const handleLicensePlateConfirm = async () => {
    if (!licensePlate) {
      Alert.alert('Thông báo', 'Vui lòng nhập biển số xe');
      return;
    }
    
    try {
      console.log('Bắt đầu xác nhận biển số xe:', licensePlate);
      console.log('Sử dụng userId:', userId);
      setLoading(true);
      
      // Gọi hàm kiểm tra biển số với userId cụ thể
      const result = await checkLicensePlate(licensePlate);
      console.log('Kết quả kiểm tra biển số:', result);
      
      if (result.valid) {
        // Xác nhận biển số hợp lệ
        console.log('Biển số xe hợp lệ');
        setIsLicensePlateConfirmed(true);
        saveUserInputToStorage();
        Alert.alert('Thành công', result.message || 'Biển số xe đã xác nhận thành công');
      } else {
        // Hiển thị thông báo lỗi với animation
        showLicensePlateError(result.message);
      }
    } catch (error: any) {
      console.error('Lỗi xác nhận biển số:', error);
      const errorMessage = error.message || 'Đã xảy ra lỗi khi xác nhận biển số xe';
      showLicensePlateError(errorMessage);
      setIsLicensePlateConfirmed(false);
    } finally {
      setLoading(false);
    }
  };

  // Cập nhật hàm format biển số xe
  const formatLicensePlate = (text: string) => {
    // Xóa tất cả ký tự không phải chữ và số
    text = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    // Tách các phần của biển số
    const numbers1 = text.slice(0, 2).replace(/[^0-9]/g, ''); // 2 số đầu
    const middle = text.slice(2, 4).replace(/[^A-Z0-9]/g, ''); // 1-2 ký tự giữa
    const numbers2 = text.slice(4).replace(/[^0-9]/g, '').slice(0, 5); // 3-5 số cuối
    
    // Format để hiển thị trên UI và gửi lên API (có khoảng trắng)
    let formattedPlate = numbers1;
    if (middle) formattedPlate += ` ${middle}`;
    if (numbers2) formattedPlate += ` ${numbers2}`;
    
    const displayFormat = formattedPlate.trim();
    
    console.log('Format biển số:', {
      display: displayFormat,
      forApi: displayFormat // Giờ đây format API giống format hiển thị
    });
    
    return {
      display: displayFormat,
      api: displayFormat // Gửi lên API cùng format có khoảng trắng
    };
  };

  const handleLicensePlateChange = (text: string) => {
    const formatted = formatLicensePlate(text);
    setLicensePlate(formatted.display);
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

  // Hàm hiển thị thông báo lỗi với style rõ ràng
  const showLicensePlateError = (message: string) => {
    console.log('Hiển thị lỗi biển số:', message);
    
    // Hiển thị thông báo lỗi với style rõ ràng
    Alert.alert(
      'Biển số xe không khả dụng',
      message,
      [{ text: 'Đã hiểu', style: 'default' }],
      { cancelable: false }
    );
    
    // Animation lắc cho input biển số xe
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
    
    // Reset trạng thái biển số
    setIsLicensePlateConfirmed(false);
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
              onPress={() => handleTabChange('daily')}
              >
              <Text style={[styles.tabText, activeTab === 'daily' && styles.activeTabText]}>
                Vé Ngày
              </Text>
              </TouchableOpacity>
              <TouchableOpacity 
              style={[styles.tab, activeTab === 'monthly' && styles.activeTab]}
              onPress={() => handleTabChange('monthly')}
              >
              <Text style={[styles.tabText, activeTab === 'monthly' && styles.activeTabText]}>
                Vé Tháng
              </Text>
              </TouchableOpacity>
          </View>
          
          {activeTab === 'daily' ? renderDailyTab() : renderMonthlyTab()}

          <View style={styles.parkingZonesSection}>
            <Text style={styles.sectionTitle}>Chọn khu vực đỗ xe</Text>
            
            {!hasTimeInfo() && (
              <View style={styles.warningContainer}>
                <Text style={styles.warningText}>
                  Vui lòng chọn thời gian đặt chỗ trước khi chọn khu vực đỗ xe
                </Text>
              </View>
            )}
            
            {hasTimeInfo() && !priceInfo && (
              <View style={styles.warningContainer}>
                <Text style={styles.warningText}>
                  Đang tính giá, vui lòng đợi một lát...
                </Text>
              </View>
            )}
            
            {hasTimeInfo() && priceInfo && !isLicensePlateConfirmed && (
              <View style={styles.warningContainer}>
                <Text style={styles.warningText}>
                  Vui lòng xác nhận biển số xe trước khi chọn khu vực
                </Text>
              </View>
            )}
            
            {hasTimeInfo() && priceInfo && isLicensePlateConfirmed && !isPhoneNumberConfirmed && (
              <View style={styles.warningContainer}>
                <Text style={styles.warningText}>
                  Vui lòng xác nhận số điện thoại trước khi chọn khu vực
                </Text>
              </View>
            )}
            
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
                
                // Kiểm tra trạng thái có thể chọn
                const canSelect = zone.availableSpots > 0 && hasTimeInfo() && priceInfo && isLicensePlateConfirmed && isPhoneNumberConfirmed;
                
                return (
                  <TouchableOpacity 
                    key={zone.id}
                    style={[
                      styles.zoneCard,
                      zone.availableSpots === 0 && styles.zoneCardDisabled,
                      !canSelect && styles.zoneCardDisabled
                    ]}
                    disabled={!canSelect}
                    onPress={() => handleZoneSelection(zone.id)}
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
                    
                    {canSelect ? (
                      <View style={styles.viewMapButton}>
                        <Text style={styles.viewMapText}>Xem sơ đồ</Text>
                        <Text style={styles.arrowIcon}>→</Text>
                      </View>
                    ) : !hasTimeInfo() ? (
                      <Text style={styles.noAvailabilityText}>
                        Vui lòng chọn thời gian trước
                      </Text>
                    ) : !priceInfo ? (
                      <Text style={styles.noAvailabilityText}>
                        Đang tính giá...
                      </Text>
                    ) : !isLicensePlateConfirmed ? (
                      <Text style={styles.noAvailabilityText}>
                        Vui lòng xác nhận biển số xe
                      </Text>
                    ) : !isPhoneNumberConfirmed ? (
                      <Text style={styles.noAvailabilityText}>
                        Vui lòng xác nhận số điện thoại
                      </Text>
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
  warningContainer: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeeba',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    color: '#856404',
    fontSize: 14,
    textAlign: 'center',
  },
  confirmedInput: {
    backgroundColor: '#e6ffed',
    borderColor: '#34d399',
  },
  confirmTimeButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  confirmTimeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmedTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6ffed',
    borderWidth: 1,
    borderColor: '#34d399',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    justifyContent: 'space-between',
  },
  confirmedTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#047857',
    flex: 1,
  },
});

export default BookingScreen;
