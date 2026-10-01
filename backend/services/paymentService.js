const { ADVANCE_PERCENT } = require('../config/constants');

const calculateAdvancePayment = (totalFare) => {
  if (!totalFare || totalFare <= 0) return 0;
  return Math.round(totalFare * ADVANCE_PERCENT);
};

const formatINR = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const processPayment = async ({
  amount,
  currency = 'INR',
  paymentMethod = 'UPI_GPAY',
  forceFail = false,
}) => {
  if (!amount || amount <= 0) {
    return {
      success: false,
      message: 'Advance amount must be greater than zero.',
    };
  }

  // Simulate gateway latency in development/production
  const isTest = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';
  if (!isTest) {
    const latencyMs = Math.floor(Math.random() * 800) + 400;
    await new Promise((resolve) => setTimeout(resolve, latencyMs));
  }

  if (forceFail) {
    return {
      success: false,
      message: 'Payment declined by issuing bank.',
    };
  }

  const isSuccess = isTest ? true : Math.random() < 0.95;
  if (!isSuccess) {
    return {
      success: false,
      message: 'Payment timed out. Please try again.',
    };
  }

  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const transactionId = `pay_rzp_in_${Date.now().toString().slice(-6)}_${randomSuffix}`;

  return {
    success: true,
    transactionId,
    amount,
    currency,
    paymentMethod,
    paymentStatus: 'PAID',
    gateway: 'Razorpay (Mock UPI / Cards)',
    timestamp: new Date().toISOString(),
    message: `Payment of INR ${amount} received successfully via ${paymentMethod}.`,
  };
};

module.exports = {
  ADVANCE_PERCENT,
  calculateAdvancePayment,
  formatINR,
  processPayment,
};
