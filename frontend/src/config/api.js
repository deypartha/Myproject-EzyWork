// API Configuration
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000'
  : (import.meta.env.VITE_API_BASE_URL || 'https://myproject-ezywork-1.onrender.com');

export default API_BASE_URL;