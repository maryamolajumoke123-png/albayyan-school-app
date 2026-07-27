import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY;

export const getApiUrl = () => {
  const rawUrl = import.meta.env.VITE_API_URL || `${window.location.origin}/api`
  const trimmedUrl = rawUrl.replace(/\/+$/, '')
  return trimmedUrl.endsWith('/api') ? trimmedUrl : `${trimmedUrl}/api`
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}

const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const createSessionToken = (role) => {
  const payload = {
    role,
    username: localStorage.getItem('username') || 'user',
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24
  };
  return btoa(JSON.stringify(payload));
};

export const loginAdmin = async (username, password) => {
  const expectedUser = (import.meta.env.VITE_ADMIN_USERNAME || 'admin').toLowerCase();
  const expectedPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'Admin@123';

  if (username.toLowerCase() !== expectedUser || password !== expectedPassword) {
    throw new Error('Invalid credentials');
  }

  const token = createSessionToken('admin');
  localStorage.setItem('authToken', token)
  localStorage.setItem('userRole', 'admin')
  localStorage.setItem('username', username)
  localStorage.setItem('userId', 'admin')
  return { token, role: 'admin', username, userId: 'admin' }
}

export const loginDirector = async (username, password) => {
  const expectedUser = (import.meta.env.VITE_DIRECTOR_USERNAME || 'director').toLowerCase();
  const expectedPassword = import.meta.env.VITE_DIRECTOR_PASSWORD || 'Director@123';

  if (username.toLowerCase() !== expectedUser || password !== expectedPassword) {
    throw new Error('Invalid credentials');
  }

  const token = createSessionToken('director');
  localStorage.setItem('authToken', token)
  localStorage.setItem('userRole', 'director')
  localStorage.setItem('username', username)
  localStorage.setItem('userId', 'director')
  return { token, role: 'director', username, userId: 'director' }
}

export const logout = () => {
  localStorage.removeItem('authToken')
  localStorage.removeItem('userRole')
  localStorage.removeItem('username')
  localStorage.removeItem('userId')
}

export const getAuthToken = () => localStorage.getItem('authToken')
export const getUserRole = () => localStorage.getItem('userRole')
export const getUserId = () => localStorage.getItem('userId')
export const getCurrentUser = () => ({
  username: localStorage.getItem('username'),
  role: localStorage.getItem('userRole'),
  userId: localStorage.getItem('userId'),
  token: localStorage.getItem('authToken')
})
export const getApiUrlHelper = getApiUrl
export const getAuthHeadersHelper = getAuthHeaders

export const getDashboardFallbackData = () => ({
  students: [
    {
      id: 1,
      admissionNumber: 'ALB001',
      firstName: 'John',
      lastName: 'Doe',
      school: 'Primary',
      classLevel: 'Grade 1',
      parentPhoneNumber: '08000000001',
      boardingStatus: false,
      takesSchoolBus: true,
      invoices: []
    },
    {
      id: 2,
      admissionNumber: 'ALB002',
      firstName: 'Jane',
      lastName: 'Smith',
      school: 'Secondary',
      classLevel: 'JSS 2',
      parentPhoneNumber: '08000000002',
      boardingStatus: true,
      takesSchoolBus: false,
      invoices: []
    }
  ],
  sessions: [],
  terms: [],
  payments: [],
  invoices: []
})
