import axios from 'axios';
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });
api.interceptors.request.use((c) => { const t = localStorage.getItem('cc_token'); if (t) c.headers.Authorization = 'Bearer ' + t; return c; });
export const get = async (p: string) => (await api.get(p)).data;
export const post = async (p: string, d: any) => (await api.post(p, d)).data;
export const patch = async (p: string, d: any) => (await api.patch(p, d)).data;
export const put = async (p: string, d: any) => (await api.put(p, d)).data;
export const del = async (p: string) => (await api.delete(p)).data;
export function errMsg(e: any) { return e?.response?.data?.error || e?.message || 'Something went wrong.'; }
