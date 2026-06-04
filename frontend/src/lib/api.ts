import axios, { AxiosInstance } from 'axios';
import { useAuthStore } from '../store/auth.store';
 
const BASE = process.env.NEXT_PUBLIC_API_URL
  || 'http://localhost:3001/api/v1';
 
export const api: AxiosInstance = axios.create({ baseURL: BASE, headers: { 'Content-Type': 'application/json' } });
 
// Attach JWT
api.interceptors.request.use((cfg) => {
  const token = useAuthStore.getState().accessToken;
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});
 
// Auto-refresh on 401
let refreshing = false;
let queue: any[] = [];
 
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const orig = err.config;
    if (err.response?.status !== 401 || orig._retry) return Promise.reject(err);
 
    if (refreshing) {
      return new Promise((resolve, reject) => queue.push({ resolve, reject, config: orig }));
    }
 
    orig._retry = true;
    refreshing = true;
 
    try {
      const { refreshToken, setTokens, logout } = useAuthStore.getState();
      if (!refreshToken) { logout(); return Promise.reject(err); }
 
      const res = await axios.post(`${BASE}/auth/refresh`, { refreshToken });
      const { accessToken: at, refreshToken: rt } = res.data;
      setTokens(at, rt);
 
      queue.forEach(({ resolve, config }) => {
        config.headers.Authorization = `Bearer ${at}`;
        resolve(api(config));
      });
      queue = [];
      orig.headers.Authorization = `Bearer ${at}`;
      return api(orig);
    } catch (e) {
      queue.forEach(({ reject }) => reject(e));
      queue = [];
      useAuthStore.getState().logout();
      return Promise.reject(e);
    } finally {
      refreshing = false;
    }
  },
);
 
// ─── Typed API helpers ────────────────────────────────────────
export const authApi = {
  register: (d: any) => api.post('/auth/register', d).then((r: any) => r.data),
  login:    (d: any) => api.post('/auth/login', d).then((r: any) => r.data),
  refresh:  (t: string) => api.post('/auth/refresh', { refreshToken: t }).then((r: any) => r.data),
  logout:   () => api.post('/auth/logout'),
  me:       () => api.get('/auth/me').then((r: any) => r.data),
};
 
export const orgsApi = {
  register: (d: any) => api.post('/organizations/register', d),
  me:       () => api.get('/organizations/me'),
  update:   (d: any) => api.patch('/organizations/me', d),
};
 
export const deptsApi = {
  list:   () => api.get('/departments'),
  create: (d: any) => api.post('/departments', d),
  update: (id: string, d: any) => api.patch(`/departments/${id}`, d),
  delete: (id: string) => api.delete(`/departments/${id}`),
};
 
export const empsApi = {
  list:         (q?: any) => api.get('/employees', { params: q }).then(r => r.data),
  get:          (id: string) => api.get(`/employees/${id}`).then(r => r.data),
  create:       (d: any) => api.post('/employees', d).then(r => r.data),
  update:       (id: string, d: any) => api.patch(`/employees/${id}`, d).then(r => r.data),
  deactivate:   (id: string) => api.delete(`/employees/${id}`).then(r => r.data),
  getSalary:    (id: string) => api.get(`/employees/${id}/salary-structure`).then(r => r.data),
  setSalary:    (id: string, d: any) => api.put(`/employees/${id}/salary-structure`, d).then(r => r.data),
};
 
// Alias used by pages
export const employeesApi = {
  getAll:  (q?: any) => api.get('/employees', { params: q }).then(r => r.data),
  getOne:  (id: string) => api.get(`/employees/${id}`).then(r => r.data),
  create:  (d: any) => api.post('/employees', d).then(r => r.data),
  update:  (id: string, d: any) => api.put(`/employees/${id}`, d).then(r => r.data),
  remove:  (id: string) => api.delete(`/employees/${id}`).then(r => r.data),
};
 
