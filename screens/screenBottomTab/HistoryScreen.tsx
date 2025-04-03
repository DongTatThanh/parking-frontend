import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';

type HistoryItem = {
  id: string;
  date: string;
  parkingZone: string;
  duration: string;
  cost: string;
  status: 'completed' | 'cancelled' | 'ongoing';
};

const historyData: HistoryItem[] = [
  {
    id: '1',
    date: '24/03/2025',
    parkingZone: 'Khu A',
    duration: '2 giờ',
    cost: '40.000đ',
    status: 'completed',
  },
  {
    id: '2',
    date: '22/03/2025',
    parkingZone: 'Khu B',
    duration: '3 giờ',
    cost: '60.000đ',
    status: 'completed',
  },
  {
    id: '3',
    date: '20/03/2025',
    parkingZone: 'Khu D',
    duration: '1 giờ',
    cost: '20.000đ',
    status: 'cancelled',
  },
  {
    id: '4',
    date: '18/03/2025',
    parkingZone: 'Khu C',
    duration: '5 giờ',
    cost: '100.000đ',
    status: 'completed',
  },
];
const HistoryScreen: React.FC = () => {
  const renderHistoryItem = ({ item }: { item: HistoryItem }) => {
    const statusColor = item.status === 'completed' 
      ? '#4CAF50' 
      : item.status === 'ongoing' 
        ? '#2196F3' 
        : '#F44336';
        
    return (
      <View style={styles.historyCard}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyDate}>{item.date}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>
              {item.status === 'completed' ? 'Hoàn thành' : 
               item.status === 'ongoing' ? 'Đang diễn ra' : 'Đã hủy'}
            </Text>
          </View>
        </View>
        
        <View style={styles.historyDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Khu vực:</Text>
            <Text style={styles.detailValue}>{item.parkingZone}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Thời gian:</Text>
            <Text style={styles.detailValue}>{item.duration}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Chi phí:</Text>
            <Text style={styles.detailValue}>{item.cost}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lịch sử đỗ xe</Text>
      </View>
      
      <FlatList
        data={historyData}
        renderItem={renderHistoryItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: 'black',
    padding: 16,
    paddingTop: 24,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  historyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 8,
  },

historyDate: {
  fontSize: 16,
  fontWeight: 'bold',
},
statusBadge: {
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 4,
},
statusText: {
  color: 'white',
  fontSize: 12,
  fontWeight: 'bold',
},
historyDetails: {
  marginTop: 8,
},
detailRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 8,
},
detailLabel: {
  color: '#757575',
  fontSize: 14,
},
detailValue: {
  fontSize: 14,
  fontWeight: '500',
},
});

export default HistoryScreen;