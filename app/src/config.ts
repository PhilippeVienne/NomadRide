const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8080' : '');

export const CONFIG = {
  API_URL,
  ENDPOINTS: {
    FUEL_CHEAPEST: `${API_URL}/api/fuel/cheapest`,
    RADAR_STATUS: `${API_URL}/api/radar/status`,
    RADAR_FORECAST: (hour: number) => `${API_URL}/api/radar/forecast/${hour}`,
  },
};
