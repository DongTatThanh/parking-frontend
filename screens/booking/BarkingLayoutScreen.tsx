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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../Navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api/booking';
import { useWebSocketContext } from '../../context/WebSocketContext';
import { useWebSocketDebugger } from '../../components/WebSocketDebugger';

const { width } = Dimensions.get('window');

interface ParkingSpot {
  id: number;
  code: string;
  status: 'available' | 'occupied' | 'reserved' | 'booked' | 'pending';
  position: { row: number; col: number };
  bookings?: any[]; // Thêm trường bookings
  isOccupiedForSelectedTime?: boolean; // Thêm trường để đánh dấu chỗ đã đặt trong khung giờ cụ thể
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
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

type ParkingLayoutScreenRouteProp = RouteProp<RootStackParamList, 'BarkingLayoutScreen'>;

const BarkingLayoutScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<ParkingLayoutScreenRouteProp>();
  const { 
    zoneId, 
    totalSpots, 
    availableSpots, 
    zoneData,
  
    bookingDate = '',
    monthlyStartDate = '',
    startTime = '',
    endTime = '',
    duration = '',
    totalPrice = 0
  } = route.params;

  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [maxRows, setMaxRows] = useState(0);
  const [maxCols, setMaxCols] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [spotPrice, setSpotPrice] = useState(totalPrice);
  
  // Sử dụng WebSocketContext
  const { isConnected, addListener } = useWebSocketContext();
  
  // Thêm WebSocket debugger
  const { showDebugger, DebuggerComponent } = useWebSocketDebugger();

  useEffect(() => {
    // Cập nhật sơ đồ khu vực từ dữ liệu ban đầu
    updateSpotsFromData(zoneData);
  }, [zoneData, route.params?.startTime, route.params?.endTime]);

  // Hàm cập nhật sơ đồ từ dữ liệu
  const updateSpotsFromData = (data: string | undefined) => {
    if (data) {
      try {
        const layoutData = JSON.parse(data);
        let updatedSpots: ParkingSpot[] = [];
        
        // Check if data is in multi-time slot format
        if (layoutData.time_slots && Array.isArray(layoutData.time_slots)) {
          console.log('Processing multi-time slot layout data');
          
          // Get the current time slot from params
          const currentStart = route.params?.startTime as string;
          const currentEnd = route.params?.endTime as string;
          const currentDate = route.params?.bookingDate as string;
          
          // Find the matching time slot
          const matchingTimeSlot = layoutData.time_slots.find((timeSlot: any) => {
            const [slotStart, slotEnd] = timeSlot.time.split('-');
            return slotStart === currentStart && slotEnd === currentEnd;
          });
          
          if (matchingTimeSlot) {
            console.log('Found matching time slot:', matchingTimeSlot.time);
            // Convert the slots to our ParkingSpot format
            updatedSpots = matchingTimeSlot.slots.map((slot: any) => ({
              id: slot.id,
              code: slot.code,
              status: slot.status,
              position: {
                row: slot.position_y || 0,
                col: slot.position_x || 0
              }
            }));
          } else {
            console.log('No matching time slot found, using default layout');
            // Default to the first time slot if no match
            if (layoutData.time_slots.length > 0) {
              updatedSpots = layoutData.time_slots[0].slots.map((slot: any) => ({
                id: slot.id,
                code: slot.code,
                status: slot.status,
                position: {
                  row: slot.position_y || 0,
                  col: slot.position_x || 0
                }
              }));
            }
          }
        } else if (layoutData.slots && Array.isArray(layoutData.slots)) {
          // Legacy format with single time slot
          updatedSpots = layoutData.slots.map((slot: any) => ({
            id: slot.id,
            code: slot.code,
            status: slot.status || 'available',
            position: {
              row: slot.position_y || 0,
              col: slot.position_x || 0
            }
          }));
        }
        
        if (updatedSpots.length > 0) {
          setSpots(updatedSpots);
          
          // Also update maxRows and maxCols based on the spots
          let maxRow = 0;
          let maxCol = 0;
          updatedSpots.forEach((spot: any) => {
            if (spot.position.row > maxRow) maxRow = spot.position.row;
            if (spot.position.col > maxCol) maxCol = spot.position.col;
          });
          setMaxRows(maxRow + 1);
          setMaxCols(maxCol + 1);
        }
      } catch (error) {
        console.error('Error parsing spots data:', error);
        Alert.alert('Lỗi', 'Không thể hiển thị sơ đồ khu vực');
      }
    }
  };

  // Thiết lập WebSocket listeners
  useEffect(() => {
    // Hàm xử lý khi có booking mới được tạo
    const handleBookingCreated = (data: any) => {
      console.log('WebSocket: bookingCreated event received', data);
      if (data.zoneId === zoneId) {
        // Lấy thông tin khung giờ hiện tại
        const currentStart = route.params?.startTime as string;
        const currentEnd = route.params?.endTime as string;
        
        // Lấy thông tin khung giờ từ booking mới
        const bookingStartTime = data.timeFrame?.startTime;
        const bookingEndTime = data.timeFrame?.endTime;
        
        // Chỉ cập nhật nếu booking mới overlap với khung giờ đang xem
        const isOverlapping = currentStart && currentEnd && bookingStartTime && bookingEndTime
          ? isTimeOverlap(currentStart, currentEnd, bookingStartTime, bookingEndTime)
          : false;
        
        if (isOverlapping) {
          // Cập nhật lại trạng thái slot nếu có booking mới trong cùng zone
          const updatedSpots = [...spots];
          const slotIndex = updatedSpots.findIndex(s => s.id === data.slotId);
          
          if (slotIndex !== -1) {
            // Nếu tìm thấy slot, cập nhật trạng thái
            updatedSpots[slotIndex] = {
              ...updatedSpots[slotIndex],
              status: data.status === 'pending' ? 'pending' : 'booked'
            };
            
            setSpots(updatedSpots);
          }
        }
      }
    };

    // Hàm xử lý khi booking bị hủy
    const handleBookingCancelled = (data: any) => {
      console.log('WebSocket: bookingCancelled event received', data);
      if (data.zoneId === zoneId) {
        // Lấy thông tin khung giờ hiện tại
        const currentStart = route.params?.startTime as string;
        const currentEnd = route.params?.endTime as string;
        
        // Lấy thông tin khung giờ từ booking bị hủy
        const bookingStartTime = data.timeFrame?.startTime;
        const bookingEndTime = data.timeFrame?.endTime;
        
        // Chỉ cập nhật nếu booking bị hủy overlap với khung giờ đang xem
        const isOverlapping = currentStart && currentEnd && bookingStartTime && bookingEndTime
          ? isTimeOverlap(currentStart, currentEnd, bookingStartTime, bookingEndTime)
          : false;
        
        if (isOverlapping) {
          // Cập nhật lại trạng thái slot nếu có booking bị hủy trong cùng zone
          const updatedSpots = [...spots];
          const slotIndex = updatedSpots.findIndex(s => s.id === data.slotId);
          
          if (slotIndex !== -1) {
            // Nếu tìm thấy slot, cập nhật trạng thái
            updatedSpots[slotIndex] = {
              ...updatedSpots[slotIndex],
              status: 'available'
            };
            
            setSpots(updatedSpots);
          }
        }
      }
    };
    
    // Hàm xử lý khi booking hết hạn
    const handleBookingExpired = (data: any) => {
      console.log('WebSocket: bookingExpired event received', data);
      if (data.zoneId === zoneId) {
        // Process similar to booking cancelled
        const currentStart = route.params?.startTime as string;
        const currentEnd = route.params?.endTime as string;
        
        const bookingStartTime = data.timeFrame?.startTime;
        const bookingEndTime = data.timeFrame?.endTime;
        
        const isOverlapping = currentStart && currentEnd && bookingStartTime && bookingEndTime
          ? isTimeOverlap(currentStart, currentEnd, bookingStartTime, bookingEndTime)
          : false;
        
        if (isOverlapping) {
          const updatedSpots = [...spots];
          const slotIndex = updatedSpots.findIndex(s => s.id === data.slotId);
          
          if (slotIndex !== -1) {
            updatedSpots[slotIndex] = {
              ...updatedSpots[slotIndex],
              status: 'available'
            };
            
            setSpots(updatedSpots);
          }
        }
      }
    };
    
    // Hàm xử lý khi cập nhật toàn bộ zone
    const handleZonesUpdated = (data: any) => {
      console.log('WebSocket: zonesUpdated event received', data);
      // Dữ liệu zones được cập nhật từ server
      // Chỉ cập nhật các thông tin cơ bản của zone như availableSpots
      // Không thay đổi trạng thái các slot đã hiển thị
      if (Array.isArray(data)) {
        const updatedZone = data.find(zone => zone.id === zoneId);
        if (updatedZone) {
          // Cập nhật thông tin số chỗ trống
          // Ở đây chỉ thay đổi UI hiển thị, không thay đổi trạng thái các slot
          // vì trạng thái slot phải dựa trên khung giờ hiện tại
        }
      }
    };

    // Đăng ký listeners
    const bookingCreatedUnsubscribe = addListener('bookingCreated', handleBookingCreated);
    const bookingCancelledUnsubscribe = addListener('bookingCancelled', handleBookingCancelled);
    const bookingExpiredUnsubscribe = addListener('bookingExpired', handleBookingExpired);
    const zonesUpdatedUnsubscribe = addListener('zonesUpdated', handleZonesUpdated);

    // Gửi thông tin khung giờ hiện tại qua WebSocket cho server
    // để server có thể gửi thông tin phù hợp
    if (isConnected && route.params?.startTime && route.params?.endTime) {
      try {
        const setTimeFilterMessage = {
          type: 'setTimeFilter',
          data: {
            startTime: route.params.startTime,
            endTime: route.params.endTime
          }
        };
        console.log('Sending time filter to WebSocket:', setTimeFilterMessage);
      } catch (e) {
        console.error('Error sending time filter:', e);
      }
    }

    // Cleanup listeners khi component unmount
    return () => {
      bookingCreatedUnsubscribe();
      bookingCancelledUnsubscribe();
      bookingExpiredUnsubscribe();
      zonesUpdatedUnsubscribe();
    };
  }, [spots, selectedSpot, zoneId, isConnected, route.params?.startTime, route.params?.endTime, addListener]);

