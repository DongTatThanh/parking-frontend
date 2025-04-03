import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Linking,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../Navigation/types';

const AboutScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Team members data
  const teamMembers = [
    {
      id: '1',
      name: 'Nguyễn Văn A',
      role: 'Giám đốc',
      image: require('../assets/images/a.jpg')
    },
    {
      id: '2',
      name: 'Trần Thị B',
      role: 'Quản lý bãi đỗ xe',
      image: require('../assets/images/a.jpg')
    },
    {
      id: '3',
      name: 'Lê Văn C',
      role: 'Kỹ thuật viên',
      image: require('../assets/images/a.jpg')
    },
    {
      id: '4',
      name: 'Phạm Thị D',
      role: 'Chăm sóc khách hàng',
      image: require('../assets/images/a.jpg')
    },
  ];

  // Contact info
  const contactInfo = {
    email: 'dongbeo16@gmail.com',
    phone: '0972068334',
    address: '71 Nguyễn Lương Bằng, Đống Đa, Hà Nội',
    website: 'hocmai.vn',
    facebook: 'fb.com/DongMinhTatThanh',
    instagram: 'instagram.com/DongMInhTatThanh',
  };

  const handleContactPress = (type: string) => {
    switch (type) {
      case 'email':
        Linking.openURL(`mailto:${contactInfo.email}`);
        break;
      case 'phone':
        Linking.openURL(`tel:${contactInfo.phone}`);
        break;
      case 'website':
        Linking.openURL(`https://${contactInfo.website}`);
        break;
      case 'facebook':
        Linking.openURL(`https://${contactInfo.facebook}`);
        break;
      case 'instagram':
        Linking.openURL(`https://${contactInfo.instagram}`);
        break;
      default:
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={"dark-content"} backgroundColor="white" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Về Chúng Tôi</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Logo and Brand Name */}
        <View style={styles.brandSection}>
          <Image 
            source={require('../assets/images/a.jpg')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandName}>TÌM BÃI NHANH</Text>
          <Text style={styles.tagline}>Giải pháp đỗ xe thông minh, an toàn và tiện lợi</Text>
        </View>
        
        {/* Our Story */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Câu Chuyện Của Chúng Tôi</Text>
          <Text style={styles.storyText}>
            TÌM BÃI NHANH được thành lập vào năm 2020 với sứ mệnh giải quyết vấn đề tìm kiếm bãi đỗ xe 
            tại các thành phố lớn. Chúng tôi nhận thấy sự khó khăn mà người dân gặp phải khi tìm kiếm 
            chỗ đỗ xe tại các khu vực đông đúc và quyết định tạo ra một giải pháp công nghệ để kết nối 
            người lái xe với các bãi đỗ xe có sẵn.
          </Text>
          <Text style={styles.storyText}>
            Sau hơn 3 năm hoạt động, chúng tôi đã kết nối thành công hàng nghìn người lái xe với các 
            bãi đỗ xe trên khắp các thành phố lớn tại Việt Nam, giúp tiết kiệm thời gian, nhiên liệu 
            và giảm ùn tắc giao thông.
          </Text>
        </View>
        
        {/* Our Mission */}
        <View style={styles.missionSection}>
          <Text style={styles.missionTitle}>Sứ Mệnh Của Chúng Tôi</Text>
          <Text style={styles.missionText}>
            "Cung cấp giải pháp đỗ xe thông minh, an toàn và tiện lợi cho mọi người, góp phần xây dựng 
            thành phố thông minh và bền vững."
          </Text>
        </View>
        
        {/* Our Values */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Giá Trị Cốt Lõi</Text>
          
          <View style={styles.valueItem}>
            <View style={styles.valueIcon}>
              <Text style={styles.valueIconText}>1</Text>
            </View>
            <View style={styles.valueContent}>
              <Text style={styles.valueTitle}>Tiện Lợi</Text>
              <Text style={styles.valueDescription}>
                Chúng tôi luôn đặt sự tiện lợi của khách hàng lên hàng đầu, giúp quá trình tìm kiếm và đặt chỗ đỗ xe trở nên đơn giản và nhanh chóng.
              </Text>
            </View>
          </View>
          <View style={styles.valueItem}>
            <View style={styles.valueIcon}>
              <Text style={styles.valueIconText}>2</Text>
            </View>
            <View style={styles.valueContent}>
              <Text style={styles.valueTitle}>An Toàn</Text>
              <Text style={styles.valueDescription}>
                Đảm bảo an toàn cho xe của khách hàng là ưu tiên hàng đầu, với hệ thống giám sát và bảo vệ 24/7 tại các bãi đỗ xe đối tác.
              </Text>
            </View>
          </View>
          
          <View style={styles.valueItem}>
            <View style={styles.valueIcon}>
              <Text style={styles.valueIconText}>3</Text>
            </View>
            <View style={styles.valueContent}>
              <Text style={styles.valueTitle}>Minh Bạch</Text>
              <Text style={styles.valueDescription}>
                Chúng tôi cam kết sự minh bạch trong mọi giao dịch, từ giá cả đến chất lượng dịch vụ, không có phí ẩn hay các điều khoản không rõ ràng.
              </Text>
            </View>
          </View>
        </View>
        
        {/* Our Team */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Đội Ngũ Của Chúng Tôi</Text>
          
          <View style={styles.teamGrid}>
            {teamMembers.map((member) => (
              <View key={member.id} style={styles.teamMember}>
                <Image 
                  source={member.image} 
                  style={styles.memberImage}
                  resizeMode="cover"
                />
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberRole}>{member.role}</Text>
              </View>
            ))}
          </View>
        </View>
        
        {/* Partners */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Đối Tác Của Chúng Tôi</Text>
          
          <View style={styles.partnersContainer}>
            <View style={styles.partnerLogo}>
              <View style={styles.placeholderLogo}>
                <Text style={styles.placeholderText}>Logo</Text>
              </View>
              <Text style={styles.partnerName}>Công ty A</Text>
            </View>
            
            <View style={styles.partnerLogo}>
              <View style={styles.placeholderLogo}>
                <Text style={styles.placeholderText}>Logo</Text>
              </View>
              <Text style={styles.partnerName}>Công ty B</Text>
            </View>
            
            <View style={styles.partnerLogo}>
              <View style={styles.placeholderLogo}>
                <Text style={styles.placeholderText}>Logo</Text>
              </View>
              <Text style={styles.partnerName}>Công ty C</Text>
            </View>
            
            <View style={styles.partnerLogo}>
              <View style={styles.placeholderLogo}>
                <Text style={styles.placeholderText}>Logo</Text>
              </View>
              <Text style={styles.partnerName}>Công ty D</Text>
            </View>
          </View>
        </View>
        
        {/* Contact Us */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Liên Hệ Với Chúng Tôi</Text>
          
          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => handleContactPress('email')}
          >
            <View style={styles.contactIcon}>
              <Text style={styles.contactIconText}>✉</Text>
            </View>
            <Text style={styles.contactText}>{contactInfo.email}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => handleContactPress('phone')}
          >
            <View style={styles.contactIcon}>
              <Text style={styles.contactIconText}>☏</Text>
            </View>
            <Text style={styles.contactText}>{contactInfo.phone}</Text>
          </TouchableOpacity>
          
          <View style={styles.contactItem}>
            <View style={styles.contactIcon}>
              <Text style={styles.contactIconText}>⌖</Text>
            </View>
            <Text style={styles.contactText}>{contactInfo.address}</Text>
          </View>
          <View style={styles.socialLinks}>
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => handleContactPress('website')}
            >
              <Text style={styles.socialButtonText}>Website</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => handleContactPress('facebook')}
            >
              <Text style={styles.socialButtonText}>Facebook</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => handleContactPress('instagram')}
            >
              <Text style={styles.socialButtonText}>Instagram</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#333333',
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
  brandSection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#333',
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 12,
    tintColor: 'white',
  },
  brandName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: '#D6BCFA',
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
  storyText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#555',
    marginBottom: 12,
  },
  missionSection: {
    backgroundColor: '#E5DEFF',
    padding: 24,
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
  },
  missionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  missionText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#555',
    textAlign: 'center',
    lineHeight: 24,
  },
  valueItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  valueIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#9b87f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  valueIconText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  valueContent: {
    flex: 1,
  },
  valueTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  valueDescription: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  teamGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  teamMember: {
    width: '48%',
    marginBottom: 20,
    alignItems: 'center',
  },
  memberImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  memberRole: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  partnersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  partnerLogo: {
    width: '48%',
    marginBottom: 20,
    alignItems: 'center',
  },
  placeholderLogo: {
    width: 100,
    height: 60,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderRadius: 8,
  },
  placeholderText: {
    color: '#999',
    fontWeight: '500',
  },
  partnerName: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  contactSection: {
    backgroundColor: '#F1F0FB',
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 12,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#9b87f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  contactIconText: {
    color: 'white',
    fontSize: 16,
  },
  contactText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  socialLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  socialButton: {
    backgroundColor: '#000000',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  socialButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AboutScreen;