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

const { width } = Dimensions.get('window');

interface ParkingSpot {
  id: number;
  code: string;
  status: 'available' | 'occupied' | 'reserved';
  position: { row: number; col: number };
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
    pricePerHour = 8000,
    bookingDate = '',
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

  useEffect(() => {
    // Parse zoneData from JSON string
    if (zoneData) {
      try {
        const parsedSpots = JSON.parse(zoneData);
        console.log('Parsed spots:', parsedSpots);
        setSpots(parsedSpots);
        
        // Tìm số hàng và cột tối đa dựa trên dữ liệu thực tế
        if (parsedSpots && parsedSpots.length > 0) {
          let maxRow = 0;
          let maxCol = 0;
          
          parsedSpots.forEach((spot: ParkingSpot) => {
            if (spot.position.row > maxRow) maxRow = spot.position.row;
            if (spot.position.col > maxCol) maxCol = spot.position.col;
          });
          
          // Thêm 1 vì index bắt đầu từ 0
          setMaxRows(maxRow + 1);
          setMaxCols(maxCol + 1);
          
          console.log('Grid dimensions:', { rows: maxRow + 1, cols: maxCol + 1, totalSpots: parsedSpots.length });
        }
      } catch (error) {
        console.error('Error parsing spots data:', error);
        Alert.alert('Lỗi', 'Không thể hiển thị sơ đồ khu vực');
      }
    }
  }, [zoneData]);

  // Xử lý chọn chỗ
  const handleSpotSelection = (spot: ParkingSpot) => {
    if (spot.status === 'available') {
      setSelectedSpot(spot);
      
      // Tính giá cho vị trí cụ thể (có thể thay đổi dựa trên vị trí - ví dụ có thể có các vị trí VIP đắt hơn)
      // Đây chỉ là ví dụ - trong thực tế bạn có thể thay đổi logic này
      const positionMultiplier = 1 + (spot.position.row * 0.05); // Hàng càng xa càng đắt
      const calculatedPrice = Math.ceil(totalPrice * positionMultiplier / 1000) * 1000;
      setSpotPrice(calculatedPrice);
    } else {
      Alert.alert('Không khả dụng', 'Vị trí này đã được đặt hoặc đang bảo trì.');
    }
  };

  // Handle selection confirmation
  const handleConfirmSelection = async () => {
    if (selectedSpot) {
      setIsLoading(true);

      try {
        // Chuyển thẳng về màn hình booking với action proceed_to_payment và giá cho vị trí đỗ xe
        navigation.navigate('BookingScreen', {
          selectedSpotId: selectedSpot.id, 
          selectedZoneId: zoneId,
          selectedSpotCode: selectedSpot.code,
          action: 'proceed_to_payment',
          pricePerSpot: spotPrice
        });
      } catch (error) {
        console.error('Error confirming spot selection:', error);
        Alert.alert('Lỗi', 'Không thể xác nhận chỗ đặt. Vui lòng thử lại.');
      } finally {
        setIsLoading(false);
      }
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
        
        {/* Hiển thị thông tin thời gian đã chọn */}
        {bookingDate && (
          <View style={styles.bookingInfoContainer}>
            <Text style={styles.bookingInfoText}>
              Ngày: {bookingDate} • Thời gian: {startTime} - {endTime}
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
            <View style={[styles.legendColor, styles.availableColor]} />
            <Text>Còn trống</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, styles.occupiedColor]} />
            <Text>Đã sử dụng</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, styles.reservedColor]} />
            <Text>Đã đặt trước</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, styles.selectedColor]} />
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
                    
                    const isSelected = selectedSpot && selectedSpot.id === spot.id;
                    
                    return (
                      <TouchableOpacity
                        key={`spot-${spot.id}`}
                        style={[
                          styles.parkingSpot,
                          spot.status === 'occupied' && styles.occupiedSpot,
                          spot.status === 'reserved' && styles.reservedSpot,
                          isSelected && styles.selectedSpot
                        ]}
                        onPress={() => handleSpotSelection(spot)}
                        disabled={spot.status !== 'available'}
                      >
                        <Text style={[
                          styles.spotText,
                          isSelected && styles.selectedSpotText
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
  },
  reservedColor: {
    backgroundColor: '#fcd34d',
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
  reservedSpot: {
    backgroundColor: '#fcd34d',
    borderColor: '#f59e0b',
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