  // Hàm kiểm tra overlap thời gian
  function isTimeOverlap(startA: string, endA: string, startB: string, endB: string) {
    if (!startA || !endA || !startB || !endB) return false;
    
    // Ensure all times are in comparable format
    try {
      // Convert to comparable datetime strings if they're not already
      const startATime = startA.includes('T') ? startA : `2023-01-01T${startA}`;
      const endATime = endA.includes('T') ? endA : `2023-01-01T${endA}`;
      const startBTime = startB.includes('T') ? startB : `2023-01-01T${startB}`;
      const endBTime = endB.includes('T') ? endB : `2023-01-01T${endB}`;
      
      return !(endATime <= startBTime || endBTime <= startATime);
    } catch (e) {
      console.error('Error comparing times:', e);
      return false;
    }
  }
  
  // Hàm chi tiết hơn để debug overlap thời gian
  function debugTimeOverlap(startA: string, endA: string, startB: string, endB: string) {
    if (!startA || !endA || !startB || !endB) {
      console.log('DEBUG: Missing time parameter', { startA, endA, startB, endB });
      return false;
    }
    
    try {
      // Chuẩn hóa định dạng thời gian
      const startATime = startA.includes('T') ? startA : `2023-01-01T${startA}`;
      const endATime = endA.includes('T') ? endA : `2023-01-01T${endA}`;
      const startBTime = startB.includes('T') ? startB : `2023-01-01T${startB}`;
      const endBTime = endB.includes('T') ? endB : `2023-01-01T${endB}`;
      
      console.log('DEBUG Time comparison:');
      console.log(`  Time frame A: ${startATime} → ${endATime}`);
      console.log(`  Time frame B: ${startBTime} → ${endBTime}`);
      
      const condition1 = endATime <= startBTime;
      const condition2 = endBTime <= startATime;
      const isOverlapping = !(condition1 || condition2);
      
      console.log(`  Check 1: endA <= startB = ${endATime} <= ${startBTime} = ${condition1}`);
      console.log(`  Check 2: endB <= startA = ${endBTime} <= ${startATime} = ${condition2}`);
      console.log(`  Result: isOverlapping = ${isOverlapping}`);
      
      return isOverlapping;
    } catch (e) {
      console.error('DEBUG: Error in time comparison:', e);
      return false;
    }
  }

  // Xử lý chọn chỗ
  const handleSpotSelection = (spot: any) => {
    // Kiểm tra overlap thời gian với các booking đã có của slot
    const currentStart = route.params?.startTime;
    const currentEnd = route.params?.endTime;
    
    // Sử dụng flag isOccupiedForSelectedTime đã được tính toán trước đó
    let isOccupied = spot.isOccupiedForSelectedTime === true;
    
    // Double-check lại overlap nếu chưa có flag
    if (!('isOccupiedForSelectedTime' in spot) && spot.bookings && currentStart && currentEnd) {
      isOccupied = spot.bookings.some((booking: any) => {
        const overlaps = isTimeOverlap(currentStart, currentEnd, booking.start_time, booking.end_time);
        return overlaps;
      });
    }
    
    // Log chi tiết thông tin spot khi được chọn
    console.log('===== SELECTED SPOT DETAILS =====');
    console.log(`Spot ID: ${spot.id}, Code: ${spot.code}`);
    console.log(`Position: Row ${spot.position.row + 1}, Column ${spot.position.col + 1}`);
    console.log(`Status: ${spot.status}, Is occupied for selected time: ${isOccupied}`);
    console.log(`Selected time frame: ${currentStart} → ${currentEnd}`);
    if (spot.bookings && spot.bookings.length > 0) {
      console.log('Existing bookings:');
      spot.bookings.forEach((booking: any, index: number) => {
        console.log(`  Booking #${index + 1}:`);
        console.log(`    ID: ${booking.booking_id}`);
        console.log(`    Time: ${booking.start_time} → ${booking.end_time}`);
        console.log(`    Status: ${booking.status}`);
        if (currentStart && currentEnd) {
          const overlaps = isTimeOverlap(currentStart, currentEnd, booking.start_time, booking.end_time);
          console.log(`    Overlaps with selection: ${overlaps}`);
          if (overlaps) {
            console.log(`    CONFLICT: This booking overlaps with your selected time frame!`);
          }
        }
      });
    } else {
      console.log('No existing bookings for this spot');
    }
    console.log('==================================');
    
    if ((spot.status === 'available' || spot.status === 'reserved') && !isOccupied) {
      setSelectedSpot(spot);
      // Luôn lấy giá đúng với tổng tiền từ BookingScreen, không nhân thêm hệ số vị trí
      setSpotPrice(totalPrice);
    } else {
      Alert.alert('Không khả dụng', 'Vị trí này đã được đặt trong khung giờ bạn chọn hoặc đang bảo trì.');
    }
  };

