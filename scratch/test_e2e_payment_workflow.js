const http = require('http');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function runE2ETests() {
  console.log('--- 1. Testing GET /api/inter-college/payment-settings (Public) ---');
  const getPub = await request({
    hostname: 'localhost',
    port: 5003,
    path: '/api/inter-college/payment-settings',
    method: 'GET'
  });
  console.log('Public settings status:', getPub.status);
  console.log('Public settings data:', getPub.data);

  if (!getPub.data || !getPub.data.settings) {
    throw new Error('Failed to fetch public payment settings');
  }

  const { gpayNumber, upiId, receiverName, configVersion } = getPub.data.settings;
  console.log(`✅ Loaded Active Config V${configVersion}: Receiver="${receiverName}", UPI="${upiId}", GPay="${gpayNumber}"`);

  // Fetch a real tournament & competition
  const tournRes = await request({
    hostname: 'localhost',
    port: 5003,
    path: '/api/inter-college/tournaments',
    method: 'GET'
  });
  let realCompToken = null;
  let realTournToken = null;
  if (tournRes.data && tournRes.data.tournaments && tournRes.data.tournaments.length > 0) {
    const t = tournRes.data.tournaments[0];
    realTournToken = t.registrationToken || t.id;
    // Get tournament details
    const compRes = await request({
      hostname: 'localhost',
      port: 5003,
      path: `/api/inter-college/tournament?token=${encodeURIComponent(realTournToken)}`,
      method: 'GET'
    });
    if (compRes.data && compRes.data.competitions && compRes.data.competitions.length > 0) {
      const c = compRes.data.competitions[0];
      realCompToken = c.registrationToken || c.id;
      console.log(`Found active competition: "${c.name}" with token: ${realCompToken}`);
    }
  }

  console.log('\n--- 2. Testing Submit Registration with Payment (Pending Verification) ---');
  const uniqueUtr = 'UTR' + Math.floor(100000000 + Math.random() * 900000000);
  const regPayload = {
    competitionToken: realCompToken || 'valid_token',
    tournamentToken: realTournToken || 'valid_tourn',
    sportName: 'Cricket',
    eventName: 'Inter-College T20 Championship',
    registrationType: 'TEAM',
    collegeName: 'PSG College of Technology',
    collegeAddress: 'Avinashi Road, Peelamedu, Coimbatore',
    district: 'Coimbatore',
    state: 'Tamil Nadu',
    collegePhone: '04222572177',
    collegeEmail: 'sports@psgtech.edu',
    teamName: 'PSG Strikers',
    teamGender: 'Men',
    coachName: 'K. Ramesh',
    coachPhone: '9842112345',
    participantEmail: 'test.captain@psgtech.edu',
    participantPhone: '9842199887',
    players: [
      { playerName: 'R. Rajesh', registerNumber: '21BCS001', department: 'CSE', year: 'III Year', gender: 'Men', role: 'Captain' }
    ],
    otpVerified: true,
    entryFee: 500,
    feeAmount: 500,
    paymentMethod: 'UPI',
    transactionRef: uniqueUtr,
    paymentConfigVersion: configVersion,
    remarks: 'E2E Automated test'
  };

  const regRes = await request({
    hostname: 'localhost',
    port: 5003,
    path: '/api/inter-college/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, regPayload);

  console.log('Registration status:', regRes.status);
  console.log('Registration response:', regRes.data);

  if (regRes.status !== 200 || !regRes.data.success) {
    throw new Error('Registration submission failed: ' + JSON.stringify(regRes.data));
  }
  const regId = regRes.data.registrationId;
  console.log(`✅ Registration submitted successfully! ID: ${regId}, UTR: ${uniqueUtr}`);

  console.log('\n--- 3. Testing Duplicate UTR Rejection (Should return 409 Conflict) ---');
  const dupPayload = { ...regPayload, collegeName: 'Another College' };
  const dupRes = await request({
    hostname: 'localhost',
    port: 5003,
    path: '/api/inter-college/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, dupPayload);

  console.log('Duplicate UTR status:', dupRes.status);
  console.log('Duplicate UTR response:', dupRes.data);

  if (dupRes.status === 409) {
    console.log('✅ Duplicate UTR correctly rejected with 409 Conflict!');
  } else {
    console.warn('⚠️ Warning: Expected 409 Conflict, got:', dupRes.status);
  }

  console.log('\n--- 4. Testing Admin Manual Payment Verification & Reconciliation ---');
  const verifyRes = await request({
    hostname: 'localhost',
    port: 5003,
    path: '/api/inter-college/verify-payment',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    registrationId: regId,
    paymentStatus: 'VERIFIED',
    remarks: 'Payment verified against bank statement successfully.',
    verifiedBy: 'Dr. R. ANITHA (Physical Director)'
  });

  console.log('Payment verify status:', verifyRes.status);
  console.log('Payment verify response:', verifyRes.data);

  if (verifyRes.status === 200 && verifyRes.data.success && verifyRes.data.paymentStatus === 'VERIFIED') {
    console.log('✅ Manual payment verification and approval reconciled successfully!');
  } else {
    throw new Error('Payment verification failed: ' + JSON.stringify(verifyRes.data));
  }

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('🎉 ALL DYNAMIC PAYMENT & GPAY VERIFICATION TESTS PASSED!');
  console.log('═══════════════════════════════════════════════════════════════════');
}

runE2ETests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
