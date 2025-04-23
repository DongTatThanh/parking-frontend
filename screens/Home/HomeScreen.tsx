import React, { useRef, useEffect } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../Navigation/types';

const { width } = Dimensions.get('window');

// Placeholder services data
const serviceData = [
  { id: '1', title: 'Sửa xe tận nơi', image: require('../../assets/images/oto.png') },
  { id: '2', title: 'Bảo dưỡng xe', image: require('../../assets/images/oto.png') },
  { id: '3', title: 'Rửa xe tại nhà', image: require('../../assets/images/oto.png') },
  { id: '4', title: 'Thay nhớt tận nơi', image: require('../../assets/images/oto.png') },
  
];

// Placeholder categories data
const categoryData = [
  { id: '1', title: 'Đặt Chỗ', image: require('../../assets/images/oto.png'), screen: 'BookingScreen' },
  { id: '2', title: 'Thông Tin Chỗ Đặt', image: require('../../assets/images/oto.png'), screen:'BookingConfirmationScreen'},
  { id: '3', title: 'Bảo Hiểm Xe', image: require('../../assets/images/oto.png'), screen: 'InsuranceScreen' },
  { id: '4', title: 'Về chúng tôi', image: require('../../assets/images/oto.png'), screen: 'AboutScreen' },
]; 

type ServiceCardProps = {
  id: string;
  title: string;
  image: any;
}


const ServiceCard: React.FC<ServiceCardProps> = ({ id, title, image }) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  return (
    <TouchableOpacity 
      style={styles.serviceCard}
      onPress={() => navigation.navigate("ServicesScreen", { id })}
    >
      <View style={styles.imageContainer}>
        <Image source={image} style={styles.serviceImage} resizeMode="cover" />
      </View>
      <Text style={styles.serviceTitle}>{title}</Text>
    </TouchableOpacity>
  );
};

type CategoryCardProps = {
  title: string;
  image: any;
  screen: keyof RootStackParamList;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ title, image, screen }) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  return (
    <TouchableOpacity 
      style={styles.categoryCard}
      onPress={() => {
        if (screen === 'BookingConfirmationScreen') {
          // Lấy dữ liệu booking gần nhất từ AsyncStorage (nếu có)
          AsyncStorage.getItem('last_booking').then((bookingStr) => {
            if (bookingStr) {
              const booking = JSON.parse(bookingStr);
              navigation.navigate(screen, booking);
            } else {
              // Nếu chưa có booking, không hiển thị thông tin
              navigation.navigate(screen, null);
            }
          });
        } else {
          navigation.navigate(screen);
        }
      }}
    >
      <View style={styles.categoryIconContainer}>
        <Image source={image} style={styles.categoryIcon} resizeMode="contain" />
      </View>
      <Text style={styles.categoryTitle}>{title}</Text>
    </TouchableOpacity>
  );
};

const HomeScreen: React.FC = () => {
  const scrollViewRef = useRef<ScrollView>(null);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  useEffect(() => {
    // Auto-scroll for services
    let scrollPosition = 0;
    const cardWidth = width * 0.7 + 16; // card width + margin
    const maxScroll = serviceData.length * cardWidth;
    
    const interval = setInterval(() => {
      if (scrollViewRef.current) {
        scrollPosition += cardWidth;
        if (scrollPosition >= maxScroll) {
          scrollPosition = 0;
        }
        scrollViewRef.current.scrollTo({ x: scrollPosition, animated: true });
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroOverlay} />
          <Image 
            source={require('../../assets/images/a.jpg')} 
            style={styles.heroImage}
            resizeMode="cover"
          />
           <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>TÌM BÃI NHANH</Text>
            <Text style={styles.heroSubtitle}>ĐỖ AN TÂM!</Text>

          </View>
        </View>
        
        {/* Services Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>CHƯƠNG TRÌNH KHUYẾN MÃI KHÁCH HÀNG</Text>
            <View style={styles.sectionDivider} />
          </View>
          
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.servicesContainer}
            snapToInterval={width * 0.7 + 16}
            decelerationRate="fast"
          >
            {serviceData.map((service) => (
              <ServiceCard
                key={service.id}
                id={service.id}
                title={service.title}
                image={service.image}
              />
            ))}
          </ScrollView>
        </View>
        
        {/* Categories Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>DỊCH VỤ</Text>
            <View style={styles.sectionDivider} />
          </View>
          
          <View style={styles.categoriesGrid}>
            {categoryData.map((category) => (
              <CategoryCard
                key={category.id}
                title={category.title}
                image={category.image}
                screen={category.screen as keyof RootStackParamList}
              />
            ))}
          </View>
        </View>
        
        {/* Promo Banner */}
        <View style={styles.promoBannerContainer}>
          <TouchableOpacity style={styles.promoBanner}  
          onPress={() =>navigation.navigate('SpecialOffersScreen')}>
            <Image 
              source={require('../../assets/images/a.jpg')} 
              style={styles.promoBannerImage}
              resizeMode="cover"
            />
            <View style={styles.promoBannerOverlay} />
            <View style={styles.promoBannerContent}>
              <Text style={styles.promoBannerTitle}>Ưu Đãi Đặc Biệt</Text>
              <Text style={styles.promoBannerSubtitle}>Khám phá các ưu đãi hấp dẫn cho khách hàng mới</Text>
            </View>
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
  heroSection: {
    height: 250,
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    paddingHorizontal: 20,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 24,
  },
  heroButton: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    marginTop: 16,
  },
  heroButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginVertical: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  sectionDivider: {
    width: 40,
    height: 3,
    backgroundColor: '#000',
  },
  servicesContainer: {
    paddingVertical: 8,
    paddingLeft: 4,
    paddingRight: 20,
  },
  serviceCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: width * 0.7,
    marginLeft: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    height: 160,
    overflow: 'hidden',
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  serviceTitle: {
    padding: 16,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: (width - 60) / 2,
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  categoryIcon: {
    width: 30,
    height: 30,
  },
  categoryTitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#333',
    fontWeight: '500',
  },
  promoBannerContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  promoBanner: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  promoBannerImage: {
    width: '100%',
    height: '100%',
  },
  promoBannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1,
  },
  promoBannerContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    zIndex: 2,
  },
  promoBannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  promoBannerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});


export default HomeScreen;

