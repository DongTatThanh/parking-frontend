import React, { useEffect, useState } from 'react';
import { View, Text, Image, ActivityIndicator, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import api from '../../api/axiosConfig';
import { useRoute } from '@react-navigation/native';

const BookingConfirmationScreen = () => {
  const route = useRoute<any>();
  const { bookingId, spotCode, zoneId, bookingDate, startTime, endTime, duration, bookingType, totalPrice, licensePlate, phoneNumber, userName } = route.params || {};
  const [qrData, setQrData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const fetchQr = async () => {
      try {
        if (!bookingId) {
          setLoading(false);
          return;
        }
        console.log('Fetching QR code for booking ID:', bookingId);
        const res = await api.get(`/bookings/invoice/${bookingId}`);
        console.log('QR code API response:', JSON.stringify(res.data));
        
        // Check for QR code in different possible locations in the response
        const qrCode = res.data?.qrCode || res.data?.qrcode || 
                       res.data?.data?.qrCode || res.data?.data?.qrcode ||
                       res.data?.bookingDetails?.qr_code;
                       
        if (qrCode) {
          // Check if it's already a data URI (base64)
          if (qrCode.startsWith('data:image')) {
            setQrData(qrCode);
          } else {
            // If it's just a code/identifier, it might need to be requested as an image
            setQrData(`data:image/png;base64,${qrCode}`);
          }
        } else {
          console.error('QR code not found in response:', res.data);
          setQrData(null);
        }
      } catch (e) {
        console.error('Error fetching QR code:', e);
        setQrData(null);
        Alert.alert('Lỗi', 'Không thể lấy mã QR. Hãy chắc chắn bạn đã thanh toán thành công!');
      } finally {
        setLoading(false);
      }
    };
    fetchQr();
  }, [bookingId]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Xác nhận đặt chỗ</Text>
      <View style={styles.infoBox}>
        <Text style={styles.label}>Mã đặt chỗ: <Text style={styles.value}>{bookingId}</Text></Text>
        <Text style={styles.label}>Vị trí: <Text style={styles.value}>{spotCode}, Khu {zoneId}</Text></Text>
        <Text style={styles.label}>Ngày đặt: <Text style={styles.value}>{bookingDate}</Text></Text>
        <Text style={styles.label}>Thời gian: <Text style={styles.value}>{startTime} - {endTime}</Text></Text>
        {duration && <Text style={styles.label}>Thời lượng: <Text style={styles.value}>{duration}</Text></Text>}
        <Text style={styles.label}>Loại vé: <Text style={styles.value}>{bookingType === 'daily' ? 'Vé ngày' : 'Vé tháng'}</Text></Text>
        <Text style={styles.label}>Tổng tiền: <Text style={styles.value}>{totalPrice?.toLocaleString()} VND</Text></Text>
        {licensePlate && <Text style={styles.label}>Biển số xe: <Text style={styles.value}>{licensePlate}</Text></Text>}
        {phoneNumber && <Text style={styles.label}>SĐT: <Text style={styles.value}>{phoneNumber}</Text></Text>}
        {userName && <Text style={styles.label}>Tên KH: <Text style={styles.value}>{userName}</Text></Text>}
      </View>
      <Text style={styles.qrTitle}>Mã QR Check-in/Check-out</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" />
      ) : qrData ? (
        <Image source={{ uri: qrData }} style={styles.qrImage} resizeMode="contain" />
      ) : (
        <Text style={styles.qrError}>Không thể tải mã QR. Vui lòng kiểm tra trạng thái thanh toán!</Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: '#fff', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  infoBox: { backgroundColor: '#f1f1f1', borderRadius: 12, padding: 16, marginBottom: 24, width: '100%' },
  label: { fontSize: 16, color: '#333', marginBottom: 4 },
  value: { fontWeight: 'bold', color: '#222' },
  qrTitle: { fontSize: 20, fontWeight: '600', marginBottom: 12, color: '#333', textAlign: 'center' },
  qrImage: { width: 220, height: 220, alignSelf: 'center', marginBottom: 12 },
  qrError: { color: '#ef4444', fontSize: 15, textAlign: 'center', marginTop: 12 },
  qrErrorContainer: { alignItems: 'center', padding: 16 },
  retryButton: { 
    backgroundColor: '#3b82f6', 
    paddingVertical: 8, 
    paddingHorizontal: 16, 
    borderRadius: 8, 
    marginTop: 12 
  },
  retryButtonText: { color: '#fff', fontWeight: 'bold' },
});

export default BookingConfirmationScreen;