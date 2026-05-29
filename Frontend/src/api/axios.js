import axios from 'axios';

// In production (Vercel), use the Render backend URL.
// In development, use relative /api paths so Vite proxy handles it.
const baseURL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : '';

const instance = axios.create({
  baseURL,
  timeout: 30000,
});

export default instance;
