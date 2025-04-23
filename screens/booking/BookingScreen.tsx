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
    pricId: string;
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

// Mock list biển số xe đã đăng ký để test


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

  // Thêm hàm fetchParkingZones để gọi API lấy danh sách khu vực
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
    } finally {
      setLoading(false);
    }
  };

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

  // Hàm gọi API backend để tính giá vé
  const fetchPriceFromBackend = async (type: 'daily' | 'monthly', start: string, end: string) => {
    try {
      setLoading(true);
      const response = await api.post('/bookings/calculate-price', {
        bookingType: type,
        startTime: start,
        endTime: end
      });
      if (response.success && response.data) {
        setPriceInfo({
          price: response.data.totalPrice,
          currency: response.data.currency || 'VND',
          priceId: response.data.priceId,
          priceDetails: {
            basePrice: response.data.pricePerUnit
          }
        });
      } else {
        setPriceInfo(null);
        Alert.alert('Lỗi', response.message || 'Không thể lấy giá vé.');
      }
    } catch (error: any) {
      setPriceInfo(null);
      Alert.alert('Lỗi', error.message || 'Không thể lấy giá vé.');
    } finally {
      setLoading(false);
    }
  };

  // Cập nhật hàm updatePriceInfo cho vé ngày
  const updatePriceInfo = async () => {
    if (dailyBookingDate !== 'Chưa chọn' && dailyStartTime !== 'Chưa chọn' && dailyEndTime !== 'Chưa chọn') {
      // Chuyển đổi sang định dạng yyyy-mm-ddTHH:MM:SS
      const [d, m, y] = dailyBookingDate.split('/');
      const start = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${dailyStartTime}:00`;
      const end = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${dailyEndTime}:00`;
      await fetchPriceFromBackend('daily', start, end);
    }
  };

  // Cập nhật hàm tính giá vé tháng
  const calculateMonthlyPrice = async () => {
    if (monthlyStartDate !== 'Chưa chọn') {
      // Chuyển đổi sang định dạng yyyy-mm-ddTHH:MM:SS
      const [d, m, y] = monthlyStartDate.split('/');
      const start = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00`;
      // Kết thúc sau 30 ngày
      const endDate = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00`);
      endDate.setDate(endDate.getDate() + 30);
      const end = `${endDate.getFullYear()}-${(endDate.getMonth()+1).toString().padStart(2, '0')}-${endDate.getDate().toString().padStart(2, '0')}T00:00:00`;
      await fetchPriceFromBackend('monthly', start, end);
    }
  };

  // Tự động gọi updatePriceInfo khi chọn lại ngày/giờ vé ngày
  useEffect(() => {
    if (
      activeTab === 'daily' &&
      dailyBookingDate !== 'Chưa chọn' &&
      dailyStartTime !== 'Chưa chọn' &&
      dailyEndTime !== 'Chưa chọn'
    ) {
      updatePriceInfo();
    }
    // eslint-disable-next-line
  }, [activeTab, dailyBookingDate, dailyStartTime, dailyEndTime]);

  // Tự động gọi calculateMonthlyPrice khi chọn ngày vé tháng
  useEffect(() => {
    if (
      activeTab === 'monthly' &&
      monthlyStartDate !== 'Chưa chọn'
    ) {
      calculateMonthlyPrice();
    }
    // eslint-disable-next-line
  }, [activeTab, monthlyStartDate]);

  // Khi quay về từ ChooseTime, cập nhật lại state thời gian và gọi tính giá
  useEffect(() => {
    if (route.params) {
      if (route.params.bookingDate && route.params.startTime && route.params.endTime && route.params.duration) {
        setDailyBookingDate(route.params.bookingDate);
        setDailyStartTime(route.params.startTime);
        setDailyEndTime(route.params.endTime);
        setDailyDuration(route.params.duration);
      }
      if (route.params.monthlyStartDate) {
        setMonthlyStartDate(route.params.monthlyStartDate);
        // Tính ngày kết thúc vé tháng (30 ngày)
        const [d, m, y] = route.params.monthlyStartDate.split('/');
        const startDate = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 30);
        setMonthlyEndDate(`${endDate.getDate()}/${endDate.getMonth() + 1}/${endDate.getFullYear()}`);
      }
    }
  }, [route.params]);

  // Kiểm tra xem đã có thông tin thời gian chưa
  const hasTimeInfo = () => {
    if (activeTab === 'daily') {
      return dailyBookingDate !== 'Chưa chọn' && 
             dailyStartTime !== 'Chưa chọn' && 
             dailyEndTime !== 'Chưa chọn';
    } else {
      return monthlyStartDate !== 'Chưa chọn';
    }
  };

  // Tạo map để lưu trữ dữ liệu khu vực, để sơ đồ không thay đổi mỗi lần nhấn


  // Hàm để chọn khu vực đỗ xe
  const handleZoneSelection = (zoneId: number) => {
    if (!hasTimeInfo()) {
      Alert.alert('Thông báo', 'Vui lòng chọn thời gian đặt chỗ trước khi chọn khu vực đỗ xe');
      return;
    }

    if (!priceInfo) {
      updatePriceInfo();
      Alert.alert('Thông báo', 'Đang tính giá vé. Vui lòng đợi trong giây lát');
      return;
    }

    // Kiểm tra biển số xe và số điện thoại
    if (!isLicensePlateConfirmed || !isPhoneNumberConfirmed) {
      Alert.alert('Thông báo', 'Vui lòng xác nhận biển số xe và số điện thoại trước khi chọn khu vực đỗ xe');
      return;
    }

    fetchZoneDetails(zoneId);
  };

  const fetchZoneDetails = async (zoneId: number | string) => {
    try {
      setLoading(true);
      const response = await api.get(`/bookings/zones/${zoneId}`);
      if (!response.success || !response.data) {
        throw new Error(`Không thể lấy chi tiết khu vực ${zoneId}`);
      }
      const zoneDetails = response.data as ZoneDetailsResponse;
      if (!zoneDetails.slots || !Array.isArray(zoneDetails.slots)) {
        throw new Error('Dữ liệu sơ đồ khu vực không hợp lệ');
      }
      const formattedSlots = zoneDetails.slots.map((slot: ZoneSlot) => ({
        id: slot.id,
        code: slot.code,
        status: slot.status || 'available',
        position: {
          row: slot.position_y,
          col: slot.position_x
        }
      }));
      
      const totalPrice = priceInfo ? priceInfo.price : 0;
      // Ghép ngày và giờ thành datetime ISO cho startTime, endTime
      let dateStr = '';
      let startTime = '';
      let endTime = '';
      if (activeTab === 'daily' && dailyBookingDate !== 'Chưa chọn') {
        const [d, m, y] = dailyBookingDate.split('/');
        const day = d.padStart(2, '0');
        const month = m.padStart(2, '0');
        dateStr = `${y}-${month}-${day}`;
        if (dailyStartTime !== 'Chưa chọn') {
          startTime = `${dateStr}T${dailyStartTime}:00`;
        }
        if (dailyEndTime !== 'Chưa chọn') {
          endTime = `${dateStr}T${dailyEndTime}:00`;
        }
        if (startTime && endTime && endTime <= startTime) {
          const endDateObj = new Date(endTime);
          endDateObj.setDate(endDateObj.getDate() + 1);
          endTime = endDateObj.toISOString().slice(0, 19);
        }
      } else if (activeTab === 'monthly') {
        if (
          typeof monthlyStartDate === 'string' &&
          monthlyStartDate !== 'Chưa chọn' &&
          monthlyStartDate.split('/').length === 3
        ) {
          const [d, m, y] = monthlyStartDate.split('/');
          if (d && m && y) {
            const day = d.padStart(2, '0');
            const month = m.padStart(2, '0');
            dateStr = `${y}-${month}-${day}`;
            startTime = `${dateStr}T00:00:00`;
            const endDate = new Date(`${y}-${month}-${day}T00:00:00`);
            endDate.setDate(endDate.getDate() + 30);
            const endMonth = (endDate.getMonth() + 1).toString().padStart(2, '0');
            const endDay = endDate.getDate().toString().padStart(2, '0');
            endTime = `${endDate.getFullYear()}-${endMonth}-${endDay}T23:59:59`;
          } else {
            Alert.alert('Lỗi', 'Ngày bắt đầu vé tháng không hợp lệ.');
            setLoading(false);
            return;
          }
        } else {
          Alert.alert('Lỗi', 'Ngày bắt đầu vé tháng không hợp lệ.');
          setLoading(false);
          return;
        }
      }
      navigation.navigate('BarkingLayoutScreen', { 
        zoneId: zoneId.toString(),
        totalSpots: zoneDetails.totalSpots,
        availableSpots: zoneDetails.availableSpots,
        zoneData: JSON.stringify(formattedSlots),
   
        bookingDate: activeTab === 'daily' ? dailyBookingDate : monthlyStartDate,
        startTime: startTime,
        endTime: endTime,
        duration: activeTab === 'daily' ? dailyDuration : '30 ngày',
        totalPrice: totalPrice,
        priceId: priceInfo?.priceId,
        bookingType: activeTab
      });
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể tải thông tin chi tiết khu vực. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  // Hàm xử lý chuyển đến màn hình thanh toán
  const handlePaymentNavigation = async (spotId: number, zoneId: string, spotCode?: string) => {
    try {
      setLoading(true);
      console.log('====== CHUYỂN ĐẾN THANH TOÁN ======');
      // Log dữ liệu đầu vào
      console.log('Dữ liệu nhận vào:', { spotId, zoneId, spotCode });
      console.log('Loại vé:', activeTab);
      
      // Tạo booking với API
      const response = await api.post('/bookings/create', {
        spotId: spotId,
        zoneId: zoneId,
        bookingDate: activeTab === 'daily' ? dailyBookingDate : monthlyStartDate,
        startTime: activeTab === 'daily' ? dailyStartTime : '00:00',
        endTime: activeTab === 'daily' ? dailyEndTime : '23:59',
        duration: activeTab === 'daily' ? dailyDuration : '30 ngày',
        spotCode: spotCode ,
        totalPrice: priceInfo ? priceInfo.price : activeTab === 'monthly' ? 200000 : 20000,
        currency: 'VND',
        bookingType: activeTab,
      });
      
      console.log('Response từ API tạo booking:', response);
      
      if (!response.success) {
        throw new Error(response.message || 'Không thể tạo đặt chỗ');
      }
      
      // Nhận bookingId và thông tin thanh toán từ API
      const bookingData = response.data as BookingCreationResponse;
      const bookingId = bookingData.bookingId.toString();
      const amount = bookingData.amount || (priceInfo ? priceInfo.price : 0);
      
      console.log('Đã tạo booking thành công với ID:', bookingId);

      // Chuẩn bị dữ liệu cho màn hình thanh toán
      const paymentData = {
        bookingId,
        totalPrice: amount,
        currency: 'VND',
        spotCode: spotCode || bookingData.bookingDetails?.slot_code || 'A01',
        zoneId,
        // Thêm thông tin thời gian
        bookingDate: activeTab === 'daily' ? dailyBookingDate : monthlyStartDate,
        startTime: activeTab === 'daily' ? dailyStartTime : '00:00',
        endTime: activeTab === 'daily' ? dailyEndTime : '23:59',
        duration: activeTab === 'daily' ? dailyDuration : '30 ngày',
        bookingType: activeTab,
        licensePlate: licensePlate || bookingData.bookingDetails?.license_plate,
        phoneNumber: phoneNumber || bookingData.bookingDetails?.phone
      };
      
      console.log('Chuyển đến màn hình thanh toán với dữ liệu:', paymentData);
      
      // Chuyển thẳng đến màn hình thanh toán
      navigation.navigate('PaymentScreen', paymentData);
    } catch (error) {
      console.error('Lỗi khi chuyển đến thanh toán:', error);
      Alert.alert('Lỗi', 'Không thể xử lý thanh toán. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date): string => {
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  // Cập nhật hàm format biển số xe
  const formatLicensePlate = (text: string) => {
    // Xóa ký tự không phải chữ/số
    text = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    // 2 số đầu
    const numbers1 = text.slice(0, 2);
    // 1-2 ký tự giữa
    const middle = text.slice(2, 4);
    // 3-5 số cuối
    const numbers2 = text.slice(4, 9);
    // Ghép lại đúng định dạng
    let displayFormat = numbers1;
    if (middle) displayFormat += ` ${middle}`;
    if (numbers2) displayFormat += ` ${numbers2}`;
    // Trả về cho UI và API
    return {
      display: displayFormat.trim(),
      api: displayFormat.trim()
    };
  };

  const handleLicensePlateChange = (text: string) => {
    const formatted = formatLicensePlate(text);
    setLicensePlate(formatted.display);
  };

  // Cập nhật hàm kiểm tra biển số
  const checkLicensePlate = async (licensePlateDisplay: string) => {
    try {
      // Nếu userId chưa có, thử lấy lại từ AsyncStorage
      const currentUserId = userId || await loadUserIdFromStorage();
      
      if (!currentUserId) {
        console.log('Không tìm thấy userId, không thể kiểm tra biển số');
        return {
          valid: false,
          message: 'Vui lòng đăng nhập lại để tiếp tục'
        };
      }

      console.log('Đang kiểm tra biển số xe:', licensePlateDisplay);
      console.log('Sử dụng userId:', currentUserId);
      
      // Format biển số cho API
      const formatted = formatLicensePlate(licensePlateDisplay);
      const licensePlateForApi = formatted.api;
      
      console.log('Gửi yêu cầu kiểm tra biển số:', {
        licensePlate: licensePlateForApi,
        userId: currentUserId
      });
      
      const response = await api.post('/bookings/check-license-plate', {
        licensePlate: licensePlateForApi,
        userId: currentUserId
      });

      console.log('Phản hồi API:', response);

      if (response.success) {
        const responseData = response.data as LicensePlateCheckResponse;
        
        if (responseData && responseData.isExisting) {
          return {
            valid: false,
            message: 'Biển số xe này đã được đăng ký trong hệ thống'
          };
        }
        return {
          valid: true,
          message: response.message || 'Biển số xe hợp lệ'
        };
      } else {
        return {
          valid: false,
          message: response.message || 'Không thể xác nhận biển số xe'
        };
      }
    } catch (error) {
      console.error('Lỗi khi kiểm tra biển số:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.data?.message?.includes('Phiên đăng nhập đã hết hạn')) {
          await AsyncStorage.multiRemove(['token', 'userInfo', 'user']);
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
          return {
            valid: false,
            message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
          };
        }
      }
      
      return {
        valid: false,
        message: 'Có lỗi xảy ra khi kiểm tra biển số. Vui lòng thử lại sau.'
      };
    }
  };

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
        Alert.alert('Thành công', 'Biển số xe đã xác nhận thành công');
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

  const handlePhoneNumberConfirm = () => {
    setIsPhoneNumberConfirmed(true);
    saveUserInputToStorage();
  };

  const renderLicensePlateInput = () => (
    <View style={styles.formGroup}>
      <Text style={styles.label}>Biển số xe</Text>
      {!isLicensePlateConfirmed ? (
        <View style={styles.licensePlateInputContainer}>
          <Animated.View style={{ transform: [{ translateX: shakeAnimation }] }}>
            <TextInput
              style={[
                styles.licensePlateInput,
                isLicensePlateConfirmed ? styles.confirmedInput : null
              ]}
              value={licensePlate}
              onChangeText={handleLicensePlateChange}
              placeholder="VD: 26 A1 12345"
              autoCapitalize="characters"
              maxLength={12}
            />
          </Animated.View>
          {loading ? (
            <ActivityIndicator size="small" color="#3b82f6" style={styles.confirmButton} />
          ) : (
            <TouchableOpacity 
              style={[
                styles.confirmButton,
                (!licensePlate || !validateLicensePlate(licensePlate)) && styles.confirmButtonDisabled
              ]}
              onPress={handleLicensePlateConfirm}
              disabled={!licensePlate || !validateLicensePlate(licensePlate) || loading}
            >
              <Text style={styles.confirmButtonText}>Xác nhận</Text>
            </TouchableOpacity>
          )}
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

  // Cập nhật hàm chọn tab
  const handleTabChange = (tab: 'daily' | 'monthly') => {
    setActiveTab(tab);
    setSelectedTicketType(tab);
    // Lưu loại vé đã chọn
    AsyncStorage.setItem('selected_ticket_type', tab);
    
    // Reset giá khi chuyển tab
    setPriceInfo(null);
    
    // Tính giá mới nếu có đủ thông tin
    if (tab === 'monthly' && monthlyStartDate !== 'Chưa chọn') {
      calculateMonthlyPrice();
    } else if (tab === 'daily' && dailyBookingDate !== 'Chưa chọn' && 
               dailyStartTime !== 'Chưa chọn' && dailyEndTime !== 'Chưa chọn') {
      updatePriceInfo();
    }
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

  // DEBUG: Hàm kiểm tra toàn bộ AsyncStorage
  const debugAsyncStorage = async () => {
    try {
      console.log('===== DEBUG: ASYNC STORAGE =====');
      const keys = await AsyncStorage.getAllKeys();
      console.log('AsyncStorage Keys:', keys);

      // Kiểm tra các khóa liên quan đến user
      const userKeys = ['user', 'userInfo', 'userData', 'token'];
      for (const key of userKeys) {
        if (keys.includes(key)) {
          const value = await AsyncStorage.getItem(key);
          console.log(`AsyncStorage[${key}]:`, value);
          if (value) {
            try {
              const parsed = JSON.parse(value);
              console.log(`Parsed[${key}]:`, parsed);
              if (parsed.id) {
                console.log(`ID from ${key}:`, parsed.id);
              } else if (parsed.user && parsed.user.id) {
                console.log(`ID from ${key}.user:`, parsed.user.id);
              }
            } catch (e) {
              console.log(`Cannot parse ${key}`);
            }
          }
        } else {
          console.log(`Key '${key}' not found in AsyncStorage`);
        }
      }
      console.log('================================');
    } catch (error) {
      console.error('Debug error:', error);
    }
  };

  // Gọi hàm debug khi component mount
  useEffect(() => {
    debugAsyncStorage();
  }, []);

  // Cập nhật khôi phục userId từ AsyncStorage
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
        
        // Kiểm tra trường user_id
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
      return null;
    } catch (error) {
      console.error('Lỗi khi lấy userId từ AsyncStorage:', error);
      return null;
    }
  };

  // Thay thế useEffect cũ để gọi loadUserIdFromStorage
  useEffect(() => {
    loadUserIdFromStorage();
  }, []);

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
                      zone.availableSpots === 0 && styles.zoneCardDisabled,
                      !hasTimeInfo() && styles.zoneCardDisabled
                    ]}
                    disabled={zone.availableSpots === 0 || !hasTimeInfo() || !priceInfo || !isLicensePlateConfirmed || !isPhoneNumberConfirmed}
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
                    
                    {zone.availableSpots > 0 && hasTimeInfo() && priceInfo && isLicensePlateConfirmed && isPhoneNumberConfirmed ? (
                      <View style={styles.viewMapButton}>
                        <Text style={styles.viewMapText}>Xem sơ đồ</Text>
                        <Text style={styles.arrowIcon}>→</Text>
                      </View>
                    ) : !hasTimeInfo() ? (
                      <Text style={styles.noAvailabilityText}>
                        Vui lòng chọn thời gian trước
                      </Text>
                    ) : !isLicensePlateConfirmed || !isPhoneNumberConfirmed ? (
                      <Text style={styles.noAvailabilityText}>
                        Vui lòng xác nhận biển số xe và SĐT
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
});

export default BookingScreen;
