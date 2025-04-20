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
  priceId: number;
  pricePerUnit: string;
  bookingType: string;
  totalPrice: number;
  currency: string;
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
  licensePlate: string;
  isExisting: boolean;
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

  // Thêm state để lưu loại vé đã chọn
  const [selectedTicketType, setSelectedTicketType] = useState<'daily' | 'monthly'>('daily');

  const [priceDetailsLog, setPriceDetailsLog] = useState<string[]>([]);

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
    fetchParkingZones(); // Gọi API để lấy danh sách các khu vực
    loadUserInputFromStorage();
    
    // Lấy thông tin người dùng từ AsyncStorage
    const fetchUser = async () => {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
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

  // Tự động tính giá dựa trên thời gian và pricePerUnit
  const calculateDefaultPrice = (startTimeStr: string, endTimeStr: string) => {
    try {
      console.log('========= THÔNG TIN ĐẶT CHỖ =========');
      console.log('Thời gian đặt:', { 
        ngày: startTimeStr.split(' ')[0], 
        bắt_đầu: startTimeStr.split(' ')[1], 
        kết_thúc: endTimeStr.split(' ')[1]
      });
      console.log('=====================================');
      console.log('Tính giá vé với:', { startTimeStr, endTimeStr });
      
      // Xử lý format ngày tháng
      const parseTime = (timeStr: string) => {
        try {
          const [datePart, timePart] = timeStr.split(' ');
          if (!datePart || !timePart) {
            throw new Error('Invalid time format');
          }
          
          const [day, month, year] = datePart.split('/').map(Number);
          const [hour, minute, second = '0'] = timePart.split(':').map(Number);
          
          if (isNaN(day) || isNaN(month) || isNaN(year) || isNaN(hour) || isNaN(minute)) {
            throw new Error('Invalid time components');
          }
          
          // JavaScript months are 0-based (0-11)
          return new Date(year, month - 1, day, hour, minute, Number(second));
        } catch (error) {
          console.error('Failed to parse time:', timeStr, error);
          return null;
        }
      };
      
      const startTime = parseTime(startTimeStr);
      const endTime = parseTime(endTimeStr);
      
      if (!startTime || !endTime) {
        console.log('Không thể chuyển đổi thời gian, sử dụng giá cố định');
       
        return;
      }
      
      // Xử lý trường hợp endTime < startTime (qua ngày)
      let bookingEndTime = endTime;
      if (endTime.getTime() < startTime.getTime()) {
        bookingEndTime = new Date(endTime.getTime());
        bookingEndTime.setDate(bookingEndTime.getDate() + 1);
        console.log('Phát hiện đặt qua đêm, điều chỉnh ngày kết thúc:', bookingEndTime.toLocaleString());
      }
      
      // Tính số giờ tổng
      const durationInHours = (bookingEndTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      console.log('Tổng thời gian đặt:', durationInHours.toFixed(2), 'giờ');
      
      if (isNaN(durationInHours) || durationInHours <= 0) {
        console.log('Thời lượng không hợp lệ, sử dụng giá cố định');
        ;
        return;
      }
      
      // Giá mặc định: 8.000 VND mỗi giờ (như API trả về)
      const hourlyRate = 8000;
      
      // Cách tính mới: Tính theo ms chính xác cho từng ca
      const calculateHoursInTimeSlot = (slotStartHour: number, slotEndHour: number) => {
        // Tạo time slot cho ngày hiện tại
        const slotStart = new Date(startTime);
        slotStart.setHours(slotStartHour, 0, 0, 0);
        
        const slotEnd = new Date(startTime);
        if (slotEndHour <= slotStartHour) {
          // Nếu slot kết thúc qua ngày (ví dụ: 18:00-00:00)
          slotEnd.setDate(slotEnd.getDate() + 1);
        }
        // Xử lý 00:00 đặc biệt
        slotEnd.setHours(slotEndHour === 0 ? 24 : slotEndHour, 0, 0, 0);
        
        // Tính thời điểm bắt đầu và kết thúc của phần giao nhau
        const overlapStart = Math.max(slotStart.getTime(), startTime.getTime());
        const overlapEnd = Math.min(slotEnd.getTime(), bookingEndTime.getTime());
        
        // Tính số giờ từ ms
        const overlapDuration = overlapEnd - overlapStart;
        const hours = overlapDuration > 0 ? overlapDuration / (1000 * 60 * 60) : 0;
        
        return hours;
      };
      
      // Tính số giờ trong từng khung giờ
      const hoursInMorning = calculateHoursInTimeSlot(6, 12);
      const hoursInAfternoon = calculateHoursInTimeSlot(12, 18);
      const hoursInEvening = calculateHoursInTimeSlot(18, 0); // 00:00 ngày hôm sau
      const hoursInNight = calculateHoursInTimeSlot(0, 6);
      
      // Tính tổng giá
      const totalHours = hoursInMorning + hoursInAfternoon + hoursInEvening + hoursInNight;
      let totalPrice = hourlyRate * totalHours;
      
      // Đảm bảo giá tối thiểu
      totalPrice = Math.max(hourlyRate, totalPrice);
      
      // Làm tròn lên đến hàng nghìn
      totalPrice = Math.ceil(totalPrice / 1000) * 1000;
      
      console.log('Chi tiết tính giá:');
      console.log(`- Buổi sáng (06:00-12:00): ${hoursInMorning.toFixed(2)} giờ x ${hourlyRate.toLocaleString()} = ${(hoursInMorning * hourlyRate).toLocaleString()} VND`);
      console.log(`- Buổi chiều (12:00-18:00): ${hoursInAfternoon.toFixed(2)} giờ x ${hourlyRate.toLocaleString()} = ${(hoursInAfternoon * hourlyRate).toLocaleString()} VND`);
      console.log(`- Buổi tối (18:00-00:00): ${hoursInEvening.toFixed(2)} giờ x ${hourlyRate.toLocaleString()} = ${(hoursInEvening * hourlyRate).toLocaleString()} VND`);
      console.log(`- Qua đêm (00:00-06:00): ${hoursInNight.toFixed(2)} giờ x ${hourlyRate.toLocaleString()} = ${(hoursInNight * hourlyRate).toLocaleString()} VND`);
      console.log(`- Tổng: ${totalPrice.toLocaleString()} VND (${totalHours.toFixed(2)} giờ)`);
      
      const details = [
        `- Buổi sáng (06:00-12:00): ${hoursInMorning.toFixed(2)} giờ x ${hourlyRate.toLocaleString()} = ${(hoursInMorning * hourlyRate).toLocaleString()} VND`,
        `- Buổi chiều (12:00-18:00): ${hoursInAfternoon.toFixed(2)} giờ x ${hourlyRate.toLocaleString()} = ${(hoursInAfternoon * hourlyRate).toLocaleString()} VND`,
        `- Buổi tối (18:00-00:00): ${hoursInEvening.toFixed(2)} giờ x ${hourlyRate.toLocaleString()} = ${(hoursInEvening * hourlyRate).toLocaleString()} VND`,
        `- Qua đêm (00:00-06:00): ${hoursInNight.toFixed(2)} giờ x ${hourlyRate.toLocaleString()} = ${(hoursInNight * hourlyRate).toLocaleString()} VND`,
        `- Tổng: ${totalPrice.toLocaleString()} VND (${totalHours.toFixed(2)} giờ)`
      ];
      setPriceDetailsLog(details);

      setPriceInfo({
        price: totalPrice,
        currency: 'VND',
        priceDetails: {
          basePrice: totalPrice
        }
      });
      
      // Hiển thị tổng số giờ để người dùng kiểm tra
      console.log('Tổng số giờ:', totalHours.toFixed(2));
      setDailyDuration(`${Math.floor(totalHours)} giờ ${Math.round((totalHours % 1) * 60)} phút`);
    } catch (error) {
      console.error('Lỗi khi tính giá vé:', error);
      // Fallback to fixed price
      setPriceInfo({
        price: 20000,
        currency: 'VND',
        priceDetails: {
          basePrice: 20000
        }
      });
      setPriceDetailsLog([]);
    }
  };

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

    // Gọi API để lấy chi tiết khu vực
    fetchZoneDetails(zoneId);
  };

  const fetchZoneDetails = async (zoneId: number | string) => {
    try {
      setLoading(true);
      console.log('Đang gọi API lấy chi tiết khu vực:', zoneId);
      
      // Gọi API để lấy chi tiết khu vực
      const response = await api.get(`/bookings/zones/${zoneId}`);
      console.log('Response from zone details API:', response);
      
      if (!response.success || !response.data) {
        throw new Error(`Không thể lấy chi tiết khu vực ${zoneId}`);
      }
      
      // Lấy chi tiết khu vực từ response
      const zoneDetails = response.data as ZoneDetailsResponse;
      
      console.log('Chi tiết khu vực:', zoneDetails);
      
      // Kiểm tra dữ liệu hợp lệ
      if (!zoneDetails.slots || !Array.isArray(zoneDetails.slots)) {
        throw new Error('Dữ liệu sơ đồ khu vực không hợp lệ');
      }
      
      // Chuyển đổi dữ liệu slots thành định dạng phù hợp cho sơ đồ
      const formattedSlots = zoneDetails.slots.map((slot: ZoneSlot) => ({
        id: slot.id,
        code: slot.code,
        status: slot.status || 'available',
        position: {
          row: slot.position_y,
          col: slot.position_x
        }
      }));
      
      console.log('Đã map được sơ đồ khu vực');
      console.log('Tổng số chỗ:', zoneDetails.totalSpots);
      console.log('Số chỗ trống:', zoneDetails.availableSpots);
      
      // Lấy giá mỗi giờ từ priceInfo
      const pricePerHour = 8000; // Giá mặc định
      
      // Tổng giá từ priceInfo
      const totalPrice = priceInfo ? priceInfo.price : 0;
      
      // Navigate to BarkingLayoutScreen with zone data
      navigation.navigate('BarkingLayoutScreen', { 
        zoneId: zoneId.toString(),
        totalSpots: zoneDetails.totalSpots,
        availableSpots: zoneDetails.availableSpots,
        zoneData: JSON.stringify(formattedSlots),
        pricePerHour: pricePerHour,
        bookingDate: activeTab === 'daily' ? dailyBookingDate : monthlyStartDate,
        startTime: activeTab === 'daily' ? dailyStartTime : '00:00',
        endTime: activeTab === 'daily' ? dailyEndTime : '23:59',
        duration: activeTab === 'daily' ? dailyDuration : '30 ngày',
        totalPrice: totalPrice
      });
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
        spotCode: spotCode || 'A01',
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

  // Cập nhật hàm tính giá vé ngày dựa theo API
  const updatePriceInfo = async () => {
    if (dailyBookingDate !== 'Chưa chọn' && dailyStartTime !== 'Chưa chọn' && dailyEndTime !== 'Chưa chọn') {
      try {
        setLoading(true);
        
        // Format thời gian theo định dạng của calculateDefaultPrice
        const formatTimeForCalculation = (dateStr: string, timeStr: string) => {
          const [day, month, year] = dateStr.split('/');
          return `${day}/${month}/${year} ${timeStr}`;
        };
        
        const startDateTime = formatTimeForCalculation(dailyBookingDate, dailyStartTime);
        const endDateTime = formatTimeForCalculation(dailyBookingDate, dailyEndTime);
        
        // Sử dụng phương pháp tính trực tiếp thay vì gọi API
        calculateDefaultPrice(startDateTime, endDateTime);
      } catch (error) {
        console.error('Lỗi khi tính giá:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  // Hàm cập nhật thời lượng
  const updateDuration = (startTime: string, endTime: string) => {
    try {
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      
      let durationInMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
      
      // Xử lý trường hợp qua ngày
      if (durationInMinutes < 0) {
        durationInMinutes += 24 * 60;
      }
      
      if (durationInMinutes > 0) {
        const hours = Math.floor(durationInMinutes / 60);
        const minutes = durationInMinutes % 60;
        
        let durationText = '';
        if (hours > 0) {
          durationText += `${hours} giờ `;
        }
        if (minutes > 0) {
          durationText += `${minutes} phút`;
        }
        
        setDailyDuration(durationText.trim());
      }
    } catch (e) {
      console.error('Lỗi khi tính thời lượng:', e);
    }
  };

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

  const handleLicensePlateConfirm = async () => {
    if (!licensePlate || !validateLicensePlate(licensePlate)) {
      Alert.alert('Lỗi', 'Biển số xe không hợp lệ');
      return;
    }
    
    setLoading(true);
    try {
      const isValid = await checkLicensePlate(licensePlate);
      if (isValid) {
        setIsLicensePlateConfirmed(true);
        saveUserInputToStorage();
      }
    } catch (error) {
      console.error('Lỗi xác nhận biển số xe:', error);
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
          <TextInput
            style={styles.licensePlateInput}
            value={licensePlate}
            onChangeText={handleLicensePlateChange}
            placeholder="VD: 26 A1 12345"
            autoCapitalize="characters"
            maxLength={12}
          />
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

  // Cập nhật hàm kiểm tra biển số xe
  const checkLicensePlate = async (licensePlate: string) => {
    try {
      console.log('Kiểm tra biển số xe:', licensePlate);
      
      // Lấy userId từ thông tin người dùng đã lưu trong AsyncStorage
      let userId = null;
      const userData = await AsyncStorage.getItem('user');
      
      // Bắt buộc đăng nhập để kiểm tra biển số
      if (!userData) {
        Alert.alert('Thông báo', 'Bạn cần đăng nhập để kiểm tra biển số xe.');
        return false;
      }
      
      try {
        const user = JSON.parse(userData);
        userId = user.id;
        if (!userId) {
          throw new Error('ID người dùng không hợp lệ.');
        }
        console.log('Kiểm tra biển số xe với userId:', userId);
      } catch (parseError) {
        console.error('Lỗi khi xử lý dữ liệu người dùng:', parseError);
        Alert.alert('Thông báo', 'Dữ liệu người dùng không hợp lệ. Vui lòng đăng nhập lại.');
        // Có thể thêm điều hướng về màn hình Login ở đây nếu cần
        // navigation.navigate('Login'); 
        return false;
      }
      
      // Gọi API kiểm tra biển số xe
      const response = await api.post('/bookings/check-license-plate', { 
        licensePlate,
        userId
      });
      
      console.log('License plate check response:', response);
      
      // Kiểm tra phản hồi thành công và có dữ liệu
      if (response.success && response.data) {
        const licenseData = response.data as LicensePlateCheckResponse;
        
        // Nếu biển số xe đã đăng ký (isExisting = true), hiển thị cảnh báo
        if (licenseData.isExisting) {
          Alert.alert('Thông báo', 'Biển số xe này đã được đăng ký cho một đặt chỗ khác.');
          return false; // Không cho phép xác nhận
        }
        // Biển số hợp lệ và chưa được đăng ký
        console.log('Biển số xe hợp lệ và chưa được đăng ký');
        return true; // Cho phép xác nhận
      }
      
      // Trường hợp API không trả về success hoặc không có data
      const errorMessage = response.message || 'Không thể kiểm tra biển số xe. Vui lòng thử lại sau.';
      Alert.alert('Thông báo', errorMessage);
      return false; // Không cho phép xác nhận

    } catch (error: any) {
      console.error('Lỗi khi kiểm tra biển số xe:', error);
      
      // Xử lý lỗi cụ thể từ API nếu có (ví dụ: token hết hạn)
      let displayMessage = 'Đã xảy ra lỗi khi kiểm tra biển số xe. Vui lòng thử lại sau.';
      if (error.message && error.message.includes('hết hạn')) {
         displayMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
         // Xóa token và user data, điều hướng về Login
         await AsyncStorage.multiRemove(['auth_token', 'user']);
         // Cần đảm bảo Login Screen đã được thêm vào RootStackParamList
         // navigation.navigate('Login');
      } else if (error.message) {
         displayMessage = error.message; // Hiển thị lỗi từ API nếu có
      }

      Alert.alert('Lỗi', displayMessage);
      return false; // Không cho phép xác nhận khi có lỗi
    }
  }

  // Xử lý params từ ChooseTime.js
  useEffect(() => {
    if (route.params) {
      const { 
        bookingDate, 
        startTime, 
        endTime, 
        duration,
        monthlyStartDate,
        selectedSpotId, 
        selectedZoneId,
        selectedSpotCode,
        action,
        ticketType
      } = route.params;

      // Xử lý các trường hợp cụ thể
      if (bookingDate && startTime && endTime) {
        // Trường hợp vé ngày - giữ tab vé ngày
        setActiveTab('daily');
        setDailyBookingDate(bookingDate);
        setDailyStartTime(startTime);
        setDailyEndTime(endTime);
        if (duration) setDailyDuration(duration);
        
        console.log('Nhận thông tin đặt vé ngày từ màn hình chọn thời gian:', {
          ngày: bookingDate,
          giờ_bắt_đầu: startTime,
          giờ_kết_thúc: endTime,
          thời_lượng: duration || 'chưa tính'
        });
        
        // Gọi API tính giá sau khi có thông tin
        // Gọi API tính giá sau khi có thông tin
        setTimeout(() => {
          updatePriceInfo();
        }, 500);
      } else if (monthlyStartDate) {
        // Trường hợp vé tháng - giữ tab vé tháng
        setActiveTab('monthly');
        const startDate = new Date(monthlyStartDate);
        setMonthlyStartDate(formatDate(startDate));
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 30);
        setMonthlyEndDate(formatDate(endDate));
        // Gọi API tính giá vé tháng
        setTimeout(() => {
          calculateMonthlyPrice();
        }, 500);
      }
      
      // Lưu thông tin thời gian vào AsyncStorage
      const saveBookingTimeInfo = async () => {
        try {
          if (bookingDate) await AsyncStorage.setItem('booking_date', bookingDate);
          if (startTime) await AsyncStorage.setItem('booking_start_time', startTime);
          if (endTime) await AsyncStorage.setItem('booking_end_time', endTime);
          if (duration) await AsyncStorage.setItem('booking_duration', duration);
          if (monthlyStartDate) await AsyncStorage.setItem('booking_monthly_start_date', monthlyStartDate);
          if (activeTab) await AsyncStorage.setItem('booking_active_tab', activeTab);
        } catch (error) {
          console.error('Lỗi khi lưu thông tin thời gian:', error);
        }
      };
      
      saveBookingTimeInfo();

      // Nếu có action proceed_to_payment, kiểm tra điều kiện và chuyển đến màn hình thanh toán
      if (selectedSpotId && selectedZoneId && action === 'proceed_to_payment') {
        handlePaymentNavigation(selectedSpotId, selectedZoneId, selectedSpotCode);
      }
    }
  }, [route.params]);

  // Cập nhật hàm tính giá vé tháng
  const calculateMonthlyPrice = async () => {
    try {
      setLoading(true);
      
      console.log('========= THÔNG TIN VÉ THÁNG =========');
      console.log('Ngày bắt đầu:', monthlyStartDate);
      const endDate = new Date(new Date(monthlyStartDate.split('/').reverse().join('-')));
      endDate.setDate(endDate.getDate() + 30);
      const formattedEndDate = `${endDate.getDate()}/${endDate.getMonth() + 1}/${endDate.getFullYear()}`;
 
      
      // Sử dụng giá cố định cho vé tháng
      setPriceInfo({
        price: 200000,
        currency: 'VND',
        priceDetails: {
          basePrice: 200000
        }
      });
    } catch (error) {
      console.error('Lỗi khi tính giá vé tháng:', error);
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
});

export default BookingScreen;
