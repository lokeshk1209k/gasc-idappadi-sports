const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch(e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

async function testAll() {
  console.log('--- Logging in as Admin ---');
  const loginRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/admin-login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@gascidappadi.edu.in', password: 'admin123' });

  console.log('Login status:', loginRes.status, 'Token:', !!loginRes.data?.token);
  const token = loginRes.data.token;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 1. Roster Manual Add
  console.log('\n--- 1. Testing Roster Manual Add ---');
  const testStudentReg = `23ROST${Math.floor(Math.random()*900 + 100)}`;
  const rosterRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/roster/manual',
    method: 'POST',
    headers
  }, {
    registerNumber: testStudentReg,
    name: 'Roster Candidate Test',
    department: 'Commerce',
    year: 'II Year',
    section: 'A',
    gender: 'Male'
  });
  console.log('Roster Manual Add:', rosterRes.status, rosterRes.data?.success, rosterRes.data?.message);

  // 2. Add Sport
  console.log('\n--- 2. Testing Add Sport ---');
  const sportRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/sports',
    method: 'POST',
    headers
  }, {
    name: `Carrom Board ${Date.now()}`,
    description: 'Indoor strategy game for college championship',
    category: 'Indoor Games',
    indoorOutdoor: 'Indoor',
    playerCount: 4,
    coach: 'Dr. R. Anitha',
    icon: 'bi-grid-3x3'
  });
  console.log('Sport Add:', sportRes.status, sportRes.data?.success, sportRes.data?.message);
  const createdSportId = sportRes.data?.sport?.id || 'sp_cricket_01';

  // 3. Add Equipment
  console.log('\n--- 3. Testing Add Equipment ---');
  const eqCode = `EQ-TEST-${Math.floor(Math.random()*900 + 100)}`;
  const eqRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/equipment',
    method: 'POST',
    headers
  }, {
    name: 'Carrom Boards Championship Grade',
    code: eqCode,
    sportId: createdSportId,
    category: 'Board & Accessories',
    totalQuantity: 8,
    minimumStock: 2,
    purchasePrice: 2500,
    supplier: 'Salem Sports Goods Co.',
    storageLocation: 'Main Sports Room, Shelf C2',
    condition: 'New'
  });
  console.log('Equipment Add:', eqRes.status, eqRes.data?.success, eqRes.data?.message);
  const createdEqId = eqRes.data?.equipment?.id;

  // 4. Issue Equipment
  console.log('\n--- 4. Testing Issue Equipment ---');
  const issueRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/equipment/issue',
    method: 'POST',
    headers
  }, {
    studentIdentifier: '23UGCS101',
    equipmentId: createdEqId || 'eq_volleyball_01',
    quantity: 1,
    expectedReturnDate: '2026-10-01',
    purpose: 'Inter-Department Practice'
  });
  console.log('Equipment Issue:', issueRes.status, issueRes.data?.success, issueRes.data?.message);
  const txId = issueRes.data?.transaction?.id;

  // 5. Return Equipment
  if (txId) {
    console.log('\n--- 5. Testing Return Equipment ---');
    const returnRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/equipment/return',
      method: 'POST',
      headers
    }, {
      transactionId: txId,
      returnCondition: 'Good',
      remarks: 'Returned in perfect condition on time'
    });
    console.log('Equipment Return:', returnRes.status, returnRes.data?.success, returnRes.data?.message);
  }

  // 6. Add Competition
  console.log('\n--- 6. Testing Add Competition ---');
  const compRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/competitions',
    method: 'POST',
    headers
  }, {
    name: `GASC Annual Carrom Tournament ${Date.now()}`,
    sportId: createdSportId,
    type: 'Inter-Department',
    level: 'College',
    venue: 'Indoor Auditorium',
    date: '2026-10-10',
    startTime: '09:30 AM',
    endTime: '04:30 PM',
    registrationEnd: '2026-10-05',
    maxParticipants: 32,
    description: 'Knockout tournament for UG and PG students.'
  });
  console.log('Competition Add:', compRes.status, compRes.data?.success, compRes.data?.message);

  // 7. Add Team
  console.log('\n--- 7. Testing Add Team ---');
  const teamRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/teams',
    method: 'POST',
    headers
  }, {
    captainName: 'Arun Kumar S',
    sportId: createdSportId,
    department: 'Computer Science',
    year: 'II Year',
    phone: '9842154321'
  });
  console.log('Team Add:', teamRes.status, teamRes.data?.success, teamRes.data?.message);

  // 8. Add Achievement
  console.log('\n--- 8. Testing Add Achievement ---');
  const achRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/achievements',
    method: 'POST',
    headers
  }, {
    studentIdentifier: '23UGCS101',
    sportId: createdSportId,
    title: '🥇 Gold Medal – Carrom Singles Championship',
    medal: 'Gold',
    position: '1st Place / Winner',
    year: '2025 - 2026',
    description: 'Undefeated in all 5 tournament rounds.'
  });
  console.log('Achievement Add:', achRes.status, achRes.data?.success, achRes.data?.message);

  // 9. Add Notification / Broadcast
  console.log('\n--- 9. Testing Add Broadcast Notification ---');
  const notifyRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/notifications',
    method: 'POST',
    headers
  }, {
    title: 'Upcoming Inter-College Meet Selection Trials',
    message: 'Selection trials for all sports disciplines will take place next Monday.',
    category: 'Tournament',
    targetType: 'All',
    priority: 'High'
  });
  console.log('Notification Broadcast:', notifyRes.status, notifyRes.data?.success, notifyRes.data?.message);

  // 10. Add External Competition
  console.log('\n--- 10. Testing Add External Competition ---');
  const extCompRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/external-competitions',
    method: 'POST',
    headers
  }, {
    title: `Periyar University Inter-Collegiate Meet ${Date.now()}`,
    sportId: createdSportId,
    sportName: 'Carrom',
    level: 'University',
    hostInstitution: 'Periyar University, Salem',
    venue: 'University Indoor Stadium, Salem',
    startDate: '2026-11-05',
    endDate: '2026-11-07',
    registrationDeadline: '2026-10-25'
  });
  console.log('External Comp Add:', extCompRes.status, extCompRes.data?.success, extCompRes.data?.message);

  // 11. Add Sports News
  console.log('\n--- 11. Testing Add Sports News ---');
  const newsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/sports-news',
    method: 'POST',
    headers
  }, {
    title: `GASC Idappadi Clinches Gold at Zonal Championship! ${Date.now()}`,
    category: 'College Victory',
    summary: 'Our college athletes won top honours in multiple track and field events.',
    content: 'Dr. R. Anitha praised all athletes for their dedicated daily practice and winning spirit.',
    publishDate: '2026-09-16',
    isBreaking: true
  });
  console.log('Sports News Add:', newsRes.status, newsRes.data?.success, newsRes.data?.message);
}

testAll().catch(console.error);
