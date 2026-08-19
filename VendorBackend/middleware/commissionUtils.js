// utils/commissionUtils.js

// Plan Configuration
const PLAN_DETAILS = {
  'STARTER': {
    name: 'STARTER',
    monthlyFee: 499,
    commissionRate: 12,
    color: '#6c757d',
    bgColor: '#f8f9fa',
    features: [
      'Up to 25 product listings',
      '1 Homepage Feature/month',
      '2 Category Features/month',
      '3 Social Media Feature/month',
      'Seller Dashboard & Analytics',
      'Access to Seasonal Campaigns'
    ]
  },
  'GROWTH': {
    name: 'GROWTH',
    monthlyFee: 1499,
    commissionRate: 9,
    color: '#007bff',
    bgColor: '#cce5ff',
    features: [
      'Up to 100 product listings',
      '2 Homepage Feature/month',
      '4 Category Features/month',
      '5 Social Media Features/month',
      'Seller Dashboard & Analytics',
      'Order Management',
      'Access to Seasonal Campaigns'
    ]
  },
  'PREMIUM': {
    name: 'PREMIUM',
    monthlyFee: 3999,
    commissionRate: 6,
    color: '#ffc107',
    bgColor: '#fff3cd',
    features: [
      'Unlimited Listings',
      '4 Homepage Features/month',
      '8 Category Features/month',
      'Advanced Analytics',
      'Priority Support'
    ]
  }
};

// ✅ FREE MONTHS CONFIGURATION
const FREE_MONTHS = {
  // Format: 'YYYY-MM' 
  // September 2026 and November 2026 are completely free
  '2026-09': { isFree: true, description: 'September 2026 - Free Launch Offer' },
  '2026-11': { isFree: true, description: 'November 2026 - Free Month Offer' }
};

// Check if current month is free
const isCurrentMonthFree = () => {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return FREE_MONTHS[yearMonth]?.isFree || false;
};

// Check if a specific month is free
const isMonthFree = (year, month) => {
  const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
  return FREE_MONTHS[yearMonth]?.isFree || false;
};

// Get free month description
const getFreeMonthDescription = () => {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return FREE_MONTHS[yearMonth]?.description || null;
};

// Get effective commission rate for a vendor
const getEffectiveCommissionRate = (vendor) => {
  // ✅ Check if current month is free
  if (isCurrentMonthFree()) {
    return 0; // 0% commission during free months
  }

  // If vendor has custom commission rate, use it
  if (vendor.commissionRate !== undefined && vendor.commissionRate !== null) {
    return vendor.commissionRate;
  }

  // Get plan-based commission
  const planKey = vendor.plan || 'STARTER';
  const planDetails = PLAN_DETAILS[planKey] || PLAN_DETAILS['STARTER'];
  
  return planDetails.commissionRate;
};

// Get plan details for a vendor
const getVendorPlanDetails = (vendor) => {
  const planKey = vendor.plan || 'STARTER';
  const planDetails = PLAN_DETAILS[planKey] || PLAN_DETAILS['STARTER'];
  
  const effectiveCommission = getEffectiveCommissionRate(vendor);
  const isFree = isCurrentMonthFree();
  
  return {
    ...planDetails,
    effectiveCommission,
    isFreeMonth: isFree,
    freeMonthDescription: isFree ? getFreeMonthDescription() : null,
    planKey: planKey
  };
};

// Calculate commission for an order
const calculateCommission = (vendor, orderTotal) => {
  const commissionRate = getEffectiveCommissionRate(vendor);
  const commissionAmount = (orderTotal * commissionRate) / 100;
  const vendorPayout = orderTotal - commissionAmount;
  
  return {
    commissionRate,
    commissionAmount: parseFloat(commissionAmount.toFixed(2)),
    vendorPayout: parseFloat(vendorPayout.toFixed(2)),
    isFreeMonth: isCurrentMonthFree()
  };
};

// Get all free months list for display
const getFreeMonthsList = () => {
  return Object.entries(FREE_MONTHS).map(([month, details]) => ({
    month,
    description: details.description,
    isFree: details.isFree
  }));
};

module.exports = {
  PLAN_DETAILS,
  FREE_MONTHS,
  isCurrentMonthFree,
  isMonthFree,
  getFreeMonthDescription,
  getEffectiveCommissionRate,
  getVendorPlanDetails,
  calculateCommission,
  getFreeMonthsList
};