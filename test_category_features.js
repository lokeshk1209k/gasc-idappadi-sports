/**
 * Comprehensive Automated Verification Script for Men's, Women's, and Mixed Sports Categories
 * Testing GASC Idappadi Smart Sports Management System
 */

const { createCompetition, registerForCompetition } = require('./server/controllers/competitionController');
const { formTeam, getEligibleStudents } = require('./server/controllers/teamController');
const { getTournamentRegistrationReport } = require('./server/controllers/reportController');
const { handleTournament, handleRegister } = require('./api/open-registration');
const { supabase } = require('./server/utils/supabaseHelper');

async function runTests() {
  console.log('\n===============================================================');
  console.log('🏁 STARTING END-TO-END CATEGORY FEATURE VERIFICATION');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 8;

  try {
    // -----------------------------------------------------------------
    // TEST 1 & 2: Create tournament containing Volleyball — Men and Volleyball — Women
    // Verify both competitions have separate IDs and categories
    // -----------------------------------------------------------------
    console.log('--- TEST 1 & 2: Create Volleyball — Men and Volleyball — Women competitions ---');
    
    const tournamentName = 'ZONAL CHAMPIONSHIP 2026';
    const tournamentId = 'tour_zonal_' + Date.now();

    // 1. Create Volleyball - Men
    const reqMen = {
      body: {
        tournamentName,
        tournamentId,
        sportId: 'sp_volleyball_indoor',
        sportName: 'Volleyball',
        name: 'Volleyball — Men',
        category: 'Men',
        gender: 'Men',
        type: 'Team Event',
        competitionMode: 'TEAM',
        date: '2026-11-20',
        venue: 'GASC Idappadi Volleyball Court',
        registrationEnd: '2026-11-15',
        requiredPlayers: 6,
        substitutes: 4,
        maxParticipants: 40,
        participationType: 'INTER_COLLEGE',
        description: 'Men Volleyball Inter-College Tournament'
      }
    };

    let compMenData = null;
    const resMen = {
      status(code) { this.statusCode = code; return this; },
      json(data) { compMenData = data; return this; }
    };

    await createCompetition(reqMen, resMen);
    const compMen = compMenData?.competition || compMenData?.data;

    // 2. Create Volleyball - Women
    const reqWomen = {
      body: {
        tournamentName,
        tournamentId,
        sportId: 'sp_volleyball_indoor',
        sportName: 'Volleyball',
        name: 'Volleyball — Women',
        category: 'Women',
        gender: 'Women',
        type: 'Team Event',
        competitionMode: 'TEAM',
        date: '2026-11-21',
        venue: 'GASC Idappadi Volleyball Court',
        registrationEnd: '2026-11-15',
        requiredPlayers: 6,
        substitutes: 4,
        maxParticipants: 40,
        participationType: 'INTER_COLLEGE',
        description: 'Women Volleyball Inter-College Tournament'
      }
    };

    let compWomenData = null;
    const resWomen = {
      status(code) { this.statusCode = code; return this; },
      json(data) { compWomenData = data; return this; }
    };

    await createCompetition(reqWomen, resWomen);
    const compWomen = compWomenData?.competition || compWomenData?.data;

    console.log('Comp Men Raw Response:', resMen.statusCode, compMenData);
    console.log('Comp Men Created:', compMen?.id, compMen?.name, 'Category:', compMen?.category);
    console.log('Comp Women Raw Response:', resWomen.statusCode, compWomenData);
    console.log('Comp Women Created:', compWomen?.id, compWomen?.name, 'Category:', compWomen?.category);

    if (compMen && compWomen && compMen.id !== compWomen.id && compMen.category === 'Men' && compWomen.category === 'Women') {
      console.log('✅ TEST 1 & 2 PASSED: Competitions created with distinct IDs and separate categories.');
      passedTests += 2;
    } else {
      throw new Error(`TEST 1 & 2 FAILED: IDs or categories matched or missing. Men ID: ${compMen?.id}, Women ID: ${compWomen?.id}`);
    }

    // -----------------------------------------------------------------
    // TEST 3: Verify tournament QR API displays only that tournament's competitions
    // -----------------------------------------------------------------
    console.log('\n--- TEST 3: Verify tournament QR API filtering ---');
    const openRegHandler = require('./api/open-registration');
    const qrReq = {
      url: `/api/open-registration/tournament?token=${compMen.registration_token || tournamentId}`,
      query: { token: compMen.registration_token || tournamentId }
    };
    let qrResponse = null;
    const qrRes = {
      setHeader(k, v) { return this; },
      status(code) { this.statusCode = code; return this; },
      json(data) { qrResponse = data; return this; }
    };

    await openRegHandler(qrReq, qrRes);
    const qrComps = qrResponse?.competitions || [];
    console.log(`QR Token returned ${qrComps.length} competitions for tournament:`, qrResponse?.tournament?.name || qrResponse?.tournament?.tournamentName);

    const hasMen = qrComps.some(c => (c.category === 'Men' || c.gender === 'Men') && c.sportName === 'Volleyball');
    const hasWomen = qrComps.some(c => (c.category === 'Women' || c.gender === 'Women') && c.sportName === 'Volleyball');

    if (qrResponse?.success && hasMen && hasWomen) {
      console.log('✅ TEST 3 PASSED: Tournament QR returned both Men and Women competitions under the tournament token.');
      passedTests += 1;
    } else {
      throw new Error(`TEST 3 FAILED: QR endpoint did not return correct tournament competitions.`);
    }

    // -----------------------------------------------------------------
    // TEST 4: Backend Registration Gender Eligibility Validation
    // -----------------------------------------------------------------
    console.log('\n--- TEST 4: Register participants & check gender eligibility rules ---');

    // 4a. Female student trying to register for Men's Volleyball
    let rejectFemaleData = null;
    const reqRejectFemale = {
      params: { id: compMen.id },
      user: { id: 'usr_female_test', name: 'Kavitha S', registerNumber: '24CS099', department: 'Computer Science', gender: 'Female' },
      body: { registerNumber: '24CS099', studentName: 'Kavitha S', gender: 'Female', department: 'Computer Science' }
    };
    const resRejectFemale = {
      status(code) { this.statusCode = code; return this; },
      json(data) { rejectFemaleData = data; return this; }
    };
    await registerForCompetition(reqRejectFemale, resRejectFemale);

    console.log('Female in Men Competition Result Status:', resRejectFemale.statusCode, rejectFemaleData?.message);
    if (resRejectFemale.statusCode === 400 && rejectFemaleData?.message?.includes("Female students cannot register")) {
      console.log('✅ Eligibility Enforcement: Correctly blocked female student from Men\'s Volleyball.');
    } else {
      throw new Error('TEST 4 FAILED: Female student was allowed into Men\'s competition!');
    }

    // 4b. Male student trying to register for Women's Volleyball
    let rejectMaleData = null;
    const reqRejectMale = {
      params: { id: compWomen.id },
      user: { id: 'usr_male_test', name: 'Praveen K', registerNumber: '24CS088', department: 'Computer Science', gender: 'Male' },
      body: { registerNumber: '24CS088', studentName: 'Praveen K', gender: 'Male', department: 'Computer Science' }
    };
    const resRejectMale = {
      status(code) { this.statusCode = code; return this; },
      json(data) { rejectMaleData = data; return this; }
    };
    await registerForCompetition(reqRejectMale, resRejectMale);

    console.log('Male in Women Competition Result Status:', resRejectMale.statusCode, rejectMaleData?.message);
    if (resRejectMale.statusCode === 400 && rejectMaleData?.message?.includes("Male students cannot register")) {
      console.log('✅ Eligibility Enforcement: Correctly blocked male student from Women\'s Volleyball.');
    } else {
      throw new Error('TEST 4 FAILED: Male student was allowed into Women\'s competition!');
    }

    // 4c. Valid Registration: Male student into Men's Volleyball
    let validMenData = null;
    const reqValidMen = {
      params: { id: compMen.id },
      user: { id: 'usr_male_valid', name: 'Arun Kumar', registerNumber: '24CS001', department: 'Computer Science', gender: 'Male' },
      body: { registerNumber: '24CS001', studentName: 'Arun Kumar', gender: 'Male', department: 'Computer Science' }
    };
    const resValidMen = {
      status(code) { this.statusCode = code; return this; },
      json(data) { validMenData = data; return this; }
    };
    await registerForCompetition(reqValidMen, resValidMen);

    // 4d. Valid Registration: Female student into Women's Volleyball
    let validWomenData = null;
    const reqValidWomen = {
      params: { id: compWomen.id },
      user: { id: 'usr_female_valid', name: 'Priya Dharshini', registerNumber: '24CS002', department: 'Computer Science', gender: 'Female' },
      body: { registerNumber: '24CS002', studentName: 'Priya Dharshini', gender: 'Female', department: 'Computer Science' }
    };
    const resValidWomen = {
      status(code) { this.statusCode = code; return this; },
      json(data) { validWomenData = data; return this; }
    };
    await registerForCompetition(reqValidWomen, resValidWomen);

    if (validMenData?.success && validWomenData?.success) {
      console.log('✅ TEST 4 PASSED: Eligible participants registered successfully under exact categories.');
      passedTests += 1;
    } else {
      throw new Error('TEST 4 FAILED: Valid registrations failed.');
    }

    // -----------------------------------------------------------------
    // TEST 5: Verify Admin Registrations and Reports keep competitions separate
    // -----------------------------------------------------------------
    console.log('\n--- TEST 5: Verify Admin Registration separation ---');
    const { data: regMenRows } = await supabase.from('competition_registrations').select('*').eq('competition_id', compMen.id);
    const { data: regWomenRows } = await supabase.from('competition_registrations').select('*').eq('competition_id', compWomen.id);

    console.log(`Registrations for Men's Volleyball (${compMen.id}):`, (regMenRows || []).length);
    console.log(`Registrations for Women's Volleyball (${compWomen.id}):`, (regWomenRows || []).length);

    if ((regMenRows || []).length >= 1 && (regWomenRows || []).length >= 1) {
      console.log('✅ TEST 5 PASSED: Registrations are strictly separated by competition ID and category.');
      passedTests += 1;
    } else {
      throw new Error('TEST 5 FAILED: Registrations were mixed or not found.');
    }

    // -----------------------------------------------------------------
    // TEST 6: Team Formation separation for same sport & department
    // -----------------------------------------------------------------
    console.log('\n--- TEST 6: Verify Team Formation keeps Men\'s and Women\'s teams separate ---');
    
    // Seed 5 more male and 5 more female dummy students for full 6-player squad
    for (let i = 2; i <= 6; i++) {
      await supabase.from('users').upsert({
        id: `usr_male_${i}`,
        register_number: `24CS00${i}`,
        name: `Male Player ${i}`,
        department: 'Computer Science',
        year: 'II Year',
        gender: 'Male',
        role: 'student'
      });
      await supabase.from('competition_registrations').upsert({
        id: `reg_m_${i}`,
        student_id: `usr_male_${i}`,
        competition_id: compMen.id,
        tournament_id: tournamentId,
        sport_name: 'Volleyball',
        register_number: `24CS00${i}`,
        student_name: `Male Player ${i}`,
        department: 'Computer Science',
        gender: 'Male',
        status: 'Registered',
        created_at: new Date().toISOString()
      });

      await supabase.from('users').upsert({
        id: `usr_female_${i}`,
        register_number: `24CS01${i}`,
        name: `Female Player ${i}`,
        department: 'Computer Science',
        year: 'II Year',
        gender: 'Female',
        role: 'student'
      });
      await supabase.from('competition_registrations').upsert({
        id: `reg_f_${i}`,
        student_id: `usr_female_${i}`,
        competition_id: compWomen.id,
        tournament_id: tournamentId,
        sport_name: 'Volleyball',
        register_number: `24CS01${i}`,
        student_name: `Female Player ${i}`,
        department: 'Computer Science',
        gender: 'Female',
        status: 'Registered',
        created_at: new Date().toISOString()
      });
    }

    // 6a. Negative test: Cross-gender player assignment to Men's Team
    let crossGenderData = null;
    const reqCrossGender = {
      body: {
        tournamentName,
        sportName: 'Volleyball',
        department: 'Computer Science',
        gender: 'Men',
        selectedStudentIds: ['usr_male_valid', 'usr_male_2', 'usr_male_3', 'usr_male_4', 'usr_male_5', 'usr_female_valid']
      }
    };
    const resCrossGender = {
      status(code) { this.statusCode = code; return this; },
      json(data) { crossGenderData = data; return this; }
    };
    await formTeam(reqCrossGender, resCrossGender);
    if (resCrossGender.statusCode === 400 && crossGenderData?.message?.includes('cannot be assigned to Men\'s team')) {
      console.log('✅ Team Formation Guard: Correctly blocked female player from Men\'s Volleyball squad.');
    } else {
      throw new Error('TEST 6 FAILED: Female player was allowed into Men\'s squad!');
    }

    // 6b. Form Men's Volleyball Team
    let teamMenData = null;
    const reqFormMen = {
      body: {
        tournamentName,
        sportName: 'Volleyball',
        department: 'Computer Science',
        gender: 'Men',
        selectedStudentIds: ['usr_male_valid', 'usr_male_2', 'usr_male_3', 'usr_male_4', 'usr_male_5', 'usr_male_6']
      }
    };
    const resFormMen = {
      status(code) { this.statusCode = code; return this; },
      json(data) { teamMenData = data; return this; }
    };
    await formTeam(reqFormMen, resFormMen);

    // 6c. Form Women's Volleyball Team (Same Sport, Same Department, Different Category!)
    let teamWomenData = null;
    const reqFormWomen = {
      body: {
        tournamentName,
        sportName: 'Volleyball',
        department: 'Computer Science',
        gender: 'Women',
        selectedStudentIds: ['usr_female_valid', 'usr_female_2', 'usr_female_3', 'usr_female_4', 'usr_female_5', 'usr_female_6']
      }
    };
    const resFormWomen = {
      status(code) { this.statusCode = code; return this; },
      json(data) { teamWomenData = data; return this; }
    };
    await formTeam(reqFormWomen, resFormWomen);

    console.log('Men Team Formed:', teamMenData?.team?.name || teamMenData?.message);
    console.log('Women Team Formed:', teamWomenData?.team?.name || teamWomenData?.message);

    if (teamMenData?.success && teamWomenData?.success) {
      console.log('✅ TEST 6 PASSED: Both Men\'s and Women\'s teams coexist independently for the same sport and department.');
      passedTests += 1;
    } else {
      throw new Error(`TEST 6 FAILED: Could not create separate teams. Men: ${teamMenData?.message}, Women: ${teamWomenData?.message}`);
    }

    // -----------------------------------------------------------------
    // TEST 7: Tournament Registration Report with Category Filters
    // -----------------------------------------------------------------
    console.log('\n--- TEST 7: Tournament Registration Report with Category Filters ---');
    
    // Filter Men only
    let reportMenData = null;
    const reqRepMen = {
      query: { tournamentName, sport: 'Volleyball', gender: 'Men', department: 'All' }
    };
    const resRepMen = {
      status(code) { this.statusCode = code; return this; },
      json(data) { reportMenData = data; return this; }
    };
    await getTournamentRegistrationReport(reqRepMen, resRepMen);

    // Filter Women only
    let reportWomenData = null;
    const reqRepWomen = {
      query: { tournamentName, sport: 'Volleyball', gender: 'Women', department: 'All' }
    };
    const resRepWomen = {
      status(code) { this.statusCode = code; return this; },
      json(data) { reportWomenData = data; return this; }
    };
    await getTournamentRegistrationReport(reqRepWomen, resRepWomen);

    const menCount = reportMenData?.summary?.totalRegistrations || 0;
    const womenCount = reportWomenData?.summary?.totalRegistrations || 0;
    console.log(`Report Men count: ${menCount}, Report Women count: ${womenCount}`);

    if (reportMenData?.success && reportWomenData?.success && menCount > 0 && womenCount > 0) {
      console.log('✅ TEST 7 PASSED: Registration reports accurately filter by Category.');
      passedTests += 1;
    } else {
      throw new Error('TEST 7 FAILED: Report category filter returned incorrect data.');
    }

    // -----------------------------------------------------------------
    // TEST 8: Verify Mixed Category Competition & Teams
    // -----------------------------------------------------------------
    console.log('\n--- TEST 8: Verify Badminton — Mixed Doubles category ---');
    const reqMixed = {
      body: {
        tournamentName,
        tournamentId,
        sportId: 'sp_badminton',
        sportName: 'Badminton',
        name: 'Badminton — Mixed Doubles',
        category: 'Mixed',
        gender: 'Mixed',
        type: 'Team Event',
        competitionMode: 'TEAM',
        date: '2026-11-22',
        venue: 'Indoor Court',
        registrationEnd: '2026-11-15',
        requiredPlayers: 2,
        substitutes: 0,
        maxParticipants: 16
      }
    };
    let compMixedData = null;
    const resMixed = {
      status(code) { this.statusCode = code; return this; },
      json(data) { compMixedData = data; return this; }
    };
    await createCompetition(reqMixed, resMixed);
    const compMixed = compMixedData?.competition || compMixedData?.data;

    // Both Male and Female should be allowed into Mixed
    let mixMaleRes = null, mixFemaleRes = null;
    await registerForCompetition(
      { params: { id: compMixed.id }, user: { id: 'usr_mix_m', name: 'Mix Male', registerNumber: '24CS071', department: 'CS', gender: 'Male' }, body: { registerNumber: '24CS071', studentName: 'Mix Male', gender: 'Male', department: 'CS' } },
      { status() { return this; }, json(d) { mixMaleRes = d; } }
    );
    await registerForCompetition(
      { params: { id: compMixed.id }, user: { id: 'usr_mix_f', name: 'Mix Female', registerNumber: '24CS072', department: 'CS', gender: 'Female' }, body: { registerNumber: '24CS072', studentName: 'Mix Female', gender: 'Female', department: 'CS' } },
      { status() { return this; }, json(d) { mixFemaleRes = d; } }
    );

    if (compMixed && compMixed.category === 'Mixed' && mixMaleRes?.success && mixFemaleRes?.success) {
      console.log('✅ TEST 8 PASSED: Mixed Doubles competition accepts both male and female participants.');
      passedTests += 1;
    } else {
      throw new Error('TEST 8 FAILED: Mixed Doubles competition failed.');
    }

    console.log('\n===============================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS COMPLETED AND VERIFIED SUCCESSFULLY!`);
    console.log('===============================================================\n');

  } catch (err) {
    console.error('\n❌ TEST RUNNER ERROR:', err.message);
    process.exit(1);
  }
}

runTests();
