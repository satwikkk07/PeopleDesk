import axios from 'axios';
const api=axios.create({baseURL:import.meta.env.VITE_API_URL||'http://localhost:5000/api'});
api.interceptors.response.use(r=>r,e=>Promise.reject(new Error(e.response?.data?.message||'Request failed. Please try again.')));
export default api;
