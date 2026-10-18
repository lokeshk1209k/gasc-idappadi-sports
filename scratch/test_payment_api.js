const http = require('http');

function get(path) {
  return new Promise((resolve) => {
    http.get({ hostname: 'localhost', port: 5003, path }, (res) => {
      let resp = '';
      res.on('data', chunk => resp += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(resp) }));
    });
  });
}

function post(path, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 5003,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let resp = '';
      res.on('data', chunk => resp += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(resp) }));
    });
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log('--- Test 6: Disable Payments ---');
  await post('/api/inter-college/admin/payment-settings', {
    receiverName: 'Dr. R. ANITHA',
    gpayNumber: '9443218765',
    upiId: 'sportsgasc@sbi',
    isActive: false
  });
  const pubDisabled = await get('/api/inter-college/payment-settings');
  console.log('When disabled, isEnabled =', pubDisabled.body.settings?.isEnabled);

  console.log('--- Re-enabling Payments for production use ---');
  await post('/api/inter-college/admin/payment-settings', {
    receiverName: 'Dr. R. ANITHA (Physical Director) / GASC Sports Account',
    gpayNumber: '9443218765',
    upiId: 'sportsgasc@sbi',
    isActive: true,
    paymentMode: 'MANUAL_UPI',
    instructions: '1. Scan the QR code or pay to the UPI ID / GPay number.\n2. Complete payment in your UPI app and note the 12-digit UTR reference number.\n3. Enter the UTR number in registration form and submit.'
  });
  const pubEnabled = await get('/api/inter-college/payment-settings');
  console.log('Re-enabled: isEnabled =', pubEnabled.body.settings?.isEnabled, 'Version =', pubEnabled.body.settings?.configVersion);
}

run();
