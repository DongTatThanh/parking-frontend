import React, { useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../Navigation/types';

const ChooseTime: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ChooseTime'>>();
  
  const { type = 'daily' } = route.params || {}; // Nhận type từ params (daily hoặc monthly)

  const [selectedStartDate, setSelectedStartDate] = useState(new Date());
  const [selectedEndDate, setSelectedEndDate] = useState(new Date());

  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const years = ['2025', '2026', '2027'];
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];

  const formatDate = (date: Date): string => {
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
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

  const validateTimeRange = (): boolean => {
    const diffInMinutes = (selectedEndDate.getTime() - selectedStartDate.getTime()) / (1000 * 60);
    
    if (diffInMinutes < 60) {
      Alert.alert(
        "Lỗi",
        "Thời gian đặt chỗ phải từ 1 tiếng trở lên",
        [{ text: "OK" }]
      );
      return false;
    }
    return true;
  };

  const handleDateChange = (newDate: Date) => {
    if (validateDate(newDate)) {
      setSelectedStartDate(newDate);
      setSelectedEndDate(newDate); // Đồng bộ ngày cho thời gian kết thúc
    }
  };

  const handleEndTimeChange = (hours: number, minutes: number) => {
    const newEndDate = new Date(selectedEndDate);
    newEndDate.setHours(hours, minutes);
    setSelectedEndDate(newEndDate);
  };

  const handleConfirm = () => {
    if (type === 'daily') {
      // Xử lý cho Vé Ngày
      if (!validateTimeRange()) {
        return;
      }

      const formattedDate = formatDate(selectedStartDate);
      const formattedStartTime = formatTime(selectedStartDate);
      const formattedEndTime = formatTime(selectedEndDate);
      
      const totalMinutes = Math.round((selectedEndDate.getTime() - selectedStartDate.getTime()) / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const durationText = `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;

      navigation.navigate('BookingScreen', {
        bookingDate: formattedDate,
        startTime: formattedStartTime,
        endTime: formattedEndTime,
        duration: durationText,
      });
    } else {
      // Xử lý cho Vé Tháng
      const formattedDate = formatDate(selectedStartDate);
      navigation.navigate('BookingScreen', {
        monthlyStartDate: selectedStartDate.toISOString(),
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

            {/* Chỉ hiển thị chọn giờ nếu là Vé Ngày */}
            {type === 'daily' && (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Thời gian bắt đầu</Text>
                  <View style={styles.pickerRow}>
                    <Picker
                      selectedValue={selectedStartDate.getHours().toString().padStart(2, '0')}
                      onValueChange={(itemValue) => setSelectedStartDate(new Date(selectedStartDate.setHours(parseInt(itemValue))))}
                      style={styles.picker}
                    >
                      {hours.map((hour) => (
                        <Picker.Item key={hour} label={hour} value={hour} />
                      ))}
                    </Picker>
                    <Picker
                      selectedValue={selectedStartDate.getMinutes().toString().padStart(2, '0')}
                      onValueChange={(itemValue) => setSelectedStartDate(new Date(selectedStartDate.setMinutes(parseInt(itemValue))))}
                      style={styles.picker}
                    >
                      {minutes.map((minute) => (
                        <Picker.Item key={minute} label={minute} value={minute} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Thời gian kết thúc</Text>
                  <View style={styles.pickerRow}>
                    <Picker
                      selectedValue={selectedEndDate.getHours().toString().padStart(2, '0')}
                      onValueChange={(itemValue) => handleEndTimeChange(parseInt(itemValue), selectedEndDate.getMinutes())}
                      style={styles.picker}
                    >
                      {hours.map((hour) => (
                        <Picker.Item key={hour} label={hour} value={hour} />
                      ))}
                    </Picker>
                    <Picker
                      selectedValue={selectedEndDate.getMinutes().toString().padStart(2, '0')}
                      onValueChange={(itemValue) => handleEndTimeChange(selectedEndDate.getHours(), parseInt(itemValue))}
                      style={styles.picker}
                    >
                      {minutes.map((minute) => (
                        <Picker.Item key={minute} label={minute} value={minute} />
                      ))}
                    </Picker>
                  </View>
                </View>
              </>
            )}

            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
              <Text style={styles.confirmButtonText}>Xác nhận thời gian đặt</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16 },
  dateSelectionCard: { backgroundColor: '#f1f5f9', borderRadius: 16, padding: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16, color: '#333' },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, marginBottom: 8, color: '#555' },
  pickerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  picker: { flex: 1, height: 50 },
  confirmButton: {
    backgroundColor: 'black',
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 16,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChooseTime;