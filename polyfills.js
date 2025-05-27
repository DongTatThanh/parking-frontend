/**
 * React Native Polyfills
 * This file configures polyfills for Node.js globals like Buffer
 */

import 'react-native-polyfill-globals/auto';
import { Buffer } from 'buffer';

// Make Buffer available globally
global.Buffer = Buffer; 