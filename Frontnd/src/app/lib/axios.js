import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:5001/api',
  withCredentials: true, // Send cookies with every request
  headers: {},
});

export default axiosInstance;
