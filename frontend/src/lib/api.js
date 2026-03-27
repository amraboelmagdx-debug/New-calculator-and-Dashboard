import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${API_URL}/api`;

// Create axios instance
const apiClient = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Admin password for protected routes
let adminPassword = '';

export const setAdminPassword = (password) => {
  adminPassword = password;
};

export const getAdminPassword = () => adminPassword;

// Add admin password to headers for protected routes
const adminConfig = () => ({
  headers: {
    'X-Admin-Password': adminPassword,
  },
});

// ==================== ROLES ====================
export const getRoles = async () => {
  const response = await apiClient.get('/roles');
  return response.data;
};

export const createRole = async (role) => {
  const response = await apiClient.post('/roles', role, adminConfig());
  return response.data;
};

export const updateRole = async (id, role) => {
  const response = await apiClient.put(`/roles/${id}`, role, adminConfig());
  return response.data;
};

export const deleteRole = async (id) => {
  const response = await apiClient.delete(`/roles/${id}`, adminConfig());
  return response.data;
};

// ==================== PRODUCT TEMPLATES ====================
export const getProductTemplates = async () => {
  const response = await apiClient.get('/product-templates');
  return response.data;
};

export const createProductTemplate = async (template) => {
  const response = await apiClient.post('/product-templates', template, adminConfig());
  return response.data;
};

export const updateProductTemplate = async (id, template) => {
  const response = await apiClient.put(`/product-templates/${id}`, template, adminConfig());
  return response.data;
};

export const deleteProductTemplate = async (id) => {
  const response = await apiClient.delete(`/product-templates/${id}`, adminConfig());
  return response.data;
};

// ==================== SCOPE TEMPLATES ====================
export const getScopeTemplates = async () => {
  const response = await apiClient.get('/scope-templates');
  return response.data;
};

export const createScopeTemplate = async (template) => {
  const response = await apiClient.post('/scope-templates', template, adminConfig());
  return response.data;
};

export const updateScopeTemplate = async (id, template) => {
  const response = await apiClient.put(`/scope-templates/${id}`, template, adminConfig());
  return response.data;
};

export const deleteScopeTemplate = async (id) => {
  const response = await apiClient.delete(`/scope-templates/${id}`, adminConfig());
  return response.data;
};

// ==================== VENDOR SERVICES ====================
export const getVendorServices = async () => {
  const response = await apiClient.get('/vendor-services');
  return response.data;
};

export const createVendorService = async (service) => {
  const response = await apiClient.post('/vendor-services', service, adminConfig());
  return response.data;
};

export const updateVendorService = async (id, service) => {
  const response = await apiClient.put(`/vendor-services/${id}`, service, adminConfig());
  return response.data;
};

export const deleteVendorService = async (id) => {
  const response = await apiClient.delete(`/vendor-services/${id}`, adminConfig());
  return response.data;
};

// ==================== PAYMENT TERMS ====================
export const getPaymentTerms = async () => {
  const response = await apiClient.get('/payment-terms');
  return response.data;
};

export const createPaymentTerm = async (term) => {
  const response = await apiClient.post('/payment-terms', term, adminConfig());
  return response.data;
};

export const updatePaymentTerm = async (id, term) => {
  const response = await apiClient.put(`/payment-terms/${id}`, term, adminConfig());
  return response.data;
};

export const deletePaymentTerm = async (id) => {
  const response = await apiClient.delete(`/payment-terms/${id}`, adminConfig());
  return response.data;
};

// ==================== OVERHEAD RATES ====================
export const getOverheadRates = async () => {
  const response = await apiClient.get('/overhead-rates');
  return response.data;
};

export const updateOverheadRates = async (data) => {
  const response = await apiClient.put('/overhead-rates', data, adminConfig());
  return response.data;
};

// ==================== SALES INCENTIVES ====================
export const getSalesIncentives = async () => {
  const response = await apiClient.get('/sales-incentives');
  return response.data;
};

export const updateSalesIncentives = async (percent) => {
  const response = await apiClient.put(`/sales-incentives?percent=${percent}`, {}, adminConfig());
  return response.data;
};

// ==================== RISK MULTIPLIERS ====================
export const getRiskMultipliers = async () => {
  const response = await apiClient.get('/risk-multipliers');
  return response.data;
};

export const createRiskMultiplier = async (multiplier) => {
  const response = await apiClient.post('/risk-multipliers', multiplier, adminConfig());
  return response.data;
};

export const updateRiskMultiplier = async (id, multiplier) => {
  const response = await apiClient.put(`/risk-multipliers/${id}`, multiplier, adminConfig());
  return response.data;
};

export const deleteRiskMultiplier = async (id) => {
  const response = await apiClient.delete(`/risk-multipliers/${id}`, adminConfig());
  return response.data;
};

// ==================== THEME SETTINGS ====================
export const getThemeSettings = async () => {
  const response = await apiClient.get('/theme-settings');
  return response.data;
};

export const updateThemeSettings = async (settings) => {
  const response = await apiClient.put('/theme-settings', settings, adminConfig());
  return response.data;
};

// ==================== HR CONFIG ====================
export const getHRConfig = async () => {
  const response = await apiClient.get('/hr-config');
  return response.data;
};

export const updateHRConfig = async (config) => {
  const response = await apiClient.put('/hr-config', config, adminConfig());
  return response.data;
};

// ==================== QUICK CREATE (no admin auth) ====================
export const quickCreateRole = async (role) => {
  const response = await apiClient.post('/roles/quick', role);
  return response.data;
};

export const quickCreateVendorService = async (service) => {
  const response = await apiClient.post('/vendor-services/quick', service);
  return response.data;
};

// ==================== GOOGLE SHEETS IMPORT ====================
export const importGoogleSheet = async (url) => {
  const response = await apiClient.post(`/import-google-sheet?url=${encodeURIComponent(url)}`, {}, adminConfig());
  return response.data;
};

// ==================== PRICING GUIDELINES ====================
export const getPricingGuidelines = async () => {
  const response = await apiClient.get('/pricing-guidelines');
  return response.data;
};

export const createPricingGuideline = async (guideline) => {
  const response = await apiClient.post('/pricing-guidelines', guideline, adminConfig());
  return response.data;
};

export const updatePricingGuideline = async (id, guideline) => {
  const response = await apiClient.put(`/pricing-guidelines/${id}`, guideline, adminConfig());
  return response.data;
};

export const deletePricingGuideline = async (id) => {
  const response = await apiClient.delete(`/pricing-guidelines/${id}`, adminConfig());
  return response.data;
};

// ==================== RISK CONFIGURATION ====================
export const getRiskConfig = async () => {
  const response = await apiClient.get('/risk-config');
  return response.data;
};

export const updateRiskConfig = async (config) => {
  const response = await apiClient.put('/risk-config', config, adminConfig());
  return response.data;
};

// ==================== CALCULATIONS ====================
export const calculateSimple = async (data) => {
  const response = await apiClient.post('/calculate/simple', data);
  return response.data;
};

export const calculateOpportunity = async (data) => {
  const response = await apiClient.post('/calculate/opportunity', data);
  return response.data;
};

// ==================== OPPORTUNITIES ====================
export const getOpportunities = async () => {
  const response = await apiClient.get('/opportunities');
  return response.data;
};

export const getOpportunity = async (id) => {
  const response = await apiClient.get(`/opportunities/${id}`);
  return response.data;
};

export const createOpportunity = async (opportunity) => {
  const response = await apiClient.post('/opportunities', opportunity);
  return response.data;
};

export const updateOpportunity = async (id, opportunity) => {
  const response = await apiClient.put(`/opportunities/${id}`, opportunity);
  return response.data;
};

export const deleteOpportunity = async (id) => {
  const response = await apiClient.delete(`/opportunities/${id}`);
  return response.data;
};

// ==================== SEED DATA ====================
export const seedDatabase = async () => {
  const response = await apiClient.post('/seed-data', {}, adminConfig());
  return response.data;
};

export default apiClient;
