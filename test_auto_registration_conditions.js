/**
 * Automated Verification: Tournament Automatic Registration Open & Close Conditions
 * Run: node test_auto_registration_conditions.js
 */

const assert = require('assert');
const { computeRegistrationStatus, createCompetition, registerForCompetition, getAllCompetitions } = require('./server/controllers/competitionController');
const localStore = require('./server/data/localStore');

function mockRes() {
  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    }
  };
  return res;
}

async function runTests() {
  console.log('🧪 Starting Automatic Registration Open & Close Verification...\n');

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Test 1: Unit Test computeRegistrationStatus
  console.log('▶ Test 1: computeRegistrationStatus unit test');
  assert.strictEqual(computeRegistrationStatus({ registration_start: tomorrow, registration_end: nextWeek }), 'Upcoming', 'Future start date should be Upcoming');
  assert.strictEqual(computeRegistrationStatus({ registration_start: yesterday, registration_end: nextWeek }), 'Registration Open', 'Active start and future end should be Open');
  assert.strictEqual(computeRegistrationStatus({ registration_start: lastWeek, registration_end: yesterday }), 'Registration Closed', 'Past end date should be Closed');
  assert.strictEqual(computeRegistrationStatus({ status: 'Cancelled' }), 'Cancelled', 'Cancelled status should be preserved');
  console.log('  ✅ Test 1 Passed: Helper returns accurate dynamic status based on clock.\n');

  // Test 2: Create Tournament with Future Registration Date (Upcoming)
  console.log('▶ Test 2: Tournament with Future Registration Date');
  const futureReq = {
    body: {
      name: 'Future Chess Championship',
      sportId: 'sp_chess',
      date: nextWeek,
      registrationStart: tomorrow,
      registrationEnd: nextWeek,
      tournamentName: 'Future Winter Cup 2026',
      participationType: 'INTRA_COLLEGE',
      category: 'Mixed'
    }
  };
  const futureRes = mockRes();
  await createCompetition(futureReq, futureRes);
  assert(futureRes.statusCode === 201 || futureRes.statusCode === 200);
  assert.strictEqual(futureRes.data.competition.status, 'Upcoming', 'Newly created future competition status must be Upcoming');
  const futureCompId = futureRes.data.competition.id;
  console.log(`  ✅ Test 2 Passed: Tournament created with ID ${futureCompId} and status Upcoming.\n`);

  // Test 3: Attempt Student Registration on Upcoming Tournament (Should be blocked)
  console.log('▶ Test 3: Block Registration Attempt on Upcoming Tournament');
  const regReq1 = {
    params: { id: futureCompId },
    body: {
      registerNumber: 'C24UG183CSC099',
      studentName: 'Test Student',
      department: 'Computer Science',
      year: 'III Year',
      gender: 'Male'
    }
  };
  const regRes1 = mockRes();
  await registerForCompetition(regReq1, regRes1);
  assert.strictEqual(regRes1.statusCode, 400, 'Upcoming competition registration should return 400');
  assert(regRes1.data.message.includes('has not opened yet'), 'Error message should indicate registration has not opened yet');
  console.log(`  ✅ Test 3 Passed: Rejected with message: "${regRes1.data.message}"\n`);

  // Test 4: Create Tournament with Currently Active Registration Window (Open)
  console.log('▶ Test 4: Tournament with Active Registration Window');
  const activeReq = {
    body: {
      name: 'Active Badminton Doubles',
      sportId: 'sp_badminton',
      date: nextWeek,
      registrationStart: yesterday,
      registrationEnd: nextWeek,
      tournamentName: 'Spring Open 2026',
      participationType: 'INTRA_COLLEGE',
      category: 'Men'
    }
  };
  const activeRes = mockRes();
  await createCompetition(activeReq, activeRes);
  assert(activeRes.statusCode === 201 || activeRes.statusCode === 200);
  assert.strictEqual(activeRes.data.competition.status, 'Registration Open');
  const activeCompId = activeRes.data.competition.id;
  console.log(`  ✅ Test 4 Passed: Tournament created with ID ${activeCompId} and status Registration Open.\n`);

  // Test 5: Register on Active Tournament (Should Succeed)
  console.log('▶ Test 5: Allow Registration on Active Tournament');
  const regReq2 = {
    params: { id: activeCompId },
    body: {
      registerNumber: 'C24UG183CSC101',
      studentName: 'Active Athlete',
      department: 'Mathematics',
      year: 'II Year',
      gender: 'Male'
    }
  };
  const regRes2 = mockRes();
  await registerForCompetition(regReq2, regRes2);
  assert(regRes2.statusCode === 201 || regRes2.statusCode === 200, 'Registration on active competition should succeed');
  assert(regRes2.data.success === true);
  console.log(`  ✅ Test 5 Passed: Registration approved with code ${regRes2.data.registration.registrationCode}\n`);

  // Test 6: Create Tournament with Past Deadline (Closed)
  console.log('▶ Test 6: Tournament with Past Deadline');
  const closedReq = {
    body: {
      name: 'Expired Volleyball Match',
      sportId: 'sp_volleyball_indoor',
      date: yesterday,
      registrationStart: lastWeek,
      registrationEnd: yesterday,
      tournamentName: 'Autumn Fest 2026',
      participationType: 'INTRA_COLLEGE',
      category: 'Men'
    }
  };
  const closedRes = mockRes();
  await createCompetition(closedReq, closedRes);
  if (closedRes.statusCode !== 200 && closedRes.statusCode !== 201) {
    console.log('closedRes failed with:', closedRes.statusCode, closedRes.data);
  }
  assert(closedRes.statusCode === 201 || closedRes.statusCode === 200);
  assert.strictEqual(closedRes.data.competition.status, 'Registration Closed');
  const closedCompId = closedRes.data.competition.id;
  console.log(`  ✅ Test 6 Passed: Tournament created with ID ${closedCompId} and status Registration Closed.\n`);

  // Test 7: Block Registration Attempt on Expired Tournament
  console.log('▶ Test 7: Block Registration Attempt on Expired Tournament');
  const regReq3 = {
    params: { id: closedCompId },
    body: {
      registerNumber: 'C24UG183CSC102',
      studentName: 'Late Athlete',
      department: 'Physics',
      year: 'I Year',
      gender: 'Male'
    }
  };
  const regRes3 = mockRes();
  await registerForCompetition(regReq3, regRes3);
  assert.strictEqual(regRes3.statusCode, 400, 'Expired competition registration should return 400');
  assert(regRes3.data.message.includes('closed'), 'Error message should indicate registration has closed');
  console.log(`  ✅ Test 7 Passed: Rejected with message: "${regRes3.data.message}"\n`);

  console.log('🎉 ALL 7 TESTS PASSED! Automatic Registration Open & Close conditions are 100% operational!');
}

runTests().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
