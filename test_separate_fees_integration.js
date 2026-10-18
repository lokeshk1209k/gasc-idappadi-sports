/**
 * Integration Test Suite for Separate Registration Fees & Direct GPay/UPI In-Modal Settings
 * Tests all 4 combinations:
 * 1. Our-college OFF (₹0), Other-college OFF (₹0)
 * 2. Our-college ON (₹50), Other-college OFF (₹0)
 * 3. Our-college OFF (₹0), Other-college ON (₹150)
 * 4. Our-college ON (₹75), Other-college ON (₹200)
 * Also tests:
 * - Direct GPay and UPI ID in-modal assignment
 * - Trusted category fee enforcement (tamper resistance)
 */
const http = require('http');

async function runTests() {
  console.log('===============================================================');
  console.log('🏆 GASC IDAPPADI — SEPARATE REGISTRATION FEES TEST SUITE');
  console.log('===============================================================\n');

  // Load controllers directly
  const compController = require('./server/controllers/competitionController');
  const paymentController = require('./server/controllers/paymentController');
  const localStore = require('./server/data/localStore');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // ── TEST COMBINATION 1: Our OFF, Other OFF ──
  console.log('--- TEST 1: Combination 1 (Our-College OFF / Other-College OFF) ---');
  {
    const req1 = {
      body: {
        id: 'comp_test_combo1',
        name: 'Inter-College Carrom — Both Free',
        sportId: 'sp_carrom',
        sportName: 'Carrom',
        type: 'Individual Event',
        level: 'College',
        category: 'Men',
        date: '2026-10-25',
        registrationEnd: '2026-10-24',
        ourCollegeFeeEnabled: false,
        ourCollegeFee: 0,
        otherCollegeFeeEnabled: false,
        otherCollegeFee: 0,
        upiId: 'sportsgasc@sbi',
        gpayNumber: '9443218765',
        receiverName: 'Dr. R. ANITHA'
      }
    };
    const res1 = {
      status: (code) => ({
        json: (data) => {
          assert(code === 201, `Competition created with status 201 (code: ${code})`);
          assert(data.competition.ourCollegeFeeEnabled === false, 'Our-college fee is disabled');
          assert(data.competition.otherCollegeFeeEnabled === false, 'Other-college fee is disabled');
          assert(data.competition.upiId === 'sportsgasc@sbi', 'UPI ID is stored in-modal: sportsgasc@sbi');
          assert(data.competition.gpayNumber === '9443218765', 'GPay number is stored in-modal: 9443218765');
        }
      })
    };
    await compController.createCompetition(req1, res1);

    // Test trusted payment calculation for Combo 1
    // Our college student
    await paymentController.createOrder({
      body: {
        competitionId: 'comp_test_combo1',
        studentCategory: 'OUR_COLLEGE',
        studentName: 'Lokesh K',
        collegeName: 'Government Arts and Science College, Idappadi'
      }
    }, {
      json: (data) => {
        assert(data.isFree === true && data.amount === 0, 'Our-college student gets Free registration (₹0)');
      },
      status: () => ({ json: () => {} })
    });

    // Other college student
    await paymentController.createOrder({
      body: {
        competitionId: 'comp_test_combo1',
        studentCategory: 'OTHER_COLLEGE',
        studentName: 'Rahul M',
        collegeName: 'Periyar University, Salem'
      }
    }, {
      json: (data) => {
        assert(data.isFree === true && data.amount === 0, 'Other-college student gets Free registration (₹0)');
      },
      status: () => ({ json: () => {} })
    });
  }

  // ── TEST COMBINATION 2: Our ON (₹50), Other OFF (₹0) ──
  console.log('\n--- TEST 2: Combination 2 (Our-College ON: ₹50 / Other-College OFF: Free) ---');
  {
    const req2 = {
      body: {
        id: 'comp_test_combo2',
        name: 'Badminton Championship — Our Paid, Other Free',
        sportId: 'sp_badminton',
        sportName: 'Badminton',
        type: 'Individual Event',
        level: 'College',
        category: 'Men',
        date: '2026-10-25',
        registrationEnd: '2026-10-24',
        ourCollegeFeeEnabled: true,
        ourCollegeFee: 50,
        otherCollegeFeeEnabled: false,
        otherCollegeFee: 0,
        upiId: 'gascphysicaled@okaxis',
        gpayNumber: '9443567890',
        receiverName: 'Dr. R. ANITHA'
      }
    };
    const res2 = {
      status: (code) => ({
        json: (data) => {
          assert(code === 201, `Competition created with status 201`);
          assert(data.competition.ourCollegeFeeEnabled === true, 'Our-college fee is enabled');
          assert(data.competition.ourCollegeFee === 50, 'Our-college fee amount is ₹50');
          assert(data.competition.otherCollegeFeeEnabled === false, 'Other-college fee is disabled');
        }
      })
    };
    await compController.createCompetition(req2, res2);

    // Our college student should require ₹50
    await paymentController.createOrder({
      body: {
        competitionId: 'comp_test_combo2',
        studentCategory: 'OUR_COLLEGE',
        studentName: 'Lokesh K',
        collegeName: 'Government Arts and Science College, Idappadi'
      }
    }, {
      json: (data) => {
        assert(data.amountInRupees === 50, 'Our-college student creates order for ₹50');
      },
      status: () => ({ json: () => {} })
    });

    // Other college student should be Free
    await paymentController.createOrder({
      body: {
        competitionId: 'comp_test_combo2',
        studentCategory: 'OTHER_COLLEGE',
        studentName: 'Praveen S',
        collegeName: 'Government College, Salem'
      }
    }, {
      json: (data) => {
        assert(data.isFree === true && data.amount === 0, 'Other-college student gets Free registration (₹0)');
      },
      status: () => ({ json: () => {} })
    });
  }

  // ── TEST COMBINATION 3: Our OFF (₹0), Other ON (₹150) ──
  console.log('\n--- TEST 3: Combination 3 (Our-College OFF: Free / Other-College ON: ₹150) ---');
  {
    const req3 = {
      body: {
        id: 'comp_test_combo3',
        name: 'Inter-College Chess Championship',
        sportId: 'sp_chess',
        sportName: 'Chess',
        type: 'Individual Event',
        level: 'College',
        category: 'Mixed',
        date: '2026-10-25',
        registrationEnd: '2026-10-24',
        ourCollegeFeeEnabled: false,
        ourCollegeFee: 0,
        otherCollegeFeeEnabled: true,
        otherCollegeFee: 150,
        upiId: 'sportsincharge@okhdfcbank',
        gpayNumber: '9443218765',
        receiverName: 'Dr. R. ANITHA'
      }
    };
    const res3 = {
      status: (code) => ({
        json: (data) => {
          assert(code === 201, `Competition created with status 201`);
          assert(data.competition.ourCollegeFeeEnabled === false, 'Our-college fee is disabled (Free)');
          assert(data.competition.otherCollegeFeeEnabled === true, 'Other-college fee is enabled');
          assert(data.competition.otherCollegeFee === 150, 'Other-college fee is ₹150');
        }
      })
    };
    await compController.createCompetition(req3, res3);

    // Our college student should be Free
    await paymentController.createOrder({
      body: {
        competitionId: 'comp_test_combo3',
        studentCategory: 'OUR_COLLEGE',
        studentName: 'Ajay K',
        collegeName: 'Government Arts and Science College, Idappadi'
      }
    }, {
      json: (data) => {
        assert(data.isFree === true && data.amount === 0, 'Our-college student gets Free registration (₹0)');
      },
      status: () => ({ json: () => {} })
    });

    // Other college student should be ₹150
    await paymentController.createOrder({
      body: {
        competitionId: 'comp_test_combo3',
        studentCategory: 'OTHER_COLLEGE',
        studentName: 'Suresh B',
        collegeName: 'KSR College of Technology, Tiruchengode'
      }
    }, {
      json: (data) => {
        assert(data.amountInRupees === 150, 'Other-college student creates order for ₹150');
      },
      status: () => ({ json: () => {} })
    });
  }

  // ── TEST COMBINATION 4: Our ON (₹75), Other ON (₹200) ──
  console.log('\n--- TEST 4: Combination 4 (Our-College ON: ₹75 / Other-College ON: ₹200) ---');
  {
    const req4 = {
      body: {
        id: 'comp_test_combo4',
        name: 'Kabaddi Premier League',
        sportId: 'sp_kabaddi',
        sportName: 'Kabaddi',
        type: 'Team Event',
        level: 'College',
        category: 'Men',
        date: '2026-10-25',
        registrationEnd: '2026-10-24',
        ourCollegeFeeEnabled: true,
        ourCollegeFee: 75,
        otherCollegeFeeEnabled: true,
        otherCollegeFee: 200,
        upiId: 'gascidappadisports@sbi',
        gpayNumber: '9443218765',
        receiverName: 'Dr. R. ANITHA'
      }
    };
    const res4 = {
      status: (code) => ({
        json: (data) => {
          assert(code === 201, `Competition created with status 201`);
          assert(data.competition.ourCollegeFeeEnabled === true, 'Our-college fee is enabled');
          assert(data.competition.ourCollegeFee === 75, 'Our-college fee is ₹75');
          assert(data.competition.otherCollegeFeeEnabled === true, 'Other-college fee is enabled');
          assert(data.competition.otherCollegeFee === 200, 'Other-college fee is ₹200');
        }
      })
    };
    await compController.createCompetition(req4, res4);

    // Our college student should be ₹75
    await paymentController.createOrder({
      body: {
        competitionId: 'comp_test_combo4',
        studentCategory: 'OUR_COLLEGE',
        studentName: 'Lokesh K',
        collegeName: 'Government Arts and Science College, Idappadi'
      }
    }, {
      json: (data) => {
        assert(data.amountInRupees === 75, 'Our-college student creates order for ₹75');
      },
      status: () => ({ json: () => {} })
    });

    // Other college student should be ₹200
    await paymentController.createOrder({
      body: {
        competitionId: 'comp_test_combo4',
        studentCategory: 'OTHER_COLLEGE',
        studentName: 'Muthu K',
        collegeName: 'Anna University, Chennai'
      }
    }, {
      json: (data) => {
        assert(data.amountInRupees === 200, 'Other-college student creates order for ₹200');
      },
      status: () => ({ json: () => {} })
    });
  }

  // ── TEST 5: Tamper Resistance (Client attempts to send amount=0 when fee is enabled) ──
  console.log('\n--- TEST 5: Client Tamper Resistance (Client requests fee 0 on paid comp) ---');
  {
    await paymentController.createOrder({
      body: {
        competitionId: 'comp_test_combo4',
        studentCategory: 'OTHER_COLLEGE',
        amount: 0, // Client tries to spoof ₹0!
        amountInRupees: 0,
        studentName: 'Hacker Student',
        collegeName: 'Some College'
      }
    }, {
      json: (data) => {
        assert(data.amountInRupees === 200, 'Server overrides client spoofed amount with trusted DB fee of ₹200');
      },
      status: () => ({ json: () => {} })
    });
  }

  console.log('\n===============================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('===============================================================');
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
