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
import { useWebSocketDebugger } from '../../components/common/WebSocketDebugger';

const { width } = Dimensions.get('window');

interface BookingData {
  booking_id: number;
  slot_id: number;
  slot_code: string;
  status: string;
  start_time: string;
  end_time: string;
  booking_created_at?: string;
  paymentStatus?: string;
}

interface ParkingSpot {
  id: number;
  code: string;
  status: 'available' | 'occupied' | 'reserved' | 'booked' | 'pending';
  position: { row: number; col: number };
  bookings?: BookingData[]; // Thay đổi kiểu dữ liệu của bookings
  isOccupiedForSelectedTime?: boolean;
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
  
  // Setup for WebSocket connections
  const { isConnected, addListener, sendMessage } = useWebSocketContext();
  
  // Thêm WebSocket debugger
  const { showDebugger, DebuggerComponent } = useWebSocketDebugger();

  useEffect(() => {
    // Cập nhật sơ đồ khu vực từ dữ liệu ban đầu
    updateSpotsFromData(zoneData);
  }, [zoneData, route.params?.startTime, route.params?.endTime]);

  // Kiểm tra booking tạm thời khi màn hình load
  useEffect(() => {
    checkPendingBooking();
  }, []);

  // Hàm kiểm tra booking tạm thời
  const checkPendingBooking = async () => {
    try {
      const pendingBookingStr = await AsyncStorage.getItem('pending_booking');
      if (!pendingBookingStr) return;

      const pendingBooking = JSON.parse(pendingBookingStr);
      
      // Kiểm tra booking còn hạn không
      if (pendingBooking.expirationTime) {
        const expTime = new Date(pendingBooking.expirationTime).getTime();
        const now = new Date().getTime();
        const timeRemaining = Math.floor((expTime - now) / 1000); // Thời gian còn lại (giây)
        
        // Nếu còn hạn và cùng khu vực đang xem
        if (timeRemaining > 0 && pendingBooking.zoneId === zoneId) {
          Alert.alert(
            'Đặt chỗ chưa hoàn tất',
            `Bạn có đặt chỗ ${pendingBooking.spotCode} chưa thanh toán còn ${Math.floor(timeRemaining/60)} phút ${timeRemaining%60} giây. Bạn muốn tiếp tục thanh toán?`,
            [
              {
                text: 'Tiếp tục thanh toán',
                onPress: () => {
                  // Tiếp tục với booking cũ
                  navigation.navigate('PaymentScreen', {
                    bookingId: pendingBooking.bookingId,
                    totalPrice: pendingBooking.totalPrice,
                    currency: 'VND',
                    spotCode: pendingBooking.spotCode,
                    zoneId: pendingBooking.zoneId,
                    bookingDate: pendingBooking.bookingDate,
                    startTime: pendingBooking.startTime,
                    endTime: pendingBooking.endTime,
                    duration: pendingBooking.duration,
                    bookingType: pendingBooking.bookingType,
                    licensePlate: pendingBooking.licensePlate,
                    phoneNumber: pendingBooking.phoneNumber,
                   
                  });
                }
              },
              {
                text: 'Đặt chỗ mới',
                style: 'cancel',
                onPress: () => {
                  // Xóa booking cũ để đặt mới
                  AsyncStorage.removeItem('pending_booking');
                }
              }
            ]
          );
        } else if (timeRemaining <= 0) {
          // Đã hết hạn, xóa booking cũ
          AsyncStorage.removeItem('pending_booking');
          
          // Xóa biển số xe khỏi AsyncStorage
          if (pendingBooking.licensePlate) {
            AsyncStorage.removeItem('booking_license_plate');
            AsyncStorage.removeItem('license_plate');
            
            // Giải phóng biển số xe trên server
            try {
              api.Vehicle.releaseLicensePlate(pendingBooking.licensePlate)
                .then(response => {
                  if (response.success) {
                    console.log('Đã giải phóng biển số xe hết hạn:', pendingBooking.licensePlate);
                  } else {
                    console.error('Lỗi khi giải phóng biển số xe:', response.message);
                  }
                })
                .catch(err => console.error('Lỗi khi gọi API giải phóng biển số xe:', err));
            } catch (err) {
              console.error('Lỗi khi giải phóng biển số xe từ booking hết hạn:', err);
            }
          }
          
          // Thông báo cho server để cập nhật trạng thái
          if (isConnected && sendMessage) {
            try {
              sendMessage({
                type: 'bookingExpired',
                data: {
                  bookingId: pendingBooking.bookingId,
                  zoneId: pendingBooking.zoneId,
                  slotId: pendingBooking.slotId || 0
                }
              });
            } catch (err) {
              console.error('Error sending booking expired message:', err);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error checking pending booking:', err);
    }
  };

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
          
          // Lấy tất cả bookings từ tất cả các khung giờ
          const allBookings = layoutData.time_slots.flatMap((timeSlot: any) => 
            timeSlot.slots.flatMap((slot: any) => {
              if (slot.bookings && Array.isArray(slot.bookings)) {
                return slot.bookings.map((booking: any) => ({
                  ...booking,
                  slot_id: slot.id,
                  slot_code: slot.code
                }));
              }
              
              // Nếu không có mảng bookings nhưng có booking_id, tạo một booking từ thông tin này
              if (slot.booking_id) {
                return [{
                  booking_id: slot.booking_id,
                  slot_id: slot.id,
                  slot_code: slot.code,
                  status: slot.status,
                  start_time: timeSlot.time.split('-')[0],
                  end_time: timeSlot.time.split('-')[1],
                  booking_created_at: slot.booking_created_at
                }];
              }
              
              return [];
            })
          );

          console.log(`Đã tìm thấy ${allBookings.length} bookings cho tất cả khung giờ`);
          
          // Find the matching time slot
          const matchingTimeSlot = layoutData.time_slots.find((timeSlot: any) => {
            const [slotStart, slotEnd] = timeSlot.time.split('-');
            return slotStart === currentStart && slotEnd === currentEnd;
          });
          
          if (matchingTimeSlot) {
            console.log('Found matching time slot:', matchingTimeSlot.time);
            // Convert the slots to our ParkingSpot format
            updatedSpots = matchingTimeSlot.slots.map((slot: any) => {
              // Kiểm tra thời gian hết hạn booking
              let slotStatus = slot.status;
              
              // Nếu status là pending, kiểm tra thời gian tạo booking
              if (slotStatus === 'pending' && slot.booking_created_at) {
                const bookingCreatedAt = new Date(slot.booking_created_at);
                const currentTime = new Date();
                const timeDiff = currentTime.getTime() - bookingCreatedAt.getTime();
                const minutesDiff = Math.floor(timeDiff / (1000 * 60));
                
                // Nếu đã quá 5 phút mà vẫn pending, tự động chuyển sang available
                if (minutesDiff > 5) {
                  console.log(`Booking for slot ${slot.code} expired (created ${minutesDiff} mins ago). Auto-setting to available.`);
                  slotStatus = 'available';
                  
                  // Báo cho server biết booking này đã hết hạn (nếu có connection)
                  if (isConnected && sendMessage) {
                    try {
                      sendMessage({
                        type: 'bookingExpired',
                        data: {
                          slotId: slot.id,
                          zoneId: zoneId,
                          bookingId: slot.booking_id || 0
                        }
                      });
                    } catch (err) {
                      console.error('Error sending booking expired message:', err);
                    }
                  }
                }
              }
              
              return {
              id: slot.id,
              code: slot.code,
                status: slotStatus,
              position: {
                row: slot.position_y || 0,
                col: slot.position_x || 0
                },
                // Lưu thông tin bookings để kiểm tra overlap sau này
                bookings: slot.bookings || [],
                booking_created_at: slot.booking_created_at,
                booking_id: slot.booking_id
              };
            });
          } else {
            console.log('No matching time slot found, using default layout');
            // Default to the first time slot if no match but maintain proper slot information
            if (layoutData.time_slots.length > 0) {
              // Lấy slots từ time slot đầu tiên
              const baseSlots = layoutData.time_slots[0].slots;
              
              // Tạo spots từ base slots và kiểm tra overlap với tất cả bookings
              updatedSpots = baseSlots.map((slot: any) => {
                // Tìm tất cả bookings của slot này
                const slotBookings = allBookings.filter((booking: any) => booking.slot_id === slot.id);
                
                // Kiểm tra xem có booking nào overlap với khung giờ đã chọn không
                let isOccupiedForSelectedTime = false;
                let effectiveStatus = 'available';
                let overlappingBooking = null;
                
                if (currentStart && currentEnd) {
                  // Tìm booking có thời gian chồng chéo với khung giờ đã chọn
                  overlappingBooking = slotBookings.find((booking: BookingData) => {
                    if (!booking.start_time || !booking.end_time) return false;
                    
                    const overlaps = isTimeOverlap(
                      currentStart, 
                      currentEnd, 
                      booking.start_time, 
                      booking.end_time
                    );
                    
                    console.log(`Kiểm tra overlap cho chỗ ${slot.code}: ${overlaps} - ${booking.start_time}-${booking.end_time} vs ${currentStart}-${currentEnd}`);
                    
                    if (overlaps && booking.status === 'pending') {
                      // Nếu là pending, kiểm tra thời gian tạo
                      if (booking.booking_created_at) {
                        const bookingCreatedAt = new Date(booking.booking_created_at);
                        const currentTime = new Date();
                        const timeDiff = currentTime.getTime() - bookingCreatedAt.getTime();
                        const minutesDiff = Math.floor(timeDiff / (1000 * 60));
                        
                        // Nếu đã quá 5 phút, booking hết hạn, không tính là overlap
                        if (minutesDiff > 5) {
                          console.log(`Booking cho chỗ ${slot.code} đã hết hạn sau ${minutesDiff} phút. Chuyển sang available.`);
                          return false;
                        }
                      }
                    }
                    
                    return overlaps;
                  });
                  
                  isOccupiedForSelectedTime = !!overlappingBooking;
                  
                  if (isOccupiedForSelectedTime) {
                    effectiveStatus = overlappingBooking.status || 'booked';
                  }
                }
                
                console.log(`Chỗ ${slot.code}: trạng thái = ${effectiveStatus}, đã đặt = ${isOccupiedForSelectedTime}`);
                
                return {
                id: slot.id,
                code: slot.code,
                  status: effectiveStatus,
                position: {
                  row: slot.position_y || 0,
                  col: slot.position_x || 0
                  },
                  bookings: slotBookings,
                  isOccupiedForSelectedTime: isOccupiedForSelectedTime
                };
              });
            }
          }
        } else if (layoutData.slots && Array.isArray(layoutData.slots)) {
          // Legacy format with single time slot
          updatedSpots = layoutData.slots.map((slot: any) => {
            // Kiểm tra thời gian hết hạn nếu là pending
            let slotStatus = slot.status || 'available';
            
            if (slotStatus === 'pending' && slot.booking_created_at) {
              const bookingCreatedAt = new Date(slot.booking_created_at);
              const currentTime = new Date();
              const timeDiff = currentTime.getTime() - bookingCreatedAt.getTime();
              const minutesDiff = Math.floor(timeDiff / (1000 * 60));
              
              // Nếu đã quá 5 phút, đặt lại trạng thái
              if (minutesDiff > 5) {
                console.log(`Booking for slot ${slot.code} expired. Auto-setting to available.`);
                slotStatus = 'available';
              }
            }
            
            return {
            id: slot.id,
            code: slot.code,
              status: slotStatus,
            position: {
              row: slot.position_y || 0,
              col: slot.position_x || 0
              },
              bookings: slot.bookings || [],
              booking_created_at: slot.booking_created_at,
              booking_id: slot.booking_id
            };
          });
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
        // Send time filter to WebSocket
        const setTimeFilterMessage = {
          type: 'setTimeFilter',
          data: {
            startTime: route.params.startTime,
            endTime: route.params.endTime
          }
        };
        
        // Use the sendMessage function from context
        sendMessage(setTimeFilterMessage);
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

  // Kiểm tra xem slot có bị chiếm bởi booking confirmed/completed trong thời gian chọn không
  const isSlotOccupied = (spot: any) => {
    const startTime = route.params?.startTime || '';
    const endTime = route.params?.endTime || '';
    if (!spot.bookings || !Array.isArray(spot.bookings) || !startTime || !endTime) return false;
    return spot.bookings.some((booking: any) => {
      if (!booking.start_time || !booking.end_time) return false;
      const overlap = isTimeOverlap(startTime, endTime, booking.start_time, booking.end_time);
      return overlap && (booking.status === 'confirmed' || booking.status === 'completed');
    });
  };

  // Xử lý chọn chỗ
  const handleSpotSelection = (spot: any) => {
    // Lấy thông tin thời gian hiện tại từ params
    const currentStart = route.params?.startTime;
    const currentEnd = route.params?.endTime;
    
    console.log(`==== KIỂM TRA CHỌN CHỖ ${spot.code} ====`);
    console.log(`Trạng thái: ${spot.status}`);
    console.log(`Đã đặt cho thời gian đã chọn: ${spot.isOccupiedForSelectedTime}`);
    console.log(`Thời gian đang chọn: ${currentStart}-${currentEnd}`);
    
    // Logic kiểm tra đơn giản hơn, dựa vào trạng thái đã tính toán sẵn
    // khi hiển thị spot trong updateSpotsFromData
    if (spot.isOccupiedForSelectedTime === true) {
      console.log(`Chỗ ${spot.code} đã được đặt trong khung giờ ${currentStart}-${currentEnd}`);
      Alert.alert('Không khả dụng', 'Vị trí này đã được đặt trong khung giờ bạn chọn.');
      return;
    }
    
    if (spot.status !== 'available') {
      console.log(`Chỗ ${spot.code} có trạng thái không khả dụng: ${spot.status}`);
      Alert.alert('Không khả dụng', 'Vị trí này không khả dụng hoặc đang bảo trì.');
      return;
    }
    
    // Double-check: kiểm tra lại với các bookings hiện có
    if (spot.bookings && Array.isArray(spot.bookings) && currentStart && currentEnd) {
      console.log(`Kiểm tra ${spot.bookings.length} bookings của chỗ ${spot.code}:`);
      
      const hasOverlap = spot.bookings.some((booking: any) => {
        if (!booking.start_time || !booking.end_time) return false;
        
        const overlap = isTimeOverlap(currentStart, currentEnd, booking.start_time, booking.end_time);
        
        // Kiểm tra nếu là pending quá 5 phút thì cho phép đặt
        if (overlap && booking.status === 'pending' && booking.booking_created_at) {
          const bookingCreatedAt = new Date(booking.booking_created_at);
          const currentTime = new Date();
          const timeDiff = currentTime.getTime() - bookingCreatedAt.getTime();
          const minutesDiff = Math.floor(timeDiff / (1000 * 60));
          
          // Nếu đã quá 5 phút, booking hết hạn
          if (minutesDiff > 5) {
            console.log(`- Booking từ ${booking.start_time} đến ${booking.end_time} đã hết hạn sau ${minutesDiff} phút`);
            return false;
          }
        }
        
        console.log(`- Booking từ ${booking.start_time} đến ${booking.end_time}: ${overlap ? 'TRÙNG' : 'không trùng'}`);
        return overlap;
      });
      
      if (hasOverlap) {
        console.log(`PHÁT HIỆN TRÙNG LỊCH: Chỗ ${spot.code} đã được đặt trong khung giờ bạn chọn!`);
        Alert.alert('Không khả dụng', 'Vị trí này đã được đặt trong khung giờ bạn chọn. Hệ thống vừa phát hiện lịch đặt chỗ mới.');
        return;
        }
    }
    
    // Nếu qua được tất cả kiểm tra, cho phép chọn chỗ
    console.log(`Chỗ ${spot.code} khả dụng để đặt!`);
      setSelectedSpot(spot);
      setSpotPrice(totalPrice);
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
      
      try {
        // Log tất cả các keys từ AsyncStorage
        const allKeys = await AsyncStorage.getAllKeys();
        console.log('ALL ASYNC STORAGE KEYS:', allKeys);
        
        // Cố gắng đọc tất cả các khóa liên quan đến user để debug
        for (const key of allKeys) {
          if (key.toLowerCase().includes('user') || key.toLowerCase().includes('id') || key.toLowerCase().includes('token')) {
            const value = await AsyncStorage.getItem(key);
            console.log(`AsyncStorage[${key}] =`, value);
          }
        }
      
      // Lấy thông tin user
      const userStr = await AsyncStorage.getItem('user');
        const userDataStr = await AsyncStorage.getItem('userData');
        const profileStr = await AsyncStorage.getItem('profile');
        const tokenStr = await AsyncStorage.getItem('token');
        
        console.log('User from AsyncStorage:', userStr);
        console.log('UserData from AsyncStorage:', userDataStr);
        console.log('Profile from AsyncStorage:', profileStr);
        console.log('Token from AsyncStorage:', tokenStr);
        
        // Parse tất cả các đối tượng có thể chứa userId
        let userId;
        let user = null;
        
        if (userStr) {
          try {
            user = JSON.parse(userStr);
            console.log('USER OBJECT DETAILS:');
            console.log('- Complete user object:', user);
            console.log('- User keys:', user ? Object.keys(user) : 'null');
            
            // Thử tất cả các khóa có thể
            userId = user.user_id || user.id || user.userId || user._id;
            
            // Nếu là một object lồng nhau
            if (!userId && user.user) {
              userId = user.user.user_id || user.user.id || user.user.userId || user.user._id;
            }
            
            // Kiểm tra trường data
            if (!userId && user.data) {
              userId = user.data.user_id || user.data.id || user.data.userId || user.data._id;
            }
            
            console.log('Extracted userId from user object:', userId);
          } catch (e) {
            console.error('Error parsing user:', e);
          }
        }
        
        // Thử từ userData nếu có
        if (!userId && userDataStr) {
          try {
            const userData = JSON.parse(userDataStr);
            userId = userData.user_id || userData.id || userData.userId || userData._id;
            console.log('Extracted userId from userData:', userId);
          } catch (e) {
            console.error('Error parsing userData:', e);
          }
        }
        
        // Thử từ profile nếu có
        if (!userId && profileStr) {
          try {
            const profile = JSON.parse(profileStr);
            userId = profile.user_id || profile.id || profile.userId || profile._id;
            console.log('Extracted userId from profile:', userId);
          } catch (e) {
            console.error('Error parsing profile:', e);
          }
        }
        
        // Thử đọc trực tiếp các khóa có thể chứa userId
        if (!userId) {
          const directUserId = await AsyncStorage.getItem('userId') || 
                              await AsyncStorage.getItem('user_id') || 
                              await AsyncStorage.getItem('id');
          
          if (directUserId) {
            userId = directUserId;
            console.log('Found userId in direct AsyncStorage key:', userId);
          }
        }
        
        // Gán một userId tạm thời cho môi trường test nếu không tìm thấy
        if (!userId) {
          // Đây là giải pháp tạm thời, chỉ dùng trong trường hợp test
          // Trong môi trường thực tế cần fix lỗi lưu userId
          userId = 1;  // userId mặc định cho testing
          console.warn('USING FALLBACK USER ID FOR TESTING. THIS MUST BE FIXED IN PRODUCTION!');
        }
        
        // Tiếp tục với licensePlate, phoneNumber và các thông tin khác
      const storedLicensePlate = await AsyncStorage.getItem('license_plate');
      const oldLicensePlate = await AsyncStorage.getItem('booking_license_plate');
      const userLicensePlate = await AsyncStorage.getItem('user_license_plate');
      
      // Check all possible keys where license plate might be stored
      console.log('LICENSE PLATE DEBUG:');
      console.log('- license_plate:', storedLicensePlate);
      console.log('- booking_license_plate:', oldLicensePlate);
      console.log('- user_license_plate:', userLicensePlate);
      
      // Kiểm tra tất cả keys trong AsyncStorage
        // Xóa dòng khai báo allKeys ở đây vì đã được khai báo ở trên
      
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
        
        let startTime, endTime;
        if (route.params?.bookingType === 'monthly') {
          // Vé tháng: startTimeStr và endTimeStr đã là ISO string
          startTime = startTimeStr;
          endTime = endTimeStr;
        } else {
          // Vé ngày: ghép ngày và giờ
          startTime = dateStr && startTimeStr && startTimeStr !== 'Chưa chọn'
            ? `${dateStr}T${startTimeStr}:00`
            : null;
          endTime = dateStr && endTimeStr && endTimeStr !== 'Chưa chọn'
            ? `${dateStr}T${endTimeStr}:00`
            : null;
        }
        
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
          if (!userId || !selectedSpot.id || !priceId || !startTime || !endTime || !licensePlate || !phoneNumber) {
          console.error('Missing required data:', {
              userId,
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

          console.log('Sending bookingType:', route.params?.bookingType || 'daily'||'monthly');
        // Gọi API tạo booking với đủ thông tin
        const response = await api.post('/bookings/create', {
            userId,
          slotId: selectedSpot.id,
            priceId,
            bookingType: route.params?.bookingType || 'daily'||'monthly',
            startTime,
            endTime,
            licensePlate,
          vehicleType: 'sedan',
            phoneNumber
        });
        
        if (!response.success) {
          console.error('API error response:', response);
          throw new Error(response.message || 'Không thể tạo booking');
        }
        
        const bookingResponse = response.data as BookingCreationResponse;
        
          // Tính toán thời gian hết hạn (5 phút từ lúc tạo booking)
          const currentTime = new Date();
          const expirationTime = new Date(currentTime.getTime() + 5 * 60 * 1000); // Thêm 5 phút
          
          // Lưu thông tin booking tạm thời vào AsyncStorage
          const pendingBookingInfo = {
            bookingId: bookingResponse.bookingId.toString(),
            slotId: selectedSpot.id,
            totalPrice: bookingResponse.amount,
            spotCode: selectedSpot.code,
            zoneId: zoneId,
            bookingDate: route.params?.bookingDate,
            startTime: startTimeStr,
            endTime: endTimeStr,
            duration: route.params?.duration,
            bookingType: route.params?.bookingType || 'daily'||'monthly',
            licensePlate: licensePlate,
            phoneNumber: phoneNumber,
            expirationTime: expirationTime.toISOString(),
          };
          
          await AsyncStorage.setItem('pending_booking', JSON.stringify(pendingBookingInfo));
          console.log('Đã lưu thông tin booking tạm thời:', pendingBookingInfo);
          
          // Khi truyền sang màn hình thanh toán, đảm bảo startTime/endTime đúng chuẩn
          let paymentStartTime, paymentEndTime;
          if (route.params?.bookingType === 'monthly') {
            paymentStartTime = startTime;
            paymentEndTime = endTime;
          } else {
            paymentStartTime = startTimeStr;
            paymentEndTime = endTimeStr;
          }
          // ... existing code ...
          Alert.alert(
            'Đặt chỗ thành công',
            `Bạn có 5 phút để hoàn tất thanh toán. Nếu không thanh toán, chỗ đặt sẽ tự động hủy.`,
            [{ text: 'Đã hiểu', onPress: () => {
              // Navigate to payment screen with booking details and expiration time
        navigation.navigate('PaymentScreen', {
          bookingId: bookingResponse.bookingId.toString(),
          totalPrice: bookingResponse.amount,
          currency: 'VND',
          spotCode: selectedSpot.code,
          zoneId: zoneId,
          bookingDate: route.params?.bookingDate,
          startTime: paymentStartTime,
          endTime: paymentEndTime,
          duration: route.params?.duration,
          bookingType: route.params?.bookingType || 'daily'||'monthly',
          licensePlate: licensePlate,
          phoneNumber: phoneNumber
        });
            }}]
          );
        
      } catch (error: any) {
        console.error('Error creating booking:', error);
        console.error('Error details:', error.stack);
        Alert.alert('Lỗi', `Không thể tạo booking: ${error.message}`);
      }
    } catch (error: any) {
      console.error('Outer error in handleConfirmSelection:', error);
      console.error('Stack trace:', error.stack);
      Alert.alert('Lỗi', `Đã xảy ra lỗi: ${error.message}`);
      }
    } catch (error: any) {
      console.error('Outer error in handleConfirmSelection:', error);
      console.error('Stack trace:', error.stack);
      Alert.alert('Lỗi', `Đã xảy ra lỗi: ${error.message}`);
    } finally {
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