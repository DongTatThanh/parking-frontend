module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    '@babel/plugin-proposal-class-properties',
    'react-native-reanimated/plugin', // nếu có dùng reanimated, không gây lỗi nếu không dùng
  ],
};
