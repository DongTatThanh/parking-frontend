import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../Navigation/types';

const InsuranceScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const insuranceOptions = [
    {
      id: '1',
      title: 'Bảo hiểm Trách nhiệm dân sự',
      description: 'Bảo hiểm bắt buộc theo quy định của pháp luật cho tất cả các phương tiện tham gia giao thông.',
      price: 'Từ 300.000 VND/năm',
      image: require('../assets/images/a.jpg')
    },
    {
      id: '2',
      title: 'Bảo hiểm Vật chất xe',
      description: 'Bảo hiểm toàn diện cho xe của bạn trong trường hợp tai nạn, trộm cắp, cháy nổ.',
      price: 'Từ 2.000.000 VND/năm',
      image: require('../assets/images/logo1.png')
    },
    {
      id: '3',
      title: 'Bảo hiểm Tai nạn người ngồi trên xe',
      description: 'Bảo hiểm cho người lái xe và hành khách trong trường hợp xảy ra tai nạn.',
      price: 'Từ 150.000 VND/năm',
      image: require('../assets/images/logo1.png')
    },
    {
      id: '4',
      title: 'Bảo hiểm Mất cắp phụ tùng',
      description: 'Bảo hiểm cho các phụ tùng, thiết bị gắn thêm trên xe khi bị mất cắp.',
      price: 'Từ 500.000 VND/năm',
      image: require('../assets/images/logo1.png')
    },
  ];

  const handleContactPress = () => {
    Linking.openURL('tel:+84123456789');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#9b87f5" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bảo Hiểm Xe</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroOverlay} />
          <Image 
            source={require('../assets/images/logo1.png')} 
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Bảo Vệ Xe Của Bạn</Text>
            <Text style={styles.heroSubtitle}>An tâm trên mọi hành trình</Text>
          </View>
        </View>
        
        {/* Introduction */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Giới Thiệu Dịch Vụ</Text>
          <Text style={styles.introText}>
            Chúng tôi hợp tác với các công ty bảo hiểm hàng đầu để cung cấp các gói 
            bảo hiểm xe ô tô toàn diện với mức giá cạnh tranh. Bảo vệ xe của bạn 
            và tận hưởng sự an tâm trên mọi hành trình.
          </Text>
        </View>
        
        {/* Insurance Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Các Gói Bảo Hiểm</Text>
          
          {insuranceOptions.map((option) => (
            <View key={option.id} style={styles.insuranceCard}>
              <Image 
                source={option.image} 
                style={styles.insuranceImage}
                resizeMode="contain"
              />
              <View style={styles.insuranceContent}>
                <Text style={styles.insuranceTitle}>{option.title}</Text>
                <Text style={styles.insuranceDescription}>{option.description}</Text>
                <Text style={styles.insurancePrice}>{option.price}</Text>
                <TouchableOpacity 
                  style={styles.contactButton}
                  onPress={handleContactPress}
                >
                  <Text style={styles.contactButtonText}>Liên Hệ Ngay</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
        
        {/* Benefits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lợi Ích Của Bảo Hiểm Xe</Text>
          <View style={styles.benefitRow}>
            <View style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <Text style={styles.benefitIconText}>✓</Text>
              </View>
              <Text style={styles.benefitText}>Bồi thường nhanh chóng</Text>
            </View>
            
            <View style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <Text style={styles.benefitIconText}>✓</Text>
              </View>
              <Text style={styles.benefitText}>Hỗ trợ 24/7</Text>
            </View>
          </View>
          
          <View style={styles.benefitRow}>
            <View style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <Text style={styles.benefitIconText}>✓</Text>
              </View>
              <Text style={styles.benefitText}>Mạng lưới gara rộng khắp</Text>
            </View>
            
            <View style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <Text style={styles.benefitIconText}>✓</Text>
              </View>
              <Text style={styles.benefitText}>Chi phí hợp lý</Text>
            </View>
          </View>
        </View>
        
        {/* Contact Section */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Bạn Cần Tư Vấn?</Text>
          <Text style={styles.contactDescription}>
            Chuyên gia bảo hiểm của chúng tôi sẵn sàng giải đáp mọi thắc mắc và 
            tư vấn gói bảo hiểm phù hợp với nhu cầu của bạn.
          </Text>
          <TouchableOpacity 
            style={styles.callButton}
            onPress={handleContactPress}
          >
            <Text style={styles.callButtonText}>Gọi Ngay: 0123 456 789</Text>
          </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#9b87f5',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  placeholder: {
    width: 40,
  },
  heroBanner: {
    height: 200,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 1,
  },
  heroContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  section: {
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#9b87f5',
  },
  introText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#555',
  },
  insuranceCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  insuranceImage: {
    width: 80,
    height: 80,
    marginRight: 16,
  },
  insuranceContent: {
    flex: 1,
  },
  insuranceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  insuranceDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  insurancePrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#9b87f5',
    marginBottom: 10,
  },
  contactButton: {
    backgroundColor: '#7E69AB',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  contactButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  benefitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
  },
  benefitIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#9b87f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  benefitIconText: {
    color: 'white',
    fontWeight: 'bold',
  },
  benefitText: {
    fontSize: 14,
    color: '#555',
    flex: 1,
  },
  contactSection: {
    backgroundColor: '#E5DEFF',
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  contactDescription: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  callButton: {
    backgroundColor: '#9b87f5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  callButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default InsuranceScreen;