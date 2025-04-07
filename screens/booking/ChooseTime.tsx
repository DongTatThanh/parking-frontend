import React, { useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';

const ChooseTime: React.FC = () => {
  const navigation = useNavigation();
  const [selectedStartDate, setSelectedStartDate] = useState(new Date());
  const [selectedEndDate, setSelectedEndDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const years = ['2025', '2026', '2027'];
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];

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
      setSelectedEndDate(newDate);
    }
  };

  const handleConfirm = () => {
    if (!validateDate(selectedStartDate)) {
      return;
    }
    
    if (!validateTimeRange()) {
      return;
    }

    // Xử lý logic xác nhận đặt chỗ ở đây
    console.log('Thời gian bắt đầu:', selectedStartDate);
    console.log('Thời gian kết thúc:', selectedEndDate);
    
    navigation.navigate('BookingScreen' as never);
  };

  const handleEndTimeChange = (hours: number, minutes: number) => {
    const newEndDate = new Date(selectedEndDate);
    newEndDate.setHours(hours, minutes);
    setSelectedEndDate(newEndDate);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.content}>
          <View style={styles.dateSelectionCard}>
            <Text style={styles.sectionTitle}>Chọn thời gian</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Ngày đặt chỗ</Text>
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

            <TouchableOpacity  style={styles.confirmButton} onPress={handleConfirm}>
              <Text style={styles.confirmButtonText}>Xác nhận thời gian đặt </Text>
            
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
    borderRadius:30,
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

