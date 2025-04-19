import React, { useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../Navigation/types';

// Định nghĩa các khung giờ cố định
const TIME_SLOTS = [
  { id: 'morning', name: 'Buổi sáng', startTime: '06:00', endTime: '12:00', description: 'Đỗ xe buổi sáng (đi làm, mua sắm, sự kiện)' },
  { id: 'afternoon', name: 'Buổi chiều', startTime: '12:00', endTime: '18:00', description: 'Đỗ xe buổi chiều (công việc, tan làm, sự kiện)' },
  { id: 'evening', name: 'Buổi tối', startTime: '18:00', endTime: '00:00', description: 'Đỗ xe buổi tối (ăn uống, thăm bạn bè, giải trí)' },
  { id: 'night', name: 'Qua đêm', startTime: '00:00', endTime: '06:00', description: 'Đỗ xe qua đêm (khuya đến sáng sớm)' },
];

const ChooseTime: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ChooseTime'>>();
  
  const { type = 'daily' } = route.params || {}; // Nhận type từ params (daily hoặc monthly)

  const [selectedStartDate, setSelectedStartDate] = useState(new Date());
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);

  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const years = ['2025'];

  const formatDate = (date: Date): string => {
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  const validateDate = (date: Date): boolean => {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < currentDate) {
      Alert.alert(
        "Lỗi",
        `Ngày ${selectedDate.getDate()}/${selectedDate.getMonth() + 1}/${selectedDate.getFullYear()} không hợp lệ. Vui lòng chọn ngày hiện tại hoặc tương lai.`,
        [{ text: "OK" }]
      );
      return false;
    }
    return true;
  };

  const handleDateChange = (newDate: Date) => {
    if (validateDate(newDate)) {
      setSelectedStartDate(newDate);
    }
  };

  const toggleTimeSlot = (slotId: string) => {
    // Kiểm tra nếu khung giờ đã được chọn
    if (selectedTimeSlots.includes(slotId)) {
      // Nếu đã chọn, loại bỏ khỏi danh sách
      setSelectedTimeSlots(selectedTimeSlots.filter(id => id !== slotId));
    } else {
      // Nếu chưa chọn, thêm vào danh sách
      setSelectedTimeSlots([...selectedTimeSlots, slotId]);
    }
  };

  // Tính thời gian bắt đầu và kết thúc dựa trên các khung giờ đã chọn
  const calculateTimeRange = () => {
    if (selectedTimeSlots.length === 0) return null;

    const selectedSlots = TIME_SLOTS.filter(slot => selectedTimeSlots.includes(slot.id));
    
    // Sắp xếp các khung giờ theo thứ tự thời gian
    const sortedSlots = [...selectedSlots].sort((a, b) => {
      const timeA = a.startTime.split(':').map(Number);
      const timeB = b.startTime.split(':').map(Number);
      
      // So sánh giờ
      if (timeA[0] !== timeB[0]) return timeA[0] - timeB[0];
      // Nếu giờ bằng nhau, so sánh phút
      return timeA[1] - timeB[1];
    });

    // Lấy thời gian bắt đầu từ khung giờ đầu tiên
    const startTimeStr = sortedSlots[0].startTime;
    
    // Lấy thời gian kết thúc từ khung giờ cuối cùng
    const endTimeStr = sortedSlots[selectedSlots.length - 1].endTime;

    // Tính tổng số giờ
    let totalHours = 0;
    selectedSlots.forEach(slot => {
      const [startHour, startMinute] = slot.startTime.split(':').map(Number);
      const [endHour, endMinute] = slot.endTime.split(':').map(Number);
      
      // Điều chỉnh giờ kết thúc nếu là 00:00 (tức là 24:00)
      const adjustedEndHour = endHour === 0 ? 24 : endHour;
      
      // Tính số giờ trong khung giờ này
      const hours = adjustedEndHour - startHour + (endMinute - startMinute) / 60;
      totalHours += hours;
    });

    return {
      startTime: startTimeStr,
      endTime: endTimeStr,
      durationText: `${Math.floor(totalHours)} giờ ${Math.round((totalHours % 1) * 60)} phút`
    };
  };

  const handleConfirm = () => {
    if (type === 'daily') {
      // Xử lý cho Vé Ngày
      if (selectedTimeSlots.length === 0) {
        Alert.alert('Thông báo', 'Vui lòng chọn ít nhất một khung giờ');
        return;
      }

      const timeRange = calculateTimeRange();
      if (!timeRange) return;

      const formattedDate = formatDate(selectedStartDate);

      // Chuẩn bị các khung giờ đã chọn để truyền qua
      const selectedSlotNames = TIME_SLOTS
        .filter(slot => selectedTimeSlots.includes(slot.id))
        .map(slot => slot.name)
        .join(', ');

      navigation.navigate('BookingScreen', {
        bookingDate: formattedDate,
        startTime: timeRange.startTime,
        endTime: timeRange.endTime,
        duration: timeRange.durationText,
        selectedTimeSlots: selectedTimeSlots.join(','), // Gửi danh sách ID của các khung giờ đã chọn
        selectedTimeSlotNames: selectedSlotNames, // Gửi tên của các khung giờ đã chọn
        ticketType: 'daily'
      });
    } else {
      // Xử lý cho Vé Tháng
      const formattedDate = formatDate(selectedStartDate);
      navigation.navigate('BookingScreen', {
        monthlyStartDate: selectedStartDate.toISOString(),
        ticketType: 'monthly'
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.content}>
          <View style={styles.dateSelectionCard}>
            <Text style={styles.sectionTitle}>Chọn thời gian</Text>

            {/* Chọn ngày */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>{type === 'daily' ? 'Ngày đặt chỗ' : 'Ngày bắt đầu'}</Text>
              <View style={styles.pickerRow}>
                <Picker
                  selectedValue={selectedStartDate.getDate().toString()}
                  onValueChange={(itemValue) => {
                    const newDate = new Date(selectedStartDate);
                    newDate.setDate(parseInt(itemValue));
                    handleDateChange(newDate);
                  }}
                  style={styles.picker}
                >
                  {days.map((day) => (
                    <Picker.Item key={day} label={day} value={day} />
                  ))}
                </Picker>
                <Picker
                  selectedValue={(selectedStartDate.getMonth() + 1).toString()}
                  onValueChange={(itemValue) => {
                    const newDate = new Date(selectedStartDate);
                    newDate.setMonth(parseInt(itemValue) - 1);
                    handleDateChange(newDate);
                  }}
                  style={styles.picker}
                >
                  {months.map((month) => (
                    <Picker.Item key={month} label={`Tháng ${month}`} value={month} />
                  ))}
                </Picker>
                <Picker
                  selectedValue={selectedStartDate.getFullYear().toString()}
                  onValueChange={(itemValue) => {
                    const newDate = new Date(selectedStartDate);
                    newDate.setFullYear(parseInt(itemValue));
                    handleDateChange(newDate);
                  }}
                  style={styles.picker}
                >
                  {years.map((year) => (
                    <Picker.Item key={year} label={year} value={year} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Hiển thị các khung giờ cố định cho Vé Ngày, cho phép chọn nhiều */}
            {type === 'daily' && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Chọn khung giờ (có thể chọn nhiều)</Text>
                <View style={styles.timeSlotContainer}>
                  {TIME_SLOTS.map((slot) => (
                    <TouchableOpacity
                      key={slot.id}
                      style={[
                        styles.timeSlotCard,
                        selectedTimeSlots.includes(slot.id) && styles.selectedTimeSlot
                      ]}
                      onPress={() => toggleTimeSlot(slot.id)}
                    >
                      <View style={styles.timeSlotHeader}>
                        <Text style={[
                          styles.timeSlotName,
                          selectedTimeSlots.includes(slot.id) && styles.selectedTimeSlotText
                        ]}>
                          {slot.name}
                        </Text>
                        {selectedTimeSlots.includes(slot.id) && (
                          <View style={styles.checkmarkContainer}>
                            <Text style={styles.checkmark}>✓</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[
                        styles.timeSlotTime,
                        selectedTimeSlots.includes(slot.id) && styles.selectedTimeSlotText
                      ]}>
                        {slot.startTime} - {slot.endTime}
                      </Text>
                      <Text style={[
                        styles.timeSlotDescription,
                        selectedTimeSlots.includes(slot.id) && styles.selectedTimeSlotText
                      ]}>
                        {slot.description}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {selectedTimeSlots.length > 0 && (
                  <View style={styles.selectedSummary}>
                    <Text style={styles.selectedSummaryTitle}>Khung giờ đã chọn:</Text>
                    <Text style={styles.selectedSummaryText}>
                      {TIME_SLOTS
                        .filter(slot => selectedTimeSlots.includes(slot.id))
                        .map(slot => slot.name)
                        .join(', ')}
                    </Text>
                    {calculateTimeRange() && (
                      <Text style={styles.durationText}>
                        Tổng thời gian: {calculateTimeRange()?.durationText}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity 
              style={[
                styles.confirmButton, 
                (type === 'daily' && selectedTimeSlots.length === 0) && styles.disabledButton
              ]} 
              onPress={handleConfirm}
              disabled={type === 'daily' && selectedTimeSlots.length === 0}
            >
              <Text style={styles.confirmButtonText}>Xác nhận thời gian đặt</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa' 
  },
  content: { 
    padding: 16 
  },
  dateSelectionCard: { 
    backgroundColor: '#f1f5f9', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 24 
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    marginBottom: 16, 
    color: '#333' 
  },
  formGroup: { 
    marginBottom: 16 
  },
  label: { 
    fontSize: 14, 
    marginBottom: 8, 
    color: '#555' 
  },
  pickerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between' 
  },
  picker: { 
    flex: 1, 
    height: 50 
  },
  timeSlotContainer: {
    marginTop: 8,
  },
  timeSlotCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  timeSlotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  selectedTimeSlot: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  timeSlotName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timeSlotTime: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  timeSlotDescription: {
    fontSize: 12,
    color: '#666',
  },
  selectedTimeSlotText: {
    color: '#fff',
  },
  checkmarkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectedSummary: {
    marginTop: 16,
    backgroundColor: '#e6f7ff',
    padding: 12,
    borderRadius: 8,
  },
  selectedSummaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0077cc',
    marginBottom: 4,
  },
  selectedSummaryText: {
    fontSize: 14,
    color: '#0077cc',
  },
  durationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0077cc',
    marginTop: 8,
  },
  confirmButton: {
    backgroundColor: 'black',
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 16,
  },
  disabledButton: {
    backgroundColor: '#999',
    opacity: 0.7,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChooseTime;