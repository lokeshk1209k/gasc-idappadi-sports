/**
 * 🏆 GASC IDAPPADI SMART SPORTS MANAGEMENT SYSTEM
 * 💳 PAYMENT CONTROLLER
 * Comprehensive handler for payment orders, verification, webhooks, admin transactions, and refunds
 */
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const paymentService = require('../services/paymentService');
const { supabase } = require('../config/supabase');
const localStore = require('../data/localStore');
const localDB = require('../database/localDB');

const COLLEGE_NAME = process.env.COLLEGE_NAME || 'Government Arts and Science College, Idappadi';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || 'sportsgascidappadi@gmail.com',
    pass: process.env.EMAIL_PASS || 'aqrapupgrqymlhsh'
  }
});

/**
 * Helper: Find registration record across Supabase, SQLite, and localStore
 */
async function findRegistration(regIdentifier) {
  if (!regIdentifier) return null;

  // Try Supabase external_registrations first
  try {
    const { data } = await supabase
      .from('external_registrations')
      .select('*, competition:competitions(*)')
      .or(`id.eq.${regIdentifier},registration_id.eq.${regIdentifier}`)
      .maybeSingle();
    if (data) {
      data.student_category = data.student_category || 'OTHER_COLLEGE';
      return data;
    }
  } catch (e) {}

  // Try Supabase competition_registrations (Our College internal students)
  try {
    const { data } = await supabase
      .from('competition_registrations')
      .select('*, competition:competitions(*)')
      .or(`id.eq.${regIdentifier},registration_code.eq.${regIdentifier}`)
      .maybeSingle();
    if (data) {
      data.student_category = data.student_category || 'OUR_COLLEGE';
      data.player_name = data.student_name || data.player_name;
      data.college_name = 'Government Arts and Science College, Idappadi';
      return data;
    }
  } catch (e) {}

  // Fallback to SQLite
  try {
    const rows = localDB.query(
      `SELECT * FROM external_registrations WHERE id = ? OR registration_id = ?`,
      [regIdentifier, regIdentifier]
    );
    if (rows && rows.length > 0) {
      rows[0].student_category = rows[0].student_category || 'OTHER_COLLEGE';
      return rows[0];
    }
  } catch (e) {}

  // Fallback to localStore
  try {
    const list = localStore.storeInstance.getTable('external_registrations') || [];
    const item = list.find(r => r.id === regIdentifier || r.registration_id === regIdentifier);
    if (item) {
      item.student_category = item.student_category || 'OTHER_COLLEGE';
      return item;
    }
  } catch (e) {}

  try {
    const cList = localStore.storeInstance.getTable('competition_registrations') || [];
    const cItem = cList.find(r => r.id === regIdentifier || r.registration_code === regIdentifier);
    if (cItem) {
      cItem.student_category = cItem.student_category || 'OUR_COLLEGE';
      cItem.player_name = cItem.student_name || cItem.player_name;
      cItem.college_name = 'Government Arts and Science College, Idappadi';
      return cItem;
    }
  } catch (e) {}

  return null;
}

/**
 * Helper: Find competition record
 */
async function findCompetition(compId) {
  if (!compId) return null;
  try {
    const { data } = await supabase
      .from('competitions')
      .select('*')
      .or(`id.eq.${compId},registration_token.eq.${compId}`)
      .maybeSingle();
    if (data) return data;
  } catch (e) {}

  try {
    const rows = localDB.query(
      `SELECT * FROM competitions WHERE id = ? OR registration_token = ?`,
      [compId, compId]
    );
    if (rows && rows.length > 0) return rows[0];
  } catch (e) {}

  // Fallback to localStore
  try {
    const list = localStore.storeInstance.getTable('competitions') || [];
    const item = list.find(c => String(c.id) === String(compId) || String(c._id) === String(compId) || c.registration_token === compId);
    if (item) return item;
  } catch (e) {}

  return null;
}

/**
 * Helper: Fetch active payment settings
 */
async function getActivePaymentSettings() {
  try {
    const { data } = await supabase
      .from('payment_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();
    if (data) return data;
  } catch (e) {}

  try {
    const rows = localDB.query(`SELECT * FROM payment_settings WHERE id = 'default'`);
    if (rows && rows.length > 0) return rows[0];
  } catch (e) {}

  return {
    provider: 'RAZORPAY',
    is_active: true,
    is_test_mode: true,
    default_team_fee: 500,
    default_individual_fee: 100,
    receiver_name: 'Dr. R. ANITHA (Physical Director)',
    settlement_status: 'KYC_VERIFIED'
  };
}

/**
 * 1. CREATE PAYMENT ORDER
 * Trusted server-side calculation: verifies competition fee from database
 */
exports.createOrder = async (req, res) => {
  try {
    const {
      registrationId,
      competitionId,
      competitionToken,
      studentCategory,
      registrationType,
      studentName,
      collegeName,
      email,
      phone
    } = req.body;

    if (!registrationId && !competitionId && !competitionToken) {
      return res.status(400).json({ success: false, message: 'Registration ID or Competition ID is required.' });
    }

    let reg = null;
    if (registrationId) {
      reg = await findRegistration(registrationId);
    }

    // Check if registration is already paid
    if (reg && (reg.payment_status === 'PAID' || reg.payment_status === 'VERIFIED')) {
      return res.status(400).json({
        success: false,
        code: 'ALREADY_PAID',
        message: 'This registration has already been verified and paid.'
      });
    }

    // Find competition
    const targetCompId = competitionId || reg?.competition_id || competitionToken;
    const comp = await findCompetition(targetCompId);

    // Get settings for fallback fees
    const settings = await getActivePaymentSettings();

    // TRUSTED FEE CALCULATION: Never trust browser-supplied amount
    // Distinguish between Our College vs Other College Students
    const isOurCollege = (studentCategory === 'OUR_COLLEGE') || 
      (reg?.student_category === 'OUR_COLLEGE') || 
      Boolean(collegeName && (collegeName.toLowerCase().includes('idappadi') || collegeName.toLowerCase().includes('gasc')));

    let fee = 0;
    const isTeam = (registrationType || reg?.registration_type || comp?.competition_mode) === 'TEAM';

    if (isOurCollege) {
      if (comp && (comp.our_college_fee_enabled !== undefined && comp.our_college_fee_enabled !== null)) {
        fee = (comp.our_college_fee_enabled === true || comp.our_college_fee_enabled === 'true' || comp.our_college_fee_enabled === 1) 
          ? Math.max(0, Number(comp.our_college_fee || 0)) 
          : 0;
      } else {
        fee = 0; // default Free for Our College
      }
    } else {
      if (comp && (comp.other_college_fee_enabled !== undefined && comp.other_college_fee_enabled !== null)) {
        fee = (comp.other_college_fee_enabled === true || comp.other_college_fee_enabled === 'true' || comp.other_college_fee_enabled === 1) 
          ? Math.max(0, Number(comp.other_college_fee || 0)) 
          : 0;
      } else if (comp && comp.entry_fee !== undefined && comp.entry_fee !== null) {
        fee = Number(comp.entry_fee);
      } else {
        fee = isTeam
          ? Number(settings.default_team_fee || 500)
          : Number(settings.default_individual_fee || 100);
      }
    }

    // Check if free registration
    if (fee <= 0) {
      if (reg) {
        const nowIso = new Date().toISOString();
        const updatePayload = {
          payment_status: 'FREE',
          status: 'APPROVED',
          fee_amount: 0,
          payment_method: 'FREE',
          payment_verified_at: nowIso,
          payment_verified_by: 'System (Free Entry)',
          updated_at: nowIso
        };

        try {
          await supabase.from('external_registrations').update(updatePayload).eq('id', reg.id);
        } catch (e) {}

        try {
          localDB.run(
            `UPDATE external_registrations SET payment_status = 'FREE', status = 'APPROVED', fee_amount = 0, payment_method = 'FREE', updated_at = strftime('%s','now') WHERE id = ?`,
            [reg.id]
          );
          localDB.saveDB();
        } catch (e) {}
      }

      return res.json({
        success: true,
        isFree: true,
        amount: 0,
        amountInRupees: 0,
        message: 'Registration confirmed free of charge.',
        registrationId: reg?.registration_id || reg?.id || null
      });
    }

    // Create Razorpay Order
    const regCode = reg?.registration_id || `GASC-${isOurCollege ? 'INT' : 'EXT'}-${Date.now().toString().slice(-6)}`;
    const effectiveStudentName = studentName || reg?.player_name || reg?.team_name || 'Participant';
    const effectiveCollegeName = collegeName || reg?.college_name || (isOurCollege ? 'Government Arts and Science College, Idappadi' : 'External College');
    const effectiveEmail = email || reg?.participant_email || reg?.college_email || '';
    const effectivePhone = phone || reg?.participant_phone || reg?.college_phone || '';

    const orderResult = await paymentService.createPaymentOrder({
      registrationId: reg?.id || regCode,
      registrationCode: regCode,
      amount: fee,
      currency: 'INR',
      notes: {
        studentCategory: isOurCollege ? 'OUR_COLLEGE' : 'OTHER_COLLEGE',
        collegeName: effectiveCollegeName,
        competitionName: reg?.sport_name || comp?.name || 'Tournament Competition',
        studentName: effectiveStudentName
      }
    });

    const nowIso = new Date().toISOString();
    const paymentRecordId = `pay_rec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // Record initial payment ledger entry
    const paymentData = {
      id: paymentRecordId,
      registration_id: reg?.id || null,
      registration_code: regCode,
      tournament_id: reg?.tournament_id || comp?.tournament_id || null,
      tournament_name: reg?.tournament_name || comp?.tournament_name || 'GASC Idappadi Tournament',
      competition_id: reg?.competition_id || comp?.id || null,
      competition_name: reg?.sport_name || comp?.name || 'Competition',
      provider: orderResult.provider || 'RAZORPAY',
      provider_order_id: orderResult.orderId,
      amount: fee,
      amount_paise: orderResult.amount,
      currency: 'INR',
      status: 'CREATED',
      payer_name: effectiveStudentName,
      payer_email: effectiveEmail,
      payer_phone: effectivePhone,
      college_name: effectiveCollegeName,
      registration_type: isTeam ? 'TEAM' : 'INDIVIDUAL',
      raw_order_payload: orderResult,
      created_at: nowIso,
      updated_at: nowIso
    };

    // Save to Supabase
    try {
      await supabase.from('payments').insert(paymentData);
    } catch (e) {
      console.warn('[PaymentController] Supabase payments insert note:', e.message);
    }

    // Save to SQLite
    try {
      localDB.run(
        `INSERT INTO payments (id, registration_id, registration_code, tournament_id, tournament_name, competition_id, competition_name, provider, provider_order_id, amount, amount_paise, currency, status, payer_name, payer_email, payer_phone, college_name, registration_type, raw_order_payload, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          paymentData.id, paymentData.registration_id, paymentData.registration_code,
          paymentData.tournament_id, paymentData.tournament_name, paymentData.competition_id, paymentData.competition_name,
          paymentData.provider, paymentData.provider_order_id, paymentData.amount, paymentData.amount_paise,
          paymentData.currency, paymentData.status, paymentData.payer_name, paymentData.payer_email, paymentData.payer_phone,
          paymentData.college_name, paymentData.registration_type, JSON.stringify(paymentData.raw_order_payload),
          paymentData.created_at, paymentData.updated_at
        ]
      );
      localDB.saveDB();
    } catch (e) {}

    // Update external_registrations with order_id and expected fee if reg exists
    if (reg && reg.id) {
      try {
        await supabase
          .from('external_registrations')
          .update({
            order_id: orderResult.orderId,
            fee_amount: fee,
            payment_method: orderResult.provider || 'RAZORPAY',
            payment_status: 'PENDING_PAYMENT',
            updated_at: nowIso
          })
          .eq('id', reg.id);
      } catch (e) {}
    }

    return res.json({
      success: true,
      orderId: orderResult.orderId,
      amount: orderResult.amount, // in paise
      amountInRupees: fee,
      currency: 'INR',
      keyId: orderResult.keyId,
      registrationId: reg?.id || null,
      registrationCode: regCode,
      studentName: effectiveStudentName,
      email: effectiveEmail,
      phone: effectivePhone,
      collegeName: effectiveCollegeName,
      competitionName: reg?.sport_name || comp?.name || 'Tournament Competition',
      tournamentName: reg?.tournament_name || 'GASC Idappadi Sports Meet',
      isSandbox: orderResult.isSandbox
    });
  } catch (err) {
    console.error('[PaymentController] createOrder error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 2. VERIFY PAYMENT SIGNATURE
 * Cryptographically verifies Razorpay checkout signature and captures payment
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { orderId, paymentId, signature, registrationId } = req.body;

    if (!orderId || !paymentId) {
      return res.status(400).json({ success: false, message: 'Missing orderId or paymentId.' });
    }

    // 1. Verify Cryptographic Signature
    let isValidSignature = false;
    try {
      isValidSignature = paymentService.verifyPaymentSignature({
        orderId,
        paymentId,
        signature
      });
    } catch (sigErr) {
      return res.status(500).json({ success: false, message: sigErr.message });
    }

    if (!isValidSignature) {
      console.warn(`[PaymentController] ⚠️ Invalid payment signature for order: ${orderId}`);
      // Record payment attempt as failed in DB
      try {
        await supabase
          .from('payments')
          .update({
            status: 'FAILED',
            error_code: 'INVALID_SIGNATURE',
            error_description: 'Tampered or invalid Razorpay payment signature',
            updated_at: new Date().toISOString()
          })
          .eq('provider_order_id', orderId);
      } catch (e) {}

      return res.status(400).json({
        success: false,
        code: 'INVALID_SIGNATURE',
        message: 'Cryptographic payment signature verification failed. Payment cannot be verified.'
      });
    }

    // 2. Fetch payment details from Razorpay or verify payment record
    let paymentDetails = null;
    try {
      paymentDetails = await paymentService.fetchPaymentDetails(paymentId);
    } catch (e) {
      console.warn('[PaymentController] fetchPaymentDetails notice:', e.message);
    }

    const nowIso = new Date().toISOString();
    const verifiedBy = 'Razorpay Server Verification';

    // 3. Atomically Update Payments Ledger
    const updatePaymentPayload = {
      provider_payment_id: paymentId,
      provider_signature: signature,
      status: 'SUCCESS',
      payment_method: paymentDetails?.method || 'online',
      verified_at: nowIso,
      raw_payment_payload: paymentDetails,
      updated_at: nowIso
    };

    try {
      await supabase
        .from('payments')
        .update(updatePaymentPayload)
        .eq('provider_order_id', orderId);
    } catch (e) {
      console.warn('[PaymentController] Supabase payments update note:', e.message);
    }

    try {
      localDB.run(
        `UPDATE payments SET provider_payment_id = ?, provider_signature = ?, status = 'SUCCESS', payment_method = ?, verified_at = ?, updated_at = strftime('%s','now') WHERE provider_order_id = ?`,
        [paymentId, signature, paymentDetails?.method || 'online', nowIso, orderId]
      );
      localDB.saveDB();
    } catch (e) {}

    // 4. Update External Registration Status to PAID & APPROVED
    const updateRegPayload = {
      payment_status: 'PAID',
      status: 'APPROVED',
      payment_id: paymentId,
      order_id: orderId,
      payment_verified_at: nowIso,
      payment_verified_by: verifiedBy,
      updated_at: nowIso
    };

    let reg = null;
    if (registrationId) {
      reg = await findRegistration(registrationId);
    }
    if (!reg) {
      try {
        const { data } = await supabase
          .from('external_registrations')
          .select('*')
          .eq('order_id', orderId)
          .maybeSingle();
        if (data) reg = data;
      } catch (e) {}
    }

    if (reg) {
      try {
        await supabase
          .from('external_registrations')
          .update(updateRegPayload)
          .eq('id', reg.id);
      } catch (e) {}

      try {
        localDB.run(
          `UPDATE external_registrations SET payment_status = 'PAID', status = 'APPROVED', payment_id = ?, order_id = ?, payment_verified_at = ?, payment_verified_by = ?, updated_at = strftime('%s','now') WHERE id = ?`,
          [paymentId, orderId, nowIso, verifiedBy, reg.id]
        );
        localDB.saveDB();
      } catch (e) {}

      // 5. Send Official Confirmation Email with Payment Receipt
      try {
        const targetEmail = reg.participant_email || reg.college_email;
        if (targetEmail && targetEmail.includes('@')) {
          await transporter.sendMail({
            from: `"${COLLEGE_NAME} Sports" <${process.env.EMAIL_USER || 'sportsgascidappadi@gmail.com'}>`,
            to: targetEmail,
            subject: `[GASC Sports] Payment Successful & Registration Approved: ${reg.registration_id}`,
            html: `
              <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;color:#0f172a;">
                <div style="text-align:center;padding-bottom:16px;border-bottom:2px solid #059669;">
                  <h2 style="color:#065f46;margin:0 0 4px 0;">Government Arts and Science College, Idappadi</h2>
                  <p style="color:#64748b;margin:0;font-size:14px;">Department of Physical Education & Sports</p>
                  <h3 style="color:#059669;margin:16px 0 0 0;">✅ Payment Verified & Registration Approved</h3>
                </div>
                <div style="padding:20px 0;font-size:14px;line-height:1.6;">
                  <p>Dear <strong>${reg.player_name || reg.team_name || 'Participant'}</strong>,</p>
                  <p>Your online payment for the tournament registration has been successfully processed and verified.</p>
                  <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
                    <tr style="background:#f8fafc;"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:bold;">Registration ID</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-family:monospace;color:#059669;font-weight:bold;">${reg.registration_id}</td></tr>
                    <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:bold;">Razorpay Payment ID</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-family:monospace;">${paymentId}</td></tr>
                    <tr style="background:#f8fafc;"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:bold;">Order ID</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-family:monospace;">${orderId}</td></tr>
                    <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:bold;">College</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${reg.college_name}</td></tr>
                    <tr style="background:#f8fafc;"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:bold;">Competition</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${reg.sport_name || 'Sports Meet'}</td></tr>
                    <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:bold;">Amount Paid</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:bold;color:#0f172a;">₹${reg.fee_amount || 0} INR</td></tr>
                    <tr style="background:#f8fafc;"><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:bold;">Payment Status</td><td style="padding:8px 12px;border:1px solid #e2e8f0;color:#059669;font-weight:bold;">PAID / VERIFIED</td></tr>
                    <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:bold;">Date & Time</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${new Date().toLocaleString('en-IN')}</td></tr>
                  </table>
                  <p style="margin-top:20px;">Please bring your college ID card and this registration reference on the day of the competition.</p>
                </div>
                <div style="border-top:1px solid #e2e8f0;padding-top:16px;text-align:center;font-size:12px;color:#94a3b8;">
                  Government Arts and Science College, Idappadi - 637 101, Salem District, Tamil Nadu.
                </div>
              </div>
            `
          });
        }
      } catch (mailErr) {
        console.warn('[PaymentController] Confirmation email warning:', mailErr.message);
      }
    }

    return res.json({
      success: true,
      message: 'Payment signature verified successfully. Registration confirmed.',
      paymentId,
      orderId,
      status: 'PAID',
      registrationId: reg?.registration_id || reg?.id
    });
  } catch (err) {
    console.error('[PaymentController] verifyPayment error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 3. RAZORPAY HTTPS WEBHOOK HANDLER
 * Idempotent, cryptographic signature verification using exact raw body
 */
exports.handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody || req.body;

    if (!signature) {
      return res.status(400).json({ success: false, message: 'Missing x-razorpay-signature header' });
    }

    // Verify webhook signature
    const isValid = paymentService.verifyWebhookSignature({
      rawBody: typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody),
      signature
    });

    if (!isValid) {
      console.warn('[PaymentController] ⚠️ Unauthorized webhook signature mismatch.');
      return res.status(400).json({ success: false, message: 'Invalid webhook signature.' });
    }

    const event = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    const eventId = event.event_id || event.id || `evt_${Date.now()}`;
    const eventType = event.event;

    // Idempotency check: Ignore already processed event
    try {
      const { data: existing } = await supabase
        .from('payment_webhook_events')
        .select('id')
        .eq('id', eventId)
        .maybeSingle();

      if (existing) {
        return res.status(200).json({ status: 'already_processed', eventId });
      }
    } catch (e) {}

    // Record webhook event
    try {
      await supabase.from('payment_webhook_events').insert({
        id: eventId,
        event_type: eventType,
        provider: 'RAZORPAY',
        payload: event,
        processed: true,
        received_at: new Date().toISOString()
      });
    } catch (e) {}

    // Process specific events
    const paymentEntity = event.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;
    const paymentId = paymentEntity?.id;

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const nowIso = new Date().toISOString();

      // Update payment record
      if (orderId) {
        try {
          await supabase
            .from('payments')
            .update({
              status: 'SUCCESS',
              provider_payment_id: paymentId,
              verified_at: nowIso,
              updated_at: nowIso
            })
            .eq('provider_order_id', orderId);
        } catch (e) {}

        // Update external registration
        try {
          await supabase
            .from('external_registrations')
            .update({
              payment_status: 'PAID',
              status: 'APPROVED',
              payment_id: paymentId,
              payment_verified_at: nowIso,
              payment_verified_by: 'Razorpay Webhook',
              updated_at: nowIso
            })
            .eq('order_id', orderId);
        } catch (e) {}
      }
    } else if (eventType === 'payment.failed') {
      if (orderId) {
        try {
          await supabase
            .from('payments')
            .update({
              status: 'FAILED',
              error_code: paymentEntity?.error_code || 'PAYMENT_FAILED',
              error_description: paymentEntity?.error_description || 'Payment failed at gateway',
              updated_at: new Date().toISOString()
            })
            .eq('provider_order_id', orderId);
        } catch (e) {}
      }
    } else if (eventType === 'refund.processed') {
      const refundEntity = event.payload?.refund?.entity;
      if (paymentId) {
        try {
          await supabase
            .from('payments')
            .update({
              status: 'REFUNDED',
              refund_id: refundEntity?.id,
              refund_status: 'PROCESSED',
              refund_amount: (refundEntity?.amount || 0) / 100,
              refunded_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('provider_payment_id', paymentId);
        } catch (e) {}
      }
    }

    return res.status(200).json({ status: 'ok', eventId });
  } catch (err) {
    console.error('[PaymentController] handleWebhook error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 4. GET PAYMENT STATUS BY ORDER ID (Verification Fallback)
 */
exports.getPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

    let payment = null;
    try {
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('provider_order_id', orderId)
        .maybeSingle();
      if (data) payment = data;
    } catch (e) {}

    if (!payment) {
      const rows = localDB.query(`SELECT * FROM payments WHERE provider_order_id = ?`, [orderId]);
      if (rows && rows.length > 0) payment = rows[0];
    }

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found for this order.' });
    }

    return res.json({
      success: true,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      paymentId: payment.provider_payment_id,
      orderId: payment.provider_order_id,
      registrationCode: payment.registration_code,
      registrationId: payment.registration_id
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 5. GET PAYMENT RECEIPT
 */
exports.getReceipt = async (req, res) => {
  try {
    const { paymentId } = req.params;
    if (!paymentId) {
      return res.status(400).json({ success: false, message: 'Payment ID is required.' });
    }

    let payment = null;
    try {
      const { data } = await supabase
        .from('payments')
        .select('*, registration:external_registrations(*)')
        .or(`id.eq.${paymentId},provider_payment_id.eq.${paymentId},provider_order_id.eq.${paymentId}`)
        .maybeSingle();
      if (data) payment = data;
    } catch (e) {}

    if (!payment) {
      const rows = localDB.query(
        `SELECT * FROM payments WHERE id = ? OR provider_payment_id = ? OR provider_order_id = ?`,
        [paymentId, paymentId, paymentId]
      );
      if (rows && rows.length > 0) payment = rows[0];
    }

    if (!payment) {
      try {
        const { data: extReg } = await supabase
          .from('external_registrations')
          .select('*, competition:competitions(*)')
          .or(`id.eq.${paymentId},registration_id.eq.${paymentId}`)
          .maybeSingle();
        if (extReg) {
          payment = {
            id: extReg.id,
            registration_code: extReg.registration_id,
            provider_payment_id: extReg.payment_id || extReg.transaction_ref || 'N/A',
            provider_order_id: extReg.order_id || extReg.registration_id,
            amount: extReg.fee_amount || 0,
            currency: 'INR',
            status: extReg.payment_status === 'VERIFIED' ? 'SUCCESS' : (extReg.payment_status || 'PENDING'),
            verified_at: extReg.payment_verified_at || extReg.updated_at,
            created_at: extReg.created_at,
            tournament_name: extReg.tournament_name || 'GASC Idappadi Sports Meet',
            competition_name: extReg.sport_name || (extReg.competition && extReg.competition.name) || 'Competition',
            college_name: extReg.college_name,
            payer_name: extReg.player_name || extReg.team_name || 'Participant',
            payment_method: extReg.payment_method || 'UPI / QR'
          };
        }
      } catch (e) {}
    }

    if (!payment) {
      try {
        const localList = localStore.storeInstance.getTable('external_registrations') || [];
        const extReg = localList.find(r => r.id === paymentId || r.registration_id === paymentId);
        if (extReg) {
          payment = {
            id: extReg.id,
            registration_code: extReg.registration_id,
            provider_payment_id: extReg.payment_id || extReg.transaction_ref || 'N/A',
            provider_order_id: extReg.order_id || extReg.registration_id,
            amount: extReg.fee_amount || 0,
            currency: 'INR',
            status: extReg.payment_status === 'VERIFIED' ? 'SUCCESS' : (extReg.payment_status || 'PENDING'),
            verified_at: extReg.payment_verified_at || extReg.updated_at,
            created_at: extReg.created_at,
            tournament_name: extReg.tournament_name || 'GASC Idappadi Sports Meet',
            competition_name: extReg.sport_name || (extReg.competition && extReg.competition.name) || 'Competition',
            college_name: extReg.college_name,
            payer_name: extReg.player_name || extReg.team_name || 'Participant',
            payment_method: extReg.payment_method || 'UPI / QR'
          };
        }
      } catch (e) {}
    }

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Receipt not found.' });
    }

    return res.json({
      success: true,
      receipt: {
        receiptNumber: `REC-${(payment.id || 'REG').substring(0, 12).toUpperCase()}`,
        registrationCode: payment.registration_code,
        paymentId: payment.provider_payment_id || 'N/A',
        orderId: payment.provider_order_id,
        amount: payment.amount,
        currency: payment.currency || 'INR',
        status: payment.status,
        date: payment.verified_at || payment.created_at,
        tournamentName: payment.tournament_name || 'GASC Idappadi Sports Meet',
        competitionName: payment.competition_name || 'Sports Competition',
        collegeName: payment.college_name,
        payerName: payment.payer_name,
        paymentMethod: payment.payment_method || 'Online',
        collegeIdentity: {
          name: COLLEGE_NAME,
          department: 'Department of Physical Education and Sports',
          location: 'Idappadi - 637 101, Salem District, Tamil Nadu'
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 6. ADMIN: TRANSACTIONS LIST & RECONCILIATION DASHBOARD
 * Search & Filters: tournament, competition, date range, status, student/regId/paymentId
 */
exports.getAdminTransactions = async (req, res) => {
  try {
    const {
      tournamentId,
      competitionId,
      status,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 50
    } = req.query;

    let query = supabase
      .from('payments')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (tournamentId && tournamentId !== 'ALL') {
      query = query.eq('tournament_id', tournamentId);
    }
    if (competitionId && competitionId !== 'ALL') {
      query = query.eq('competition_id', competitionId);
    }
    if (status && status !== 'ALL') {
      query = query.eq('status', status.toUpperCase());
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate + 'T23:59:59.999Z');
    }
    if (search && search.trim()) {
      const q = search.trim();
      query = query.or(`registration_code.ilike.%${q}%,provider_payment_id.ilike.%${q}%,provider_order_id.ilike.%${q}%,payer_name.ilike.%${q}%,college_name.ilike.%${q}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    let transactions = [];
    let totalCount = 0;

    try {
      const { data, count, error } = await query;
      if (!error && data) {
        transactions = data;
        totalCount = count || data.length;
      }
    } catch (e) {
      console.warn('[PaymentController] getAdminTransactions Supabase warning:', e.message);
    }

    // SQLite fallback if empty or offline
    if (transactions.length === 0) {
      try {
        let sql = `SELECT * FROM payments WHERE 1=1`;
        const params = [];
        if (status && status !== 'ALL') {
          sql += ` AND status = ?`;
          params.push(status.toUpperCase());
        }
        if (search && search.trim()) {
          sql += ` AND (registration_code LIKE ? OR provider_payment_id LIKE ? OR provider_order_id LIKE ? OR payer_name LIKE ? OR college_name LIKE ?)`;
          const s = `%${search.trim()}%`;
          params.push(s, s, s, s, s);
        }
        sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        params.push(Number(limit), Number(from));
        transactions = localDB.query(sql, params) || [];
        totalCount = transactions.length;
      } catch (err2) {}
    }

    // Pull from external_registrations to merge actual student fee payments
    try {
      const { data: extRegs } = await supabase
        .from('external_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (Array.isArray(extRegs) && extRegs.length > 0) {
        const extAsTransactions = extRegs.map(r => {
          let utr = r.payment_id || r.transaction_ref || '';
          let screenshot = r.supporting_document || r.payment_screenshot || '';
          if (r.remarks && typeof r.remarks === 'string') {
            try {
              const rem = JSON.parse(r.remarks);
              if (!utr) utr = rem.utr || rem.transaction_ref || rem.submittedUtr || '';
              if (!screenshot) screenshot = rem.payment_screenshot || '';
            } catch(e) {}
          }
          const isVerified = (r.payment_status || '').toUpperCase() === 'VERIFIED' || (r.status || '').toUpperCase() === 'APPROVED';
          const isFailed = (r.payment_status || '').toUpperCase() === 'REJECTED' || (r.payment_status || '').toUpperCase() === 'FAILED';
          const pStatus = isVerified ? 'SUCCESS' : (isFailed ? 'FAILED' : 'CREATED');

          return {
            id: r.id,
            registration_code: r.registration_id || `GASC-IC-${r.id}`,
            payer_name: r.player_name || r.team_name || 'Participant',
            college_name: r.college_name || 'Other College',
            competition_name: r.sport_name || 'Championship',
            amount: Number(r.fee_amount) || (r.registration_type === 'TEAM' ? 500 : 100),
            payment_method: r.payment_method || 'UPI / QR',
            provider_payment_id: utr || '-',
            provider_order_id: r.registration_id || '-',
            payment_screenshot: screenshot,
            status: pStatus,
            created_at: r.created_at,
            verified_at: r.payment_verified_at || r.updated_at
          };
        });

        // Exclude mock simulated orders and merge real external registrations
        transactions = [...extAsTransactions, ...transactions.filter(t => !t.provider_order_id?.startsWith('order_sim_'))];
        totalCount = transactions.length;
      }
    } catch (e) {
      console.warn('extRegs merge error in getAdminTransactions:', e.message);
    }

    // Calculate verified KPI collection metrics
    let totalSuccessfulCollections = 0;
    let totalSuccessfulCount = 0;
    let totalPendingCount = 0;
    let totalFailedCount = 0;
    let totalRefundedAmount = 0;
    let totalRefundedCount = 0;

    transactions.forEach(p => {
      const amt = Number(p.amount) || 0;
      if (p.status === 'SUCCESS') {
        totalSuccessfulCollections += amt;
        totalSuccessfulCount++;
      } else if (p.status === 'CREATED' || p.status === 'ATTEMPTED') {
        totalPendingCount++;
      } else if (p.status === 'FAILED') {
        totalFailedCount++;
      } else if (p.status === 'REFUNDED') {
        totalRefundedCount++;
        totalRefundedAmount += Number(p.refund_amount || amt);
      }
    });

    return res.json({
      success: true,
      transactions,
      pagination: {
        total: totalCount,
        page: Number(page),
        limit: Number(limit)
      },
      metrics: {
        totalSuccessfulCollections,
        totalSuccessfulCount,
        totalPendingCount,
        totalFailedCount,
        totalRefundedAmount,
        totalRefundedCount,
        currency: 'INR'
      }
    });
  } catch (err) {
    console.error('[PaymentController] getAdminTransactions error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 7. ADMIN: INITIATE AUTHORIZED REFUND
 */
exports.adminInitiateRefund = async (req, res) => {
  try {
    const { paymentId, amount, reason } = req.body;
    if (!paymentId) {
      return res.status(400).json({ success: false, message: 'Payment ID is required.' });
    }

    const adminUser = req.user?.name || req.user?.username || 'Sports Admin';

    // Find payment record
    let payment = null;
    try {
      const { data } = await supabase
        .from('payments')
        .select('*')
        .or(`id.eq.${paymentId},provider_payment_id.eq.${paymentId}`)
        .maybeSingle();
      if (data) payment = data;
    } catch (e) {}

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    if (payment.status !== 'SUCCESS') {
      return res.status(400).json({
        success: false,
        message: `Only successful payments can be refunded. Current status is ${payment.status}.`
      });
    }

    const refundAmount = amount !== undefined && Number(amount) > 0 ? Number(amount) : payment.amount;

    // Call Razorpay Refund API
    const refundRes = await paymentService.initiateRefund({
      paymentId: payment.provider_payment_id || payment.id,
      amount: refundAmount,
      notes: {
        reason: reason || 'Authorized Administrative Refund',
        refundedBy: adminUser
      }
    });

    const nowIso = new Date().toISOString();

    // Update payment record in database
    try {
      await supabase
        .from('payments')
        .update({
          status: 'REFUNDED',
          refund_id: refundRes.id,
          refund_status: refundRes.status || 'PROCESSED',
          refund_amount: refundAmount,
          refund_reason: reason || 'Administrative Refund',
          refunded_at: nowIso,
          refunded_by: adminUser,
          updated_at: nowIso
        })
        .eq('id', payment.id);
    } catch (e) {}

    // Update registration payment status
    if (payment.registration_id) {
      try {
        await supabase
          .from('external_registrations')
          .update({
            payment_status: 'REFUNDED',
            status: 'CANCELLED',
            updated_at: nowIso
          })
          .eq('id', payment.registration_id);
      } catch (e) {}
    }

    return res.json({
      success: true,
      message: `Refund of ₹${refundAmount} successfully processed via Razorpay.`,
      refundId: refundRes.id,
      amount: refundAmount,
      status: 'REFUNDED'
    });
  } catch (err) {
    console.error('[PaymentController] adminInitiateRefund error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 8. ADMIN: GET PAYMENT & SETTLEMENT SETTINGS (Safe, No Secrets Exposed)
 */
exports.getAdminSettings = async (req, res) => {
  try {
    const status = paymentService.getGatewayStatus();
    const settings = await getActivePaymentSettings();

    let history = [];
    try {
      const { data } = await supabase
        .from('payment_settings_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (data) history = data;
    } catch (e) {}

    return res.json({
      success: true,
      gateway: status,
      settings: {
        provider: settings.provider || 'RAZORPAY',
        isActive: settings.is_active !== undefined ? Boolean(settings.is_active) : true,
        isTestMode: settings.is_test_mode !== undefined ? Boolean(settings.is_test_mode) : true,
        keyIdMasked: status.keyId,
        publicKey: status.publicKey,
        merchantId: settings.merchant_id || 'acc_GASC_SPORTS',
        receiverName: settings.receiver_name || 'Dr. R. ANITHA (Physical Director)',
        receiverDepartment: settings.receiver_department || 'Department of Physical Education & Sports',
        institutionName: settings.institution_name || 'Government Arts and Science College, Idappadi',
        settlementAccountTitle: settings.settlement_account_title || 'Sports Fund Account (Authorized Representative)',
        settlementBankName: settings.settlement_bank_name || 'State Bank of India',
        settlementBranch: settings.settlement_branch || 'Idappadi Branch',
        settlementStatus: settings.settlement_status || 'KYC_VERIFIED',
        settlementAccountMask: settings.settlement_account_mask || '••••••••4892',
        currency: 'INR',
        defaultTeamFee: settings.default_team_fee || 500,
        defaultIndividualFee: settings.default_individual_fee || 100,
        allowFreeRegistration: settings.allow_free_registration !== undefined ? Boolean(settings.allow_free_registration) : true,
        configVersion: settings.config_version || 1,
        updatedBy: settings.updated_by || 'Admin',
        updatedAt: settings.updated_at
      },
      history
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 9. ADMIN: SAVE DYNAMIC RECEIVING ACCOUNT & PAYMENT SETTINGS
 */
exports.saveAdminSettings = async (req, res) => {
  try {
    const {
      receiverName,
      receiverDepartment,
      institutionName,
      merchantId,
      settlementAccountTitle,
      settlementBankName,
      settlementBranch,
      settlementStatus,
      settlementAccountMask,
      defaultTeamFee,
      defaultIndividualFee,
      allowFreeRegistration,
      isTestMode,
      isActive,
      changeSummary
    } = req.body;

    const adminUser = req.user?.name || req.user?.username || 'Sports Admin';
    const current = await getActivePaymentSettings();
    const newVersion = (Number(current.config_version) || 1) + 1;
    const nowIso = new Date().toISOString();

    const newRecord = {
      id: 'default',
      provider: 'RAZORPAY',
      is_active: isActive !== undefined ? Boolean(isActive) : true,
      is_test_mode: isTestMode !== undefined ? Boolean(isTestMode) : true,
      merchant_id: merchantId || current.merchant_id || 'acc_GASC_SPORTS',
      receiver_name: (receiverName || current.receiver_name || '').trim(),
      receiver_department: (receiverDepartment || current.receiver_department || '').trim(),
      institution_name: (institutionName || current.institution_name || COLLEGE_NAME).trim(),
      settlement_account_title: (settlementAccountTitle || current.settlement_account_title || '').trim(),
      settlement_bank_name: (settlementBankName || current.settlement_bank_name || 'State Bank of India').trim(),
      settlement_branch: (settlementBranch || current.settlement_branch || 'Idappadi Branch').trim(),
      settlement_status: settlementStatus || current.settlement_status || 'KYC_VERIFIED',
      settlement_account_mask: settlementAccountMask || current.settlement_account_mask || '••••••••4892',
      default_team_fee: defaultTeamFee !== undefined ? Number(defaultTeamFee) : 500,
      default_individual_fee: defaultIndividualFee !== undefined ? Number(defaultIndividualFee) : 100,
      allow_free_registration: allowFreeRegistration !== undefined ? Boolean(allowFreeRegistration) : true,
      config_version: newVersion,
      updated_by: adminUser,
      updated_at: nowIso
    };

    // Save in Supabase
    try {
      await supabase.from('payment_settings').upsert(newRecord, { onConflict: 'id' });
    } catch (e) {
      console.warn('payment_settings save note:', e.message);
    }

    // Save in SQLite
    try {
      localDB.run(
        `INSERT OR REPLACE INTO payment_settings (id, receiver_name, is_enabled, is_active, version, updated_by, updated_at) VALUES (?,?,?,?,?,?,strftime('%s','now'))`,
        [newRecord.id, newRecord.receiver_name, newRecord.is_active ? 1 : 0, newRecord.is_active ? 1 : 0, newVersion, adminUser]
      );
      localDB.saveDB();
    } catch (e) {}

    // Audit log
    const historyItem = {
      id: `psh_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      setting_id: 'default',
      config_version: newVersion,
      provider: 'RAZORPAY',
      is_test_mode: newRecord.is_test_mode,
      receiver_name: newRecord.receiver_name,
      merchant_id: newRecord.merchant_id,
      settlement_status: newRecord.settlement_status,
      settlement_account_mask: newRecord.settlement_account_mask,
      default_team_fee: newRecord.default_team_fee,
      default_individual_fee: newRecord.default_individual_fee,
      change_summary: changeSummary || `Updated payment configuration to v${newVersion}`,
      changed_by: adminUser,
      created_at: nowIso
    };

    try {
      await supabase.from('payment_settings_history').insert(historyItem);
    } catch (e) {}

    return res.json({
      success: true,
      message: 'Payment and receiving account configuration successfully updated.',
      configVersion: newVersion,
      updatedAt: nowIso
    });
  } catch (err) {
    console.error('[PaymentController] saveAdminSettings error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
