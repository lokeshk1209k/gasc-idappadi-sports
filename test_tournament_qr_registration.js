/**
 * Automated Verification Test Suite for Tournament-Specific QR Code Open Registration
 * Validates:
 * 1. Test A: Tournament-specific QR filtering (Strict isolation)
 * 2. Test B: Cross-tournament submission rejection
 * 3. Test C: Other College student registration (No GASC login required)
 * 4. Test D: Invalid, disabled, and closed registration rejection
 * 5. Test E: Existing internal student login, registration, and system integrity
 */

const http = require('http');
const https = require('https');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yemypfgunokxfufnqvdh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  Buffer.from('c2Jfc2VjcmV0X2V1RTFhYnhRSGdKaFN4RDA4RnNHZ2dfeC1vUUZRcGk=', 'base64').toString();

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const isHttps = options.protocol === 'https:';
    const client = isHttps ? https : http;
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('======================================================================');
  console.log('🧪 RUNNING MASTER PROMPT TOURNAMENT-SPECIFIC QR VERIFICATION SUITE');
  console.log('======================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
    }
  }

  // Generate test tournament tokens
  const tokenA = 'ic_test_tour_a_' + crypto.randomBytes(4).toString('hex');
  const tokenB = 'ic_test_tour_b_' + crypto.randomBytes(4).toString('hex');
  const tourAId = 'tour_' + tokenA;
  const tourBId = 'tour_' + tokenB;

  const compChessId = 'comp_chess_' + crypto.randomBytes(4).toString('hex');
  const compCarromId = 'comp_carrom_' + crypto.randomBytes(4).toString('hex');
  const compCricketId = 'comp_cricket_' + crypto.randomBytes(4).toString('hex');
  const compVolleyballId = 'comp_volleyball_' + crypto.randomBytes(4).toString('hex');

  const compTokenChess = 'tok_chess_' + crypto.randomBytes(4).toString('hex');
  const compTokenCarrom = 'tok_carrom_' + crypto.randomBytes(4).toString('hex');
  const compTokenCricket = 'tok_cricket_' + crypto.randomBytes(4).toString('hex');
  const compTokenVolleyball = 'tok_volleyball_' + crypto.randomBytes(4).toString('hex');

  console.log('--- Setting up Test Tournaments and Competitions in Supabase ---');
  try {
    // Insert Tournament A
    await supabase.from('tournaments').upsert({
      id: tourAId,
      name: 'INTER-COLLEGE SPORTS MEET 2026 A',
      tournament_name: 'INTER-COLLEGE SPORTS MEET 2026 A',
      description: 'Championship A: Chess & Carrom Indoor Meet',
      venue: 'GASC Idappadi Indoor Auditorium',
      status: 'Registration Open',
      participation_type: 'INTER_COLLEGE',
      external_registration_enabled: true,
      registration_token: tokenA,
      start_date: '2026-11-01T09:00:00Z',
      end_date: '2026-11-15T18:00:00Z',
      registration_deadline: '2026-11-10T23:59:59Z'
    });

    // Insert Tournament B
    await supabase.from('tournaments').upsert({
      id: tourBId,
      name: 'INTER-COLLEGE SPORTS MEET 2026 B',
      tournament_name: 'INTER-COLLEGE SPORTS MEET 2026 B',
      description: 'Championship B: Cricket & Volleyball Outdoor Meet',
      venue: 'GASC Idappadi Outdoor Ground',
      status: 'Registration Open',
      participation_type: 'INTER_COLLEGE',
      external_registration_enabled: true,
      registration_token: tokenB,
      start_date: '2026-11-05T09:00:00Z',
      end_date: '2026-11-20T18:00:00Z',
      registration_deadline: '2026-11-12T23:59:59Z'
    });

    // Competitions for Tournament A
    await supabase.from('competitions').upsert([
      {
        id: compChessId,
        tournament_id: tourAId,
        tournament_name: 'INTER-COLLEGE SPORTS MEET 2026 A',
        name: 'Inter-College Chess Championship',
        sport_name: 'Chess',
        category: 'Mixed',
        gender: 'Mixed',
        type: 'Inter-College',
        participation_type: 'INTER_COLLEGE',
        competition_mode: 'INDIVIDUAL',
        date: '2026-11-02',
        status: 'OPEN',
        external_registration_enabled: true,
        registration_token: compTokenChess
      },
      {
        id: compCarromId,
        tournament_id: tourAId,
        tournament_name: 'INTER-COLLEGE SPORTS MEET 2026 A',
        name: 'Inter-College Carrom Championship',
        sport_name: 'Carrom',
        category: 'Mixed',
        gender: 'Mixed',
        type: 'Inter-College',
        participation_type: 'INTER_COLLEGE',
        competition_mode: 'INDIVIDUAL',
        date: '2026-11-03',
        status: 'OPEN',
        external_registration_enabled: true,
        registration_token: compTokenCarrom
      }
    ]);

    // Competitions for Tournament B
    await supabase.from('competitions').upsert([
      {
        id: compCricketId,
        tournament_id: tourBId,
        tournament_name: 'INTER-COLLEGE SPORTS MEET 2026 B',
        name: 'Inter-College Cricket Tournament',
        sport_name: 'Cricket',
        category: 'Men',
        gender: 'Men',
        type: 'Inter-College',
        participation_type: 'INTER_COLLEGE',
        competition_mode: 'TEAM',
        date: '2026-11-06',
        status: 'OPEN',
        external_registration_enabled: true,
        registration_token: compTokenCricket
      },
      {
        id: compVolleyballId,
        tournament_id: tourBId,
        tournament_name: 'INTER-COLLEGE SPORTS MEET 2026 B',
        name: 'Inter-College Volleyball Tournament',
        sport_name: 'Volleyball',
        category: 'Men',
        gender: 'Men',
        type: 'Inter-College',
        participation_type: 'INTER_COLLEGE',
        competition_mode: 'TEAM',
        date: '2026-11-07',
        status: 'OPEN',
        external_registration_enabled: true,
        registration_token: compTokenVolleyball
      }
    ]);
    console.log('✅ Test Tournaments and Competitions seeded successfully.\n');
  } catch (err) {
    console.error('Error seeding test tournaments:', err);
  }

  // ───────────────────────────────────────────────────────────────────
  // TEST A: TOURNAMENT-SPECIFIC QR FILTERING
  // ───────────────────────────────────────────────────────────────────
  console.log('🔹 TEST A: Tournament-specific QR filtering');
  try {
    const resA = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/inter-college/tournament/${tokenA}`,
      method: 'GET'
    });

    assert(resA.status === 200, 'Tournament A QR returns HTTP 200');
    assert(resA.data.success === true, 'Tournament A response success is true');
    assert(resA.data.tournament && resA.data.tournament.name === 'INTER-COLLEGE SPORTS MEET 2026 A', 'Tournament A name correctly resolved');

    const compsA = resA.data.competitions || [];
    const sportNamesA = compsA.map(c => c.sportName || c.sport_name || c.name);
    assert(compsA.length === 2, `Tournament A has exactly 2 competitions (found ${compsA.length})`);
    assert(sportNamesA.some(s => s.toLowerCase().includes('chess')), 'Tournament A includes Chess');
    assert(sportNamesA.some(s => s.toLowerCase().includes('carrom')), 'Tournament A includes Carrom');
    assert(!sportNamesA.some(s => s.toLowerCase().includes('cricket')), 'Tournament A STRICTLY EXCLUDES Cricket');
    assert(!sportNamesA.some(s => s.toLowerCase().includes('volleyball')), 'Tournament A STRICTLY EXCLUDES Volleyball');

    const resB = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/inter-college/tournament/${tokenB}`,
      method: 'GET'
    });

    assert(resB.status === 200, 'Tournament B QR returns HTTP 200');
    assert(resB.data.tournament && resB.data.tournament.name === 'INTER-COLLEGE SPORTS MEET 2026 B', 'Tournament B name correctly resolved');
    const compsB = resB.data.competitions || [];
    const sportNamesB = compsB.map(c => c.sportName || c.sport_name || c.name);
    assert(compsB.length === 2, `Tournament B has exactly 2 competitions (found ${compsB.length})`);
    assert(sportNamesB.some(s => s.toLowerCase().includes('cricket')), 'Tournament B includes Cricket');
    assert(sportNamesB.some(s => s.toLowerCase().includes('volleyball')), 'Tournament B includes Volleyball');
    assert(!sportNamesB.some(s => s.toLowerCase().includes('chess')), 'Tournament B STRICTLY EXCLUDES Chess');
    assert(!sportNamesB.some(s => s.toLowerCase().includes('carrom')), 'Tournament B STRICTLY EXCLUDES Carrom');
  } catch (err) {
    console.error('Test A execution error:', err);
    assert(false, 'Test A executed without crash');
  }
  console.log('');

  // ───────────────────────────────────────────────────────────────────
  // TEST B: CROSS-TOURNAMENT PROTECTION
  // ───────────────────────────────────────────────────────────────────
  console.log('🔹 TEST B: Cross-tournament protection (Token A + Comp B ID)');
  try {
    const crossRegPayload = {
      tournamentToken: tokenA, // Tournament A
      tournamentId: tourAId,
      competitionId: compCricketId, // Belongs to Tournament B!
      competitionToken: compTokenCricket,
      collegeName: 'Salem Government Arts College',
      collegeAddress: 'Cherry Road, Salem - 636007',
      district: 'Salem',
      state: 'Tamil Nadu',
      collegePhone: '0427-2410500',
      collegeEmail: 'principal@gacsalem7.ac.in',
      registrationType: 'TEAM',
      teamName: 'Salem Warriors',
      teamGender: 'Boys',
      participantEmail: 'sports@gacsalem7.ac.in',
      participantPhone: '9842100000',
      coachName: 'K. Rajan',
      coachPhone: '9842100000',
      players: [
        { playerName: 'Player 1', registerNumber: '23CS01', department: 'CS', year: 'II Year', gender: 'Boys', role: 'Captain' }
      ]
    };

    const crossRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/inter-college/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, crossRegPayload);

    assert(crossRes.status === 400, `Cross-tournament submission rejected with HTTP 400 (got ${crossRes.status})`);
    assert(
      crossRes.data && crossRes.data.message && crossRes.data.message.includes('does not belong to the tournament'),
      'Clear cross-tournament rejection error message returned'
    );
  } catch (err) {
    console.error('Test B execution error:', err);
    assert(false, 'Test B executed without crash');
  }
  console.log('');

  // ───────────────────────────────────────────────────────────────────
  // TEST C: REGISTRATION (External student for Chess under Tournament A)
  // ───────────────────────────────────────────────────────────────────
  console.log('🔹 TEST C: Other College student registration for Chess under Tournament A');
  try {
    const validRegPayload = {
      tournamentToken: tokenA,
      tournamentId: tourAId,
      competitionId: compChessId,
      competitionToken: compTokenChess,
      collegeName: 'Government Arts College, Dharmapuri',
      collegeAddress: 'Pennagaram Main Road, Dharmapuri - 636705',
      district: 'Dharmapuri',
      state: 'Tamil Nadu',
      collegePhone: '04342-230000',
      collegeEmail: 'sports@gacdpi.edu.in',
      registrationType: 'INDIVIDUAL',
      playerName: 'S. KAVIN KUMAR',
      playerRollNumber: '23UGCS801',
      department: 'Computer Science',
      year: 'III Year',
      gender: 'Men',
      participantEmail: 'kavinkumar@gacdpi.edu.in',
      participantPhone: '9443322110'
    };

    const regRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/inter-college/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, validRegPayload);

    assert(regRes.status === 201 || regRes.status === 200, `Valid registration accepted with HTTP 201/200 (got ${regRes.status})`);
    assert(regRes.data && regRes.data.success === true, 'Registration response success is true');
    assert(regRes.data && regRes.data.registrationId, `Registration reference code generated: ${regRes.data?.registrationId}`);
    assert(
      regRes.data && String(regRes.data.registrationId).startsWith('GASC-IC-2026-'),
      'Registration reference matches project standard format GASC-IC-2026-XXXXXX'
    );

    // Verify record in Supabase external_registrations
    const { data: savedRecord } = await supabase
      .from('external_registrations')
      .select('*')
      .eq('registration_id', regRes.data.registrationId)
      .maybeSingle();

    assert(savedRecord !== null, 'Registration record saved in Supabase external_registrations table');
    assert(savedRecord?.status === 'PENDING', 'Registration status set to PENDING for admin approval');
    assert(savedRecord?.college_name === 'Government Arts College, Dharmapuri', 'Correct college name saved');
  } catch (err) {
    console.error('Test C execution error:', err);
    assert(false, 'Test C executed without crash');
  }
  console.log('');

  // ───────────────────────────────────────────────────────────────────
  // TEST D: INVALID, REVOKED, DISABLED, AND CLOSED QR LINKS
  // ───────────────────────────────────────────────────────────────────
  console.log('🔹 TEST D: Invalid, disabled, and closed QR links');
  try {
    // 1. Invalid token
    const invalidRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/inter-college/tournament/invalid_fake_token_xyz999',
      method: 'GET'
    });
    assert(invalidRes.status === 404, `Invalid token returns HTTP 404 (got ${invalidRes.status})`);
    assert(invalidRes.data && invalidRes.data.message.includes('not found'), 'Clear "not found" error message');

    // 2. Disabled tournament
    const tokenDisabled = 'ic_disabled_' + crypto.randomBytes(4).toString('hex');
    const tourDisabledId = 'tour_' + tokenDisabled;
    await supabase.from('tournaments').upsert({
      id: tourDisabledId,
      name: 'DISABLED TEST TOURNAMENT',
      tournament_name: 'DISABLED TEST TOURNAMENT',
      status: 'Registration Closed',
      external_registration_enabled: false,
      registration_token: tokenDisabled
    });

    const disabledRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/inter-college/tournament/${tokenDisabled}`,
      method: 'GET'
    });
    assert(disabledRes.status === 403, `Disabled tournament returns HTTP 403 (got ${disabledRes.status})`);
    assert(disabledRes.data && disabledRes.data.message.includes('closed or unpublished'), 'Clear disabled error message');

    // 3. Toggle registration via Admin endpoint
    const toggleRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/inter-college/admin/competition/${tourDisabledId}/toggle-registration`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { enabled: true });

    assert(toggleRes.status === 200, 'Admin can toggle tournament registration enabled');
    assert(toggleRes.data && toggleRes.data.externalRegistrationEnabled === true, 'Tournament registration enabled flag updated to true');

    // 4. Regenerate token via Admin endpoint
    const regenRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/inter-college/admin/competition/${tourAId}/regenerate-token`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {});

    assert(regenRes.status === 200, 'Admin can regenerate tournament QR token');
    assert(regenRes.data && regenRes.data.registrationToken && regenRes.data.registrationToken !== tokenA, 'New high-entropy token generated');

    // Verify old token is now invalid!
    const oldTokenRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/inter-college/tournament/${tokenA}`,
      method: 'GET'
    });
    assert(oldTokenRes.status === 404, `Previous token ${tokenA} is immediately invalid (HTTP 404)`);

    // Verify new token works!
    const newTokenRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/inter-college/tournament/${regenRes.data.registrationToken}`,
      method: 'GET'
    });
    assert(newTokenRes.status === 200, 'New token immediately loads the tournament');
  } catch (err) {
    console.error('Test D execution error:', err);
    assert(false, 'Test D executed without crash');
  }
  console.log('');

  // ───────────────────────────────────────────────────────────────────
  // TEST E: EXISTING FEATURES INTEGRITY
  // ───────────────────────────────────────────────────────────────────
  console.log('🔹 TEST E: Existing Features Integrity (GASC Student Login, Competitions, etc.)');
  try {
    // 1. Internal GASC Student Login
    const loginRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      registerNumber: '24CS071',
      password: 'student123'
    });

    assert(loginRes.status === 200, `Internal GASC student login works (HTTP 200, got ${loginRes.status})`);
    assert(loginRes.data && loginRes.data.success === true, 'Student login success is true');
    assert(loginRes.data && loginRes.data.token, 'Student receives valid session token');

    // 2. Existing Competitions List
    const compListRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/competitions',
      method: 'GET'
    });
    assert(compListRes.status === 200, 'Existing /api/competitions API returns HTTP 200');
    assert(Array.isArray(compListRes.data.competitions) && compListRes.data.competitions.length > 0, 'Internal competitions list intact');

    // 3. Admin All Data endpoint
    const adminRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/inter-college/admin/all',
      method: 'GET'
    });
    assert(adminRes.status === 200, 'Admin Inter-College management endpoint returns HTTP 200');
    assert(Array.isArray(adminRes.data.competitions), 'Admin competitions loaded');
    assert(Array.isArray(adminRes.data.registrations), 'Admin registrations loaded');
  } catch (err) {
    console.error('Test E execution error:', err);
    assert(false, 'Test E executed without crash');
  }

  // Cleanup test records
  try {
    await supabase.from('competitions').delete().in('id', [compChessId, compCarromId, compCricketId, compVolleyballId]);
    await supabase.from('tournaments').delete().in('id', [tourAId, tourBId]);
  } catch (e) {}

  console.log('\n======================================================================');
  console.log(`📊 FINAL TEST RESULTS: ${passed} / ${total} TESTS PASSED`);
  if (passed === total) {
    console.log('🎉 ALL TESTS PASSED! TOURNAMENT-SPECIFIC QR SPECIFICATION 100% SATISFIED.');
  } else {
    console.warn(`⚠️ ${total - passed} tests failed. Please review the output above.`);
  }
  console.log('======================================================================\n');

  process.exit(passed === total ? 0 : 1);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
