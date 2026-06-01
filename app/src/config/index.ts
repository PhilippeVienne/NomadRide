// Expo automatically loads variables prefixed with EXPO_PUBLIC_ from .env files
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8080';

export const CONFIG = {
  API_URL,
  ENDPOINTS: {
    FUEL_CHEAPEST: `${API_URL}/api/fuel/cheapest`,
  },
};
