import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../Navigation/types';

const { width } = Dimensions.get('window');

// Placeholder image - replace with actual images
const placeholderImage = require('../../assets/images/a.jpg');

// Service data
const servicesData: Record<string, {
  id: string;
  title: string;
  description: string;
  features: string[];
  image: any;
}> = {
  "1": {
    id: "1",
    title: "Sửa xe tận nơi",
    description: "Dịch vụ sửa chữa xe tận nơi cho khách hàng gặp sự cố trên đường.",
    features: [
      "Sửa chữa nhanh chóng trong vòng 30 phút",
      "Kỹ thuật viên chuyên nghiệp, nhiều năm kinh nghiệm",
      "Phục vụ 24/7 kể cả ngày lễ",
      "Bảo hành dịch vụ lên đến 30 ngày"
    ],
    image: placeholderImage
  },
  "2": {
    id: "2",
    title: "Bảo dưỡng xe",
    description: "Dịch vụ bảo dưỡng xe định kỳ giúp xe của bạn luôn trong tình trạng tốt nhất.",
    features: [
      "Kiểm tra toàn diện các hệ thống của xe",
      "Thay thế phụ tùng chính hãng",
      "Tư vấn lịch bảo dưỡng phù hợp",
      "Rửa xe miễn phí sau khi bảo dưỡng"
    ],
    image: placeholderImage
  },
  "3": {
    id: "3",
    title: "Rửa xe tại nhà",
    description: "Dịch vụ rửa xe tại nhà tiện lợi, tiết kiệm thời gian cho bạn.",
    features: [
      "Đội ngũ nhân viên chuyên nghiệp",
      "Sử dụng thiết bị và hóa chất cao cấp",
      "Đặt lịch linh hoạt theo yêu cầu",
      "Đảm bảo xe sạch bóng như mới"
    ],
    image: placeholderImage
  },
  "4": {
    id: "4",
    title: "Thay nhớt tận nơi",
    description: "Dịch vụ thay nhớt tận nơi với các loại nhớt chính hãng, chất lượng cao.",
    features: [
      "Sử dụng nhớt chính hãng, chất lượng cao",
      "Thay lọc nhớt, lọc gió kèm theo",
      "Kiểm tra các hệ thống khác miễn phí",
      "Tư vấn lịch thay nhớt tiếp theo"
    ],
    image: placeholderImage
  }
};

type ServicesScreenRouteProp = RouteProp<RootStackParamList, 'ServicesScreen'>;

const ServicesScreen: React.FC = () => {
  const route = useRoute<ServicesScreenRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { id } = route.params;
  
  const service = servicesData[id];
  
  if (!service) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Dịch vụ không tồn tại</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Get other services for "other services" section
  const otherServices = Object.values(servicesData)
    .filter(item => item.id !== id)
    .slice(0, 3);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Quay lại</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.contentContainer}>
          <View style={styles.imageContainer}>
            <Image 
              source={service.image} 
              style={styles.serviceImage} 
              resizeMode="cover"

              />
              <View style={styles.imageOverlay} />
            </View>
            
            <View style={styles.detailsContainer}>
              <Text style={styles.serviceTitle}>{service.title}</Text>
              <Text style={styles.serviceDescription}>{service.description}</Text>
              
              <View style={styles.featuresCard}>
                <Text style={styles.featuresTitle}>Tính năng nổi bật</Text>
                
                {service.features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <View style={styles.featureIcon}>
                      <Text style={styles.checkIcon}>✓</Text>
                    </View>
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
              
              <TouchableOpacity style={styles.registerButton}>
                <Text style={styles.registerButtonText}>Đăng ký dịch vụ</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.otherServicesContainer}>
              <Text style={styles.otherServicesTitle}>Dịch vụ khác</Text>
              
              <View style={styles.otherServicesGrid}>
                {otherServices.map((item) => (
                  <TouchableOpacity 
                    key={item.id}
                    style={styles.otherServiceCard}
                    onPress={() => navigation.replace('ServicesScreen', { id: item.id })}
                  >
                    <Image 
                      source={item.image} 
                      style={styles.otherServiceImage}
                      resizeMode="cover"
                    />
                    <Text style={styles.otherServiceTitle}>{item.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.ctaContainer}>
              <Text style={styles.ctaTitle}>Sẵn sàng để trải nghiệm dịch vụ?</Text>
              <Text style={styles.ctaDescription}>
                Đăng ký ngay hôm nay để nhận ưu đãi đặc biệt dành cho khách hàng mới
              </Text>
              <TouchableOpacity style={styles.ctaButton}>
                <Text style={styles.ctaButtonText}>Liên hệ ngay</Text>
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
    errorContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    errorText: {
      fontSize: 18,
      marginBottom: 20,
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backButton: {
      paddingVertical: 8,
    },
    backButtonText: {
      fontSize: 16,
      color: '#666',
    },
    contentContainer: {
      flex: 1,
    },
    imageContainer: {
      height: 250,
      position: 'relative',
    },
    serviceImage: {
      width: '100%',
      height: '100%',
    },
    imageOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
    },
    detailsContainer: {
      padding: 16,
    },
    serviceTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 8,
      color: '#333',
    },
    serviceDescription: {
      fontSize: 16,
      color: '#666',
      lineHeight: 24,
      marginBottom: 16,
    },
    featuresCard: {
      backgroundColor: '#f1f5f9',
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    featuresTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 12,
      color: '#333',
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 10,
    },
    featureIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#10b981',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      marginTop: 2,
    },
    checkIcon: {
      color: 'white',
      fontWeight: 'bold',
    },
    featureText: {
      flex: 1,
      fontSize: 15,
      color: '#555',
      lineHeight: 22,
    },
    registerButton: {
      backgroundColor: '#000',
      borderRadius: 30,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 10,
    },
    registerButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
    otherServicesContainer: {
      padding: 16,
      marginTop: 10,
    },
    otherServicesTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 16,
      color: '#333',
    },
    otherServicesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    otherServiceCard: {
      width: (width - 48) / 3,
      backgroundColor: 'white',
      borderRadius: 12,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
      marginBottom: 10,
    },
    otherServiceImage: {
      width: '100%',
      height: 80,
    },
    otherServiceTitle: {
      padding: 8,
      fontSize: 12,
      textAlign: 'center',
      color: '#333',
    },
    ctaContainer: {
      backgroundColor: '#f1f5f9',
      padding: 20,
      alignItems: 'center',
      marginTop: 20,
    },
    ctaTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 10,
      color: '#333',
    },
    ctaDescription: {
      fontSize: 15,
      textAlign: 'center',
      color: '#666',
      marginBottom: 20,
      paddingHorizontal: 20,
    },
    ctaButton: {
      backgroundColor: '#000',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 30,
    },
    ctaButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
  });
  
  export default ServicesScreen;