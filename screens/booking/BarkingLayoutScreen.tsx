import React, { useState } from 'react';
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
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../Navigation/types';

const { width } = Dimensions.get('window');

// Mock parking spots data
const generateParkingSpots = (zoneId: string, count: number) => {
  const spots = [];
  
  // Randomly assign availability status
  for (let i = 1; i <= count; i++) {
    const spotId = `${zoneId}${i.toString().padStart(2, '0')}`;
    const isAvailable = Math.random() > 0.4; // 60% available
    const isDisabled = Math.random() > 0.9; // 10% disabled parking 
    
    spots.push({
      id: spotId,
      isAvailable,
      isDisabled,
      isSelected: false,
    });
  }
  
  return spots;
};

// Parking zones data with corresponding number of spots
const parkingZonesSpots: Record<string, number> = {
  "A": 24,
  "B": 18,
  "C": 30,
  "D": 16,
  "E": 20,
};

type ParkingSpot = {
  id: string;
  isAvailable: boolean;
  isDisabled: boolean;
  isSelected: boolean;
};

type ParkingLayoutScreenRouteProp = RouteProp<RootStackParamList, 'BarkingLayoutScreen'>

const ParkingLayoutScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<ParkingLayoutScreenRouteProp>();
  const { zoneId } = route.params;
  
  // Generate spots for the selected zone
  const spotCount = parkingZonesSpots[zoneId] || 20;
  const [parkingSpots, setParkingSpots] = useState<ParkingSpot[]>(
    generateParkingSpots(zoneId, spotCount)
  );
  
  // Handle spot selection
  const handleSpotSelection = (spotId: string) => {
    const updatedSpots = parkingSpots.map(spot => {
      if (spot.id === spotId) {
        if (!spot.isAvailable) {
          Alert.alert("Không khả dụng", "Vị trí đỗ xe này đã được đặt.");
          return spot;
        }
        return { ...spot, isSelected: !spot.isSelected };
      } else {
        return { ...spot, isSelected: false };
      }
    });
    
    setParkingSpots(updatedSpots);
  };
  
  // Get selected spot
  const selectedSpot = parkingSpots.find(spot => spot.isSelected);
  
  // Calculate layout rows and columns
  const columns = Math.ceil(Math.sqrt(spotCount));
  const rows = Math.ceil(spotCount / columns);
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← </Text>Back
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Sơ đồ khu {zoneId}</Text>
          <Text style={styles.headerSubtitle}>
            Chọn vị trí đỗ xe của bạn
          </Text>
        </View>
        
        <View style={styles.content}>
          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendIcon, styles.availableIcon]} />
              <Text style={styles.legendText}>Còn trống</Text>
            </View>
            
            <View style={styles.legendItem}>
              <View style={[styles.legendIcon, styles.occupiedIcon]} />
              <Text style={styles.legendText}>Đã đặt</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendIcon, styles.selectedIcon]} />
              <Text style={styles.legendText}>Đã chọn</Text>
            </View>
          </View>
          
          {/* Parking Map */}
          <View style={styles.parkingMap}>
            <View style={styles.entranceSign}>
              <Text style={styles.entranceText}>Lối vào</Text>
            </View>
            
            <View style={styles.parkingGrid}>
              {Array.from({ length: rows }).map((_, rowIndex) => (
                <View key={`row-${rowIndex}`} style={styles.parkingRow}>
                  {Array.from({ length: columns }).map((_, colIndex) => {
                    const spotIndex = rowIndex * columns + colIndex;
                    
                    // Check if spot exists
                    if (spotIndex >= parkingSpots.length) {
                      return <View key={`empty-${colIndex}`} style={styles.emptySpot} />;
                    }
                    
                    const spot = parkingSpots[spotIndex];
                    
                    return (
                      <TouchableOpacity
                        key={spot.id}
                        style={[
                          styles.parkingSpot,
                          !spot.isAvailable && styles.occupiedSpot,
                          spot.isDisabled && styles.disabledSpot,
                          spot.isSelected && styles.selectedSpot,
                        ]}
                        onPress={() => handleSpotSelection(spot.id)}
                        disabled={!spot.isAvailable}
                      >
                        <Text style={styles.spotLabel}>{spot.id}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
          
          {/* Booking Details */}
          <View style={styles.bookingDetails}>
            <Text style={styles.detailsTitle}>Chi tiết đặt chỗ</Text>
            
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Khu vực:</Text>
              <Text style={styles.detailsValue}>Khu {zoneId}</Text>
            </View>
            
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Vị trí:</Text>
              <Text style={styles.detailsValue}>
                {selectedSpot ? selectedSpot.id : "Chưa chọn"}
              </Text>
            </View>
            
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Thời gian:</Text>
              <Text style={styles.detailsValue}>
                {new Date().toLocaleDateString()} - 08:00
              </Text>
            </View>
            
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Giá:</Text>
              <Text style={styles.detailsValue}>15.000 VND/giờ</Text>
            </View>
            
            <TouchableOpacity 
              style={[
                styles.confirmButton,
                !selectedSpot && styles.confirmButtonDisabled
              ]}
              disabled={!selectedSpot}
              onPress={() => {
                Alert.alert(
                  "Xác nhận đặt chỗ",
                  `Bạn đã chọn vị trí ${selectedSpot?.id}. Xác nhận đặt chỗ?`,
                  [
                    {
                      text: "Hủy",
                      style: "cancel"
                    },
                    { 
                      text: "Xác nhận", 
                      onPress: () => {   
                        navigation.navigate("PaymentScreen", {
                          spotId: "spot-123",
                          bookingCode: "BC-113",
                          userName: "Người dùng",
                          phone: "0123456789",
                          bookingTime: new Date().toISOString(),
                          ticketType: "Tiêu chuẩn",
                          expiryTime: new Date(Date.now() + 3600000).toISOString(),
                          totalAmount: 5000
                          
                        });
                      }
                    }
                  ]
                );
              }}
              >
              <Text style={styles.confirmButtonText}>
                {selectedSpot ? "Xác nhận đặt chỗ" : "Vui lòng chọn vị trí"}
              </Text>
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    padding: 16,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    width: '48%',
  },
  legendIcon: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 8,
  },
  availableIcon: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  occupiedIcon: {
    backgroundColor: '#d1d5db',
  },
  disabledIcon: {
    backgroundColor: '#3b82f6',
  },
  selectedIcon: {
    backgroundColor: '#10b981',
  },
  legendText: {
    fontSize: 12,
    color: '#555',
  },
  parkingMap: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  entranceSign: {
    backgroundColor: '#3b82f6',
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 20,
  },
  entranceText: {
    color: '#fff',
    fontWeight: '600',
  },
  parkingGrid: {
    alignItems: 'center',
  },
  parkingRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  parkingSpot: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 4,
    margin: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  occupiedSpot: {
    backgroundColor: '#d1d5db',
    borderColor: '#d1d5db',
  },
  disabledSpot: {
    backgroundColor: '#fff',
    borderColor: '#3b82f6',
  },
  selectedSpot: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  spotLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptySpot: {
    width: 50,
    height: 50,
    margin: 4,
    backgroundColor: 'transparent',
  },
  bookingDetails: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 16,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailsLabel: {
    fontSize: 15,
    color: '#555',
  },
  detailsValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  confirmButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  confirmButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ParkingLayoutScreen;