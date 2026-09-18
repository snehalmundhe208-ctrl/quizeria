const prisma = require('./utils/prisma');

const BASE_URL = 'http://127.0.0.1:5000';

async function auditStudentFeatures() {
  console.log("=================================================");
  console.log("   AUDIT: STUDENT FEATURES (1-4) VERIFICATION   ");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function record(testName, isSuccess, details = '') {
    if (isSuccess) {
      passed++;
      console.log(`[PASS] ${testName} --> ${details}`);
    } else {
      failed++;
      console.log(`[FAIL] ${testName} --> ${details}`);
    }
  }

  try {
    // Authenticate student
    const student = await prisma.student.findFirst({ where: { email: 'student@school.edu' } });
    if (!student) throw new Error('Seeded student account not found.');

    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: student.email, password: 'password123' })
    });
    const loginJson = await loginRes.json();
    const token = loginJson.token;

    // Feature 1: Streak Tracker API
    const streakRes = await fetch(`${BASE_URL}/api/practice/streak`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const streakJson = await streakRes.json();
    record("Feature 1: Streak Tracker API", streakRes.ok && streakJson.currentStreak !== undefined, `Current Streak: ${streakJson.currentStreak}, Longest: ${streakJson.longestStreak}, Active Days: ${streakJson.totalActiveDays}`);

    // Feature 2: Spaced Repetition Due Queue API
    const spacedDueRes = await fetch(`${BASE_URL}/api/practice/spaced-review/due`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const spacedDueJson = await spacedDueRes.json();
    record("Feature 2: Spaced Repetition Due Queue", spacedDueRes.ok && Array.isArray(spacedDueJson.questions), `Due Questions Count: ${spacedDueJson.dueCount}`);

    // Feature 3: Explain My Mistake AI Chat
    const testQuestion = await prisma.question.findFirst({ where: { status: 'APPROVED' } });
    if (testQuestion) {
      const explainRes = await fetch(`${BASE_URL}/api/practice/explain-mistake`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: testQuestion.id,
          studentAnswer: 'Wrong Selection'
        })
      });
      const explainJson = await explainRes.json();
      record("Feature 3: Explain My Mistake AI Chat", explainRes.ok && !!explainJson.reply, `AI Reply snippet: ${explainJson.reply?.substring(0, 60)}...`);

      // Check AI Usage Log created
      const usageLog = await prisma.aiUsageLog.findFirst({
        where: { studentId: student.id, featureType: 'EXPLAIN_MISTAKE' }
      });
      record("Feature 3: AI Usage Logging for Student", !!usageLog, usageLog ? `Log ID: ${usageLog.id}` : 'No usage log found');
    }

    // Feature 4: Leaderboard Opt-In & Class Leaderboard
    const optInRes = await fetch(`${BASE_URL}/api/practice/profile/leaderboard-opt`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ isLeaderboardOptIn: true })
    });
    const optInJson = await optInRes.json();
    record("Feature 4: Toggle Leaderboard Opt-In", optInRes.ok && optInJson.isLeaderboardOptIn === true, `Opt-in status: ${optInJson.isLeaderboardOptIn}`);

    const testClass = await prisma.class.findFirst();
    if (testClass) {
      const leaderboardRes = await fetch(`${BASE_URL}/api/practice/classes/${testClass.id}/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const leaderboardJson = await leaderboardRes.json();
      record("Feature 4: Class Leaderboard Ranking (by Average Percentage)", leaderboardRes.ok && Array.isArray(leaderboardJson.leaderboard), `Class: ${leaderboardJson.className}, Ranked Students: ${leaderboardJson.leaderboard?.length}`);
    }

  } catch (err) {
    console.error("Audit error:", err);
  }

  console.log("\n=================================================");
  console.log(`   STUDENT FEATURES AUDIT: ${passed} PASSED / ${failed} FAILED   `);
  console.log("=================================================\n");
}

auditStudentFeatures();