  // Handle selection confirmation
  const handleConfirmSelection = async () => {
    try {
      if (!selectedSpot) {
        Alert.alert('Lỗi', 'Vui lòng chọn một vị trí đỗ xe');
        return;
      }
      console.log('Selected spot:', selectedSpot);
      
      setIsLoading(true);
      
      // Lấy thông tin user
      const userStr = await AsyncStorage.getItem('user');
      
      if (!userStr) {
        console.log('User not found in AsyncStorage');
        Alert.alert('Lỗi', 'Vui lòng đăng nhập để đặt chỗ');
        setIsLoading(false);
        return;
      }
      
      console.log('User data from AsyncStorage:', userStr);
      const user = JSON.parse(userStr);
      
      // Lấy các thông tin cần thiết từ AsyncStorage
      const storedLicensePlate = await AsyncStorage.getItem('license_plate');
      const oldLicensePlate = await AsyncStorage.getItem('booking_license_plate');
      const userLicensePlate = await AsyncStorage.getItem('user_license_plate');
      
      // Check all possible keys where license plate might be stored
      console.log('LICENSE PLATE DEBUG:');
      console.log('- license_plate:', storedLicensePlate);
      console.log('- booking_license_plate:', oldLicensePlate);
      console.log('- user_license_plate:', userLicensePlate);
      
      // Kiểm tra tất cả keys trong AsyncStorage
      const allKeys = await AsyncStorage.getAllKeys();
      console.log('All AsyncStorage keys:', allKeys);
      
      // Check if license plate exists in user object
      if (user && user.license_plate) {
        console.log('- User object has license_plate:', user.license_plate);
      }
      
      const licensePlate = storedLicensePlate || oldLicensePlate || userLicensePlate || user?.license_plate || '';
      const storedPhoneNumber = await AsyncStorage.getItem('phone_number');
      const oldPhoneNumber = await AsyncStorage.getItem('booking_phone_number');
      const priceId = route.params?.priceId || 1;
      
      console.log('Phone number debug:');
      console.log('- phone_number:', storedPhoneNumber);
      console.log('- booking_phone_number:', oldPhoneNumber);
      console.log('- User phone:', user?.phone);
      
      const phoneNumber = storedPhoneNumber || oldPhoneNumber || user?.phone || '';
      
      if (!licensePlate) {
        console.log('No license plate found');
        Alert.alert('Lỗi', 'Vui lòng nhập biển số xe');
        setIsLoading(false);
        return;
      }
      
      if (!phoneNumber) {
        console.log('No phone number found');
        Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');
        setIsLoading(false);
        return;
      }
      
      console.log('Using values:', { licensePlate, phoneNumber, priceId });
      
      // Lấy thông tin ngày và thời gian từ route params
      let dateStr = '';
      let startTimeStr = '';
      let endTimeStr = '';
      
      try {
        // Xử lý ngày (bookingDate có thể ở dạng DD/MM/YYYY)
        if (route.params?.bookingDate) {
          console.log('Parsing date:', route.params.bookingDate);
          const dateParts = route.params.bookingDate.split('/');
          
          if (dateParts.length === 3) {
            console.log('Date parts:', dateParts);
            const [day, month, year] = dateParts;
            
            if (day && month && year) {
              const formattedDay = day.padStart(2, '0');
              const formattedMonth = month.padStart(2, '0');
              dateStr = `${year}-${formattedMonth}-${formattedDay}`;
              console.log('Formatted date string:', dateStr);
            } else {
              console.error('Invalid date parts:', { day, month, year });
              throw new Error('Invalid date format');
            }
          } else {
            console.log('Date is already in ISO format:', route.params.bookingDate);
            dateStr = route.params.bookingDate;
          }
        }
        
        // Xử lý thời gian bắt đầu
        startTimeStr = route.params?.startTime || '';
        console.log('Start time string:', startTimeStr);
        
        // Xử lý thời gian kết thúc
        endTimeStr = route.params?.endTime || '';
        console.log('End time string:', endTimeStr);
        
        // Ghép ngày và giờ thành datetime ISO
        let startTime = dateStr && startTimeStr && startTimeStr !== 'Chưa chọn'
          ? `${dateStr}T${startTimeStr}:00`
          : null;
        let endTime = dateStr && endTimeStr && endTimeStr !== 'Chưa chọn'
          ? `${dateStr}T${endTimeStr}:00`
          : null;
          
        console.log('Formatted times:', { startTime, endTime });
        
        // Nếu endTime <= startTime (qua đêm), cộng thêm 1 ngày cho endTime
        if (startTime && endTime && endTime <= startTime) {
          console.log('End time is before or equal to start time, adjusting...');
          const endDateObj = new Date(endTime);
          endDateObj.setDate(endDateObj.getDate() + 1);
          const endMonth = (endDateObj.getMonth() + 1).toString().padStart(2, '0');
          const endDay = endDateObj.getDate().toString().padStart(2, '0');
          endTime = `${endDateObj.getFullYear()}-${endMonth}-${endDay}T${endDateObj.getHours().toString().padStart(2, '0')}:${endDateObj.getMinutes().toString().padStart(2, '0')}:${endDateObj.getSeconds().toString().padStart(2, '0')}`;
          console.log('Adjusted end time:', endTime);
        }
        
        // Kiểm tra đủ thông tin bắt buộc
        if (!user || !user.user_id || !selectedSpot.id || !priceId || !startTime || !endTime || !licensePlate || !phoneNumber) {
          console.error('Missing required data:', {
            userId: user?.user_id,
            spotId: selectedSpot.id,
            priceId,
            startTime,
            endTime,
            licensePlate,
            phoneNumber
          });
          Alert.alert('Lỗi', 'Thiếu thông tin cần thiết để tạo booking. Vui lòng kiểm tra lại.');
          setIsLoading(false);
          return;
        }

        console.log('Sending booking request with data:', {
          userId: user.user_id,
          slotId: selectedSpot.id,
          priceId: priceId,
          bookingType: route.params?.bookingType || 'daily',
          startTime: startTime,
          endTime: endTime,
          licensePlate: licensePlate,
          vehicleType: 'sedan',
          phoneNumber: phoneNumber
        });
        
        // Gọi API tạo booking với đủ thông tin
        const response = await api.post('/bookings/create', {
          userId: user.user_id,
          slotId: selectedSpot.id,
          priceId: priceId,
          bookingType: route.params?.bookingType || 'daily',
          startTime: startTime,
          endTime: endTime,
          licensePlate: licensePlate,
          vehicleType: 'sedan',
          phoneNumber: phoneNumber
        });
        
        if (!response.success) {
          console.error('API error response:', response);
          throw new Error(response.message || 'Không thể tạo booking');
        }
        
        const bookingResponse = response.data as BookingCreationResponse;
        
        // Navigate to payment screen with booking details
        navigation.navigate('PaymentScreen', {
          bookingId: bookingResponse.bookingId.toString(),
          totalPrice: bookingResponse.amount,
          currency: 'VND',
          spotCode: selectedSpot.code,
          zoneId: zoneId,
          bookingDate: route.params?.bookingDate,
          startTime: startTimeStr,
          endTime: endTimeStr,
          duration: route.params?.duration,
          bookingType: route.params?.bookingType || 'daily',
          licensePlate: licensePlate,
          phoneNumber: phoneNumber,
        });
        
      } catch (error: any) {
        console.error('Error creating booking:', error);
        console.error('Error details:', error.stack);
        Alert.alert('Lỗi', `Không thể tạo booking: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('Outer error in handleConfirmSelection:', error);
      console.error('Stack trace:', error.stack);
      Alert.alert('Lỗi', `Đã xảy ra lỗi: ${error.message}`);
      setIsLoading(false);
    }
  };

  // Format giá thành chuỗi VND
  const formatPrice = (price: number) => {
    return price.toLocaleString('vi-VN') + ' VND';
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
          <Text style={styles.backButtonText}>← Quay lại</Text>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Sơ đồ khu {zoneId}</Text>
          <Text style={styles.headerSubtitle}>
          Chỗ trống: {availableSpots}/{totalSpots}
          </Text>
          
          {/* Hiển thị trạng thái WebSocket */}
          <TouchableOpacity onPress={showDebugger}>
            <Text style={[styles.connectionStatus, {color: isConnected ? '#10b981' : '#ef4444'}]}>
              {isConnected ? 'Đã kết nối cập nhật trực tiếp' : 'Không có cập nhật trực tiếp'} (Nhấn để debug)
            </Text>
          </TouchableOpacity>
        
        {/* Hiển thị thông tin thời gian đã chọn */}
        {bookingDate && (
          <View style={styles.bookingInfoContainer}>
            <Text style={styles.bookingInfoText}>
              Ngày đặt: {bookingDate}
               
            </Text>
            <Text style={styles.bookingInfoContainer}>
               {startTime}
            </Text>
            <Text style={styles.bookingInfoText}>
              ngày hết hạn {endTime}
            </Text>
            <Text style={styles.bookingInfoText}>
              Thời lượng: {duration}
            </Text>
          </View>
        )}
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
        {/* Chú thích màu */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#10b981' }]} />
              <Text>Còn trống</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#ef4444', borderColor: '#ef4444' }]} />
              <Text>Đã có người đặt</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#fcd34d', borderColor: '#f59e0b' }]} />
              <Text>Đang chờ thanh toán</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#10b981', borderColor: '#10b981' }]} />
              <Text>Đã chọn</Text>
            </View>
          </View>
          
        {/* Sơ đồ chỗ đỗ xe */}
          <View style={styles.parkingMap}>
            <View style={styles.entranceSign}>
              <Text style={styles.entranceText}>Lối vào</Text>
            </View>
            
          {spots.length > 0 ? (
            <View style={styles.grid}>
              {Array.from({ length: maxRows }).map((_, rowIndex) => (
                <View key={`row-${rowIndex}`} style={styles.row}>
                  {Array.from({ length: maxCols }).map((_, colIndex) => {
                    // Tìm spot ở vị trí này
                    const spot = spots.find(s => 
                      s.position.row === rowIndex && s.position.col === colIndex
                    );
                    
                    if (!spot) {
                      return <View key={`empty-${rowIndex}-${colIndex}`} style={styles.emptySpot} />;
                    }
                    
                    // Kiểm tra xem slot có booking nào không
                    const hasBookings = spot.bookings && Array.isArray(spot.bookings) && spot.bookings.length > 0;
                    const isSelected = selectedSpot && selectedSpot.id === spot.id;
                    
                    // Kiểm tra trạng thái thực tế và booking
                    const isBooked = hasBookings || 
                                    spot.status === 'booked' || 
                                    spot.status === 'pending' || 
                                    spot.status === 'reserved' || 
                                    spot.status === 'occupied';
                    
                    // Log ra trạng thái thực tế của spot
                    console.log(`Rendering spot ${spot.code} at position ${rowIndex+1},${colIndex+1}:`);
                    console.log(`  Status: ${spot.status}`);
                    console.log(`  Has bookings: ${hasBookings}`);
                    console.log(`  Is booked: ${isBooked}`);
                    console.log(`  Is selected: ${isSelected}`);
                    
                    // Xác định style dựa trên trạng thái
                    let spotStyle;
                    let textStyle = { color: '#333' };
                    
                    if (isSelected) {
                      spotStyle = { backgroundColor: '#10b981', borderColor: '#10b981' };
                      textStyle = { color: '#fff' };
                    } else if (spot.status === 'booked' || (hasBookings && spot.bookings && spot.bookings[0] && spot.bookings[0].paymentStatus === 'completed')) {
                      spotStyle = { backgroundColor: '#ef4444', borderColor: '#ef4444' };
                      textStyle = { color: '#fff' };
                    } else if (spot.status === 'pending' || (hasBookings && spot.bookings && spot.bookings[0] && spot.bookings[0].status === 'pending')) {
                      spotStyle = { backgroundColor: '#fcd34d', borderColor: '#f59e0b' };
                      textStyle = { color: '#fff' };
                    } else if (spot.status === 'reserved' || hasBookings) {
                      spotStyle = { backgroundColor: '#f59e0b', borderColor: '#d97706' };
                      textStyle = { color: '#fff' };
                    } else if (spot.status === 'occupied') {
                      spotStyle = { backgroundColor: '#d1d5db', borderColor: '#d1d5db' };
                      textStyle = { color: '#fff' };
                    }

                    return (
                      <TouchableOpacity
                        key={`spot-${spot.id}`}
                        style={[
                          styles.parkingSpot,
                          spotStyle
                        ]}
                        onPress={() => handleSpotSelection(spot)}
                        disabled={isBooked}
                      >
                        <Text style={[
                          styles.spotText,
                          textStyle
                        ]}>
                          {spot.code}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noDataText}>Không có dữ liệu chỗ đỗ xe</Text>
          )}
          </View>
          
        {/* Thông tin chỗ đã chọn */}
        {selectedSpot && (
          <View style={styles.selectedSpotInfo}>
            <Text style={styles.selectedSpotTitle}>Chỗ đỗ xe đã chọn</Text>
            <View style={styles.spotInfoRow}>
              <Text style={styles.selectedSpotLabel}>
                Mã chỗ:
              </Text>
              <Text style={styles.selectedSpotValue}>
                {selectedSpot.code}
              </Text>
            </View>
            <View style={styles.spotInfoRow}>
              <Text style={styles.selectedSpotLabel}>
                Trạng thái:
              </Text>
              <Text style={styles.selectedSpotValue}>
                {selectedSpot.status === 'available' ? 'Có thể đặt' : 'Không khả dụng'}
              </Text>
            </View>
            <View style={styles.spotInfoRow}>
              <Text style={styles.selectedSpotLabel}>
                Vị trí:
              </Text>
              <Text style={styles.selectedSpotValue}>
                Hàng {selectedSpot.position.row + 1}, Cột {selectedSpot.position.col + 1}
              </Text>
            </View>
            <View style={styles.spotInfoRow}>
              <Text style={styles.selectedSpotLabel}>
                Giá tiền:
              </Text>
              <Text style={styles.priceValue}>
                {formatPrice(spotPrice)}
              </Text>
            </View>
            <Text style={styles.priceNote}>
              (Đã bao gồm thuế và phí dịch vụ)
            </Text>
          </View>
        )}
            
            <TouchableOpacity 
              style={[
                styles.confirmButton,
            (!selectedSpot || isLoading) && styles.disabledButton
          ]}
          disabled={!selectedSpot || isLoading}
          onPress={handleConfirmSelection}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
              <Text style={styles.confirmButtonText}>
              {selectedSpot 
                ? `Xác nhận chọn chỗ ${selectedSpot.code} - ${formatPrice(spotPrice)}` 
                : 'Vui lòng chọn một chỗ đỗ xe'}
              </Text>
          )}
            </TouchableOpacity>
      </ScrollView>
      
      {/* Thêm WebSocket Debugger */}
      <DebuggerComponent />
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
    backgroundColor: '#fff',
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#666',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  connectionStatus: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  bookingInfoContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  bookingInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    marginRight: 8,
    borderRadius: 4,
  },
  availableColor: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  occupiedColor: {
    backgroundColor: '#d1d5db',
    borderColor: '#d1d5db',
  },
  bookedSpot: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  pendingSpot: {
    backgroundColor: '#fcd34d',
    borderColor: '#f59e0b',
  },
  reservedSpot: {
    backgroundColor: '#f59e0b',
    borderColor: '#d97706',
  },
  selectedColor: {
    backgroundColor: '#10b981',
  },
  parkingMap: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  entranceSign: {
    backgroundColor: '#3b82f6',
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  entranceText: {
    color: '#fff',
    fontWeight: '600',
  },
  grid: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  parkingSpot: {
    width: 50,
    height: 50,
    margin: 4,
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  occupiedSpot: {
    backgroundColor: '#d1d5db',
    borderColor: '#d1d5db',
  },
  selectedSpot: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  emptySpot: {
    width: 50,
    height: 50,
    margin: 4,
  },
  spotText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  occupiedSpotText: {
    color: '#fff',
  },
  selectedSpotText: {
    color: '#fff',
  },
  noDataText: {
    textAlign: 'center',
    marginVertical: 20,
    color: '#666',
  },
  selectedSpotInfo: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  selectedSpotTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  spotInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedSpotLabel: {
    fontSize: 14,
    color: '#555',
  },
  selectedSpotValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#047857',
  },
  priceNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
    textAlign: 'right',
  },
  confirmButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#93c5fd',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BarkingLayoutScreen;