export const payrunApi = {
  getAll:          (q?: any) => api.get('/payruns', { params: q }).then(r => r.data),
  getOne:          (id: string) => api.get(`/payruns/${id}`).then(r => r.data),
  getOrCreateDraft:(d: any) => api.post('/payruns/draft', d).then(r => r.data),
  regenerate:      (id: string) => api.post(`/payruns/${id}/regenerate`).then(r => r.data),
  submit:          (id: string) => api.post(`/payruns/${id}/submit`).then(r => r.data),
  approve:         (id: string) => api.post(`/payruns/${id}/approve`).then(r => r.data),
  process:         (id: string) => api.post(`/payruns/${id}/process`).then(r => r.data),
  markPaid:        (id: string) => api.post(`/payruns/${id}/mark-paid`).then(r => r.data),
  // Legacy aliases
  list:     (region?: string) => api.get('/payruns', { params: { region } }).then(r => r.data),
  draft:    (d: any) => api.post('/payruns/draft', d).then(r => r.data),
  get:      (id: string) => api.get(`/payruns/${id}`).then(r => r.data),
  regen:    (id: string) => api.post(`/payruns/${id}/regenerate`).then(r => r.data),
};
 
export const payslipApi = {
  get:  (id: string) => api.get(`/payslips/${id}`).then(r => r.data),
  my:   (q?: any) => api.get('/payslips/my', { params: q }).then(r => r.data),
  list: (region: string, month?: string, employeeId?: string) => 
    api.get('/payslips', { params: { region, ...(month && { month }), ...(employeeId && { employeeId }) } }).then(r => r.data),
};
 
export const leavesApi = {
  getAll:   (q?: any) => api.get('/leaves', { params: q }).then(r => r.data),
  create:   (d: any) => api.post('/leaves', d).then(r => r.data),
  approve:  (id: string) => api.post(`/leaves/${id}/approve`).then(r => r.data),
  reject:   (id: string, reason: string) => api.post(`/leaves/${id}/reject`, { reason }).then(r => r.data),
  balances: (empId: string) => api.get(`/leaves/${empId}/balances`).then(r => r.data),
};
 
export const loansApi = {
  getAll:   (q?: any) => api.get('/loans', { params: q }).then(r => r.data),
  create:   (d: any) => api.post('/loans', d).then(r => r.data),
  approve:  (id: string) => api.post(`/loans/${id}/approve`).then(r => r.data),
  reject:   (id: string, reason: string) => api.post(`/loans/${id}/reject`, { reason }).then(r => r.data),
};
 
export const advancesApi = {
  getAll:   (q?: any) => api.get('/advances', { params: q }).then(r => r.data),
  create:   (d: any) => api.post('/advances', d).then(r => r.data),
  approve:  (id: string) => api.post(`/advances/${id}/approve`).then(r => r.data),
  reject:   (id: string, reason: string) => api.post(`/advances/${id}/reject`, { reason }).then(r => r.data),
};
 
export const reportsApi = {
  getSalaryRegister: (year: number, month: number, region: string) =>
    api.get('/reports/salary-register', { params: { year, month, region } }).then(r => r.data),
  getPfEsiChallan: (year: number, month: number) =>
    api.get('/reports/pf-esi-challan', { params: { year, month } }).then(r => r.data),
  getWps: (payrunId: string) =>
    api.get(`/reports/wps/${payrunId}`).then(r => r.data),
  getForm16: (employeeId: string, year: number) =>
    api.get(`/reports/form16/${employeeId}`, { params: { year } }).then(r => r.data),
  getPayrollSummary: (payrunId: string) =>
    api.get(`/reports/payroll-summary/${payrunId}`).then(r => r.data),
};
 
export const branchesApi = {
  getAll:  ()              => api.get('/branches').then(r => r.data),
  create:  (dto: any)      => api.post('/branches', dto).then(r => r.data),
  update:  (id: string, dto: any) => api.put(`/branches/${id}`, dto).then(r => r.data),
  remove:  (id: string)    => api.delete(`/branches/${id}`).then(r => r.data),
};
 
