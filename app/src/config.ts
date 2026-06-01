const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const CONFIG = {
  API_URL,
  ENDPOINTS: {
    FUEL_CHEAPEST: `${API_URL}/api/fuel/cheapest`,
  },
};
