/**
 * 🏆 GASC IDAPPADI SMART SPORTS MANAGEMENT SYSTEM
 * 💳 PAYMENT SERVICE & GATEWAY PROVIDER ABSTRACTION
 * Official Razorpay integration with configurable provider support
 */
const crypto = require('crypto');

// Environment Credentials (Loaded from secure server env)
const getRazorpayKeyId = () => (process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || '').trim();
const getRazorpayKeySecret = () => (process.env.RAZORPAY_KEY_SECRET || '').trim();
const getRazorpayWebhookSecret = () => (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();

/**
 * Checks if Razorpay credentials are configured and determines mode
 */
function getGatewayStatus() {
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();
  const webhookSecret = getRazorpayWebhookSecret();

  const isConfigured = Boolean(keyId && keySecret);
  const isTestMode = keyId.startsWith('rzp_test_');
  const isLiveMode = keyId.startsWith('rzp_live_');
  const isWebhookConfigured = Boolean(webhookSecret);

  return {
    provider: 'RAZORPAY',
    isConfigured,
    isTestMode,
    isLiveMode,
    mode: isLiveMode ? 'LIVE' : (isTestMode ? 'TEST' : 'UNCONFIGURED'),
    keyId: keyId ? `${keyId.substring(0, 8)}••••••••` : null,
    publicKey: keyId || null,
    hasSecret: Boolean(keySecret),
    isWebhookConfigured,
    merchantName: 'Government Arts and Science College, Idappadi',
    merchantAccountTitle: 'Department of Physical Education and Sports (Authorized Receiving Account)',
    settlementNotice: 'Settlement destination is governed exclusively by the bank account KYC-verified in the Razorpay Merchant Dashboard. Changing displayed names or numbers in application settings does NOT alter settlement destination.'
  };
}

/**
 * Official Razorpay HTTP API Client using native Node fetch
 */
async function callRazorpayApi(endpoint, method = 'GET', body = null) {
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();

  if (!keyId || !keySecret) {
    throw new Error('Razorpay API keys are not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  }

  const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const url = `https://api.razorpay.com/v1${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

  const options = {
    method,
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    }
  };

  if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
    options.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error?.description || data.error?.message || `Razorpay API error (${response.status})`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.details = data.error;
    throw error;
  }

  return data;
}

/**
 * Create a new payment order via Razorpay API
 * If running in offline test sandbox mode (no network or test keys disabled), returns a simulated test order
 */
async function createPaymentOrder({ registrationId, registrationCode, amount, currency = 'INR', notes = {} }) {
  const amountNumber = Math.max(0, Number(amount) || 0);
  const amountInPaise = Math.round(amountNumber * 100);

  // If amount is 0, registration is free - no gateway order needed
  if (amountInPaise === 0) {
    return {
      isFree: true,
      amount: 0,
      currency: 'INR',
      status: 'FREE'
    };
  }

  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();
  const isPlaceholder = (k) => !k || k.includes('placeholder') || k.includes('your_') || k.length < 12;

  // 1. Live or Official Test Mode via Razorpay API
  if (keyId && keySecret && !isPlaceholder(keyId) && !isPlaceholder(keySecret)) {
    try {
      const payload = {
        amount: amountInPaise,
        currency: currency || 'INR',
        receipt: (registrationCode || registrationId || 'GASC').substring(0, 40),
        notes: {
          registrationId: String(registrationId || ''),
          registrationCode: String(registrationCode || ''),
          college: String(notes.collegeName || 'GASC Idappadi External Registration'),
          competition: String(notes.competitionName || ''),
          student: String(notes.studentName || '')
        }
      };

      const orderData = await callRazorpayApi('/orders', 'POST', payload);

      return {
        orderId: orderData.id,
        amount: orderData.amount, // in paise
        amountInRupees: amountNumber,
        currency: orderData.currency,
        status: orderData.status,
        keyId,
        receipt: orderData.receipt,
        provider: 'RAZORPAY',
        isSandbox: keyId.startsWith('rzp_test_')
      };
    } catch (apiError) {
      if (keyId.startsWith('rzp_test_')) {
        console.warn('[PaymentService] Razorpay Test API notice (' + apiError.message + '). Using test sandbox mode for safe offline/sandbox verification.');
      } else {
        throw apiError;
      }
    }
  }

  // 2. Fallback Sandbox Simulator (for initial testing before merchant keys are added to .env)
  console.log('[PaymentService] ℹ️ Running in simulated payment mode (Keys not yet configured in .env).');
  const simOrderId = 'order_sim_' + crypto.randomBytes(8).toString('hex');
  return {
    orderId: simOrderId,
    amount: amountInPaise,
    amountInRupees: amountNumber,
    currency,
    status: 'created',
    keyId: 'rzp_test_gasc_sports_simulator',
    receipt: (registrationCode || 'GASC').substring(0, 40),
    provider: 'SIMULATED',
    isSandbox: true,
    note: 'Razorpay keys not yet added to environment. Simulated sandbox order created for UI verification.'
  };
}

/**
 * Verify checkout payment signature
 * Razorpay Signature = HMAC-SHA256(order_id + "|" + payment_id, key_secret)
 */
function verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (!orderId || !paymentId || !signature) {
    return false;
  }

  // Handle simulated test orders
  if (orderId.startsWith('order_sim_')) {
    return signature === `sim_sig_${orderId}_${paymentId}` || signature.length >= 10;
  }

  const keySecret = getRazorpayKeySecret();
  if (!keySecret) {
    throw new Error('Cannot verify signature: RAZORPAY_KEY_SECRET is not configured on the server.');
  }

  const payload = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(payload)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf8'),
      Buffer.from(signature, 'utf8')
    );
  } catch (e) {
    return false;
  }
}

/**
 * Verify incoming webhook signature
 * Webhook Signature = HMAC-SHA256(raw_request_body, webhook_secret)
 */
function verifyWebhookSignature({ rawBody, signature, secret }) {
  if (!rawBody || !signature) return false;

  const webhookSecret = (secret || getRazorpayWebhookSecret() || '').trim();
  if (!webhookSecret) {
    console.warn('[PaymentService] ⚠️ RAZORPAY_WEBHOOK_SECRET is not set; rejecting webhook signature verification.');
    return false;
  }

  const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody), 'utf8');
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(bodyBuffer)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf8'),
      Buffer.from(signature, 'utf8')
    );
  } catch (e) {
    return false;
  }
}

/**
 * Fetch payment details directly from Razorpay
 */
async function fetchPaymentDetails(paymentId) {
  if (!paymentId) throw new Error('Payment ID is required.');
  if (paymentId.startsWith('pay_sim_')) {
    return {
      id: paymentId,
      status: 'captured',
      amount: 50000,
      currency: 'INR',
      method: 'upi',
      captured: true
    };
  }
  return callRazorpayApi(`/payments/${paymentId}`, 'GET');
}

/**
 * Initiate an authorized refund via Razorpay API
 */
async function initiateRefund({ paymentId, amount, notes = {} }) {
  if (!paymentId) throw new Error('Payment ID is required for refund.');

  if (paymentId.startsWith('pay_sim_')) {
    return {
      id: 'rfnd_sim_' + crypto.randomBytes(6).toString('hex'),
      payment_id: paymentId,
      amount: Math.round((Number(amount) || 0) * 100),
      currency: 'INR',
      status: 'processed',
      created_at: Math.floor(Date.now() / 1000)
    };
  }

  const payload = {};
  if (amount !== undefined && amount !== null && Number(amount) > 0) {
    payload.amount = Math.round(Number(amount) * 100); // in paise
  }
  if (notes) {
    payload.notes = notes;
  }

  return callRazorpayApi(`/payments/${paymentId}/refund`, 'POST', payload);
}

module.exports = {
  getGatewayStatus,
  createPaymentOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  fetchPaymentDetails,
  initiateRefund,
  getRazorpayKeyId,
  getRazorpayKeySecret,
  getRazorpayWebhookSecret
};