export const settingsApi = {
  get:              () => api.get('/settings').then(r => r.data),
  update:           (d: any) => api.patch('/settings', d).then(r => r.data),
  getOrg:           () => api.get('/settings/organization').then(r => r.data),
  updateOrg:        (d: any) => api.patch('/settings/organization', d).then(r => r.data),
  getDepartments:   () => api.get('/settings/departments').then(r => r.data),
  createDepartment: (d: any) => api.post('/settings/departments', d).then(r => r.data),
  updateDepartment: (id: string, d: any) => api.patch(`/settings/departments/${id}`, d).then(r => r.data),
  deleteDepartment: (id: string) => api.delete(`/settings/departments/${id}`).then(r => r.data),
  getUsers:         () => api.get('/settings/users').then(r => r.data),
  inviteUser:       (d: any) => api.post('/settings/users/invite', d).then(r => r.data),
  updateUser:       (id: string, d: any) => api.patch(`/settings/users/${id}`, d).then(r => r.data),
  updateUserRole:   (id: string, role: string) => api.patch(`/settings/users/${id}/role`, { role }).then(r => r.data),
  removeUser:       (id: string) => api.delete(`/settings/users/${id}`).then(r => r.data),
  getLeaveTypes:    () => api.get('/settings/leave-types').then(r => r.data),
  upsertLeaveType:  (d: any) => api.post('/settings/leave-types', d).then(r => r.data),
  getSalaryComps:   () => api.get('/settings/salary-components').then(r => r.data),
  upsertSalaryComp: (d: any) => api.post('/settings/salary-components', d).then(r => r.data),
};
 
export const analyticsApi = {
  getKpi:           (region: string) => api.get('/analytics/kpi', { params: { region } }).then(r => r.data),
  getTrend:         (region: string) => api.get('/analytics/trend', { params: { region } }).then(r => r.data),
  getByDepartment:  (region: string) => api.get('/analytics/by-department', { params: { region } }).then(r => r.data),
  getDecomposition: (q: any) => api.get('/analytics/decompose', { params: q }).then(r => r.data),
  payroll:          (q?: any) => api.get('/analytics/payroll', { params: q }).then(r => r.data),
  headcount:        (q?: any) => api.get('/analytics/headcount', { params: q }).then(r => r.data),
};
 
export const notifsApi = {
  list:       () => api.get('/notifications'),
  markRead:   (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead:() => api.patch('/notifications/read-all'),
};
 
export const attendanceApi = {
  getSummary: (year: number, month: number) => api.get(`/attendance/summary?year=${year}&month=${month}`).then(r => r.data),
  getMonthly: (year: number, month: number, empId?: string) => api.get(`/attendance/monthly?year=${year}&month=${month}${empId?`&employeeId=${empId}`:''}`).then(r => r.data),
  mark:   (dto: any) => api.post('/attendance/mark', dto).then(r => r.data),
  bulk:   (records: any[]) => api.post('/attendance/bulk', { records }).then(r => r.data),
};
 
export const reimbursementsApi = {
  getAll:  (q?: any) => api.get('/reimbursements', { params: q }).then(r => r.data),
  getStats:() => api.get('/reimbursements/stats').then(r => r.data),
  create:  (d: any) => api.post('/reimbursements', d).then(r => r.data),
  approve: (id: string) => api.post(`/reimbursements/${id}/approve`).then(r => r.data),
  reject:  (id: string, reason: string) => api.post(`/reimbursements/${id}/reject`, { reason }).then(r => r.data),
};
 
export const wpsApi = {
  getReport:   (payrunId: string) => api.get(`/wps/${payrunId}/report`).then(r => r.data),
  downloadSIF: (payrunId: string) => api.get(`/wps/${payrunId}/sif`, { responseType:'blob' }).then(r => r.data),
};
 
export const importApi = {
  getTemplate: (region: string) => api.get(`/employees/import/template?region=${region}`).then(r => r.data),
  validate:    (csvContent: string, region: string) => api.post('/employees/import/validate', { csvContent, region }).then(r => r.data),
  import:      (csvContent: string, region: string) => api.post('/employees/import', { csvContent, region }).then(r => r.data),
};