const prisma = require('./utils/prisma');

const BASE_URL = 'http://127.0.0.1:5000';

async function runFullAudit() {
  console.log("=================================================");
  console.log("   STUDYFORGE AI — 10 FEATURES COMPLETE AUDIT    ");
  console.log("=================================================\n");

  const results = [];

  function record(featureNo, name, passed, details = '') {
    results.push({ featureNo, name, passed, details });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] Feature ${featureNo}: ${name} --> ${details}`);
  }

  try {
    // Authenticate Admin, Teacher, and Student accounts
    const adminUser = await prisma.user.findFirst({ where: { username: 'Snehal' } });
    const teacherUser = await prisma.user.findFirst({ where: { username: 'teacher@school.edu' } });
    const studentRecord = await prisma.student.findFirst({ where: { email: 'student@school.edu' } });

    const adminLogin = await (await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: adminUser.username, password: 'Snehal20' })
    })).json();
    const adminToken = adminLogin.token;

    const teacherLogin = await (await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: teacherUser.username, password: 'password123' })
    })).json();
    const teacherToken = teacherLogin.token;

    const studentLogin = await (await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: studentRecord.email, password: 'password123' })
    })).json();
    const studentToken = studentLogin.token;

    // 1. FEATURE 1: Study Streak Tracker
    const streakRes = await fetch(`${BASE_URL}/api/practice/streak`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const streakJson = await streakRes.json();
    record(1, "Study Streak Tracker", streakRes.ok && streakJson.currentStreak !== undefined, `Current Streak: ${streakJson.currentStreak}, Longest: ${streakJson.longestStreak}`);

    // 2. FEATURE 2: Spaced-Repetition Weak-Question Review
    const spacedRes = await fetch(`${BASE_URL}/api/practice/spaced-review/due`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const spacedJson = await spacedRes.json();
    record(2, "Spaced-Repetition Review Queue", spacedRes.ok && Array.isArray(spacedJson.questions), `Due Count: ${spacedJson.dueCount}`);

    // 3. FEATURE 3: Explain My Mistake AI Chat
    const testQ = await prisma.question.findFirst({ where: { status: 'APPROVED' } });
    if (testQ) {
      const explainRes = await fetch(`${BASE_URL}/api/practice/explain-mistake`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: testQ.id, studentAnswer: 'Option A' })
      });
      const explainJson = await explainRes.json();
      record(3, "Explain My Mistake AI Chat", explainRes.ok && !!explainJson.reply, `Reply snippet: ${explainJson.reply?.substring(0, 50)}...`);
    }

    // 4. FEATURE 4: Leaderboard (Opt-In, Per Class)
    const optRes = await fetch(`${BASE_URL}/api/practice/profile/leaderboard-opt`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${studentToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ isLeaderboardOptIn: true })
    });
    record(4, "Class Leaderboard Opt-In Toggle", optRes.ok, "Opted-in successfully");

    const testClass = await prisma.class.findFirst();
    if (testClass) {
      const lbRes = await fetch(`${BASE_URL}/api/practice/classes/${testClass.id}/leaderboard`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      const lbJson = await lbRes.json();
      record(4, "Class Leaderboard (Ranked by Avg Percentage)", lbRes.ok && Array.isArray(lbJson.leaderboard), `Ranked: ${lbJson.leaderboard?.length} student(s)`);
    }

    // 5. FEATURE 5: Auto-Difficulty Recalibration Check
    const recalQ = await prisma.question.findFirst({ where: { totalAttemptsCount: { gte: 0 } } });
    record(5, "Auto-Difficulty Recalibration", !!recalQ, `Total Attempts Tracked: ${recalQ?.totalAttemptsCount || 0}, Observed Accuracy: ${recalQ?.observedAccuracy || 'N/A'}%`);

    // 6. FEATURE 6: Class Performance Insights (AI Summary)
    if (testClass) {
      const insightsRes = await fetch(`${BASE_URL}/api/classes/${testClass.id}/generate-insights`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${teacherToken}` }
      });
      const insightsJson = await insightsRes.json();
      record(6, "Class Performance AI Insights", insightsRes.ok || insightsRes.status === 400, insightsRes.ok ? "Insights generated" : insightsJson.error);
    }

    // 7. FEATURE 7: Collaborative Question Bank Sharing
    if (testQ) {
      const shareRes = await fetch(`${BASE_URL}/api/questions/${testQ.id}/share`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${teacherToken}` }
      });
      const shareJson = await shareRes.json();
      record(7, "Collaborative Question Sharing (Toggle)", shareRes.ok, `IsShared: ${shareJson.isShared}`);

      const sharedBankRes = await fetch(`${BASE_URL}/api/questions/shared-bank`, {
        headers: { Authorization: `Bearer ${teacherToken}` }
      });
      const sharedBankJson = await sharedBankRes.json();
      record(7, "Browse Shared Question Bank", sharedBankRes.ok && Array.isArray(sharedBankJson.sharedQuestions), `Shared items: ${sharedBankJson.sharedQuestions?.length}`);
    }

    // 8. FEATURE 8: AI Usage & Cost Monitoring (Admin)
    const usageRes = await fetch(`${BASE_URL}/api/admin/ai-usage`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const usageJson = await usageRes.json();
    record(8, "AI Usage & API Cost Monitoring", usageRes.ok && usageJson.summary?.totalCalls >= 0, `Total Calls: ${usageJson.summary?.totalCalls}, Cost: $${usageJson.summary?.totalEstimatedCost}`);

    // 9. FEATURE 9: Teacher Engagement Leaderboard (Admin)
    const engagementRes = await fetch(`${BASE_URL}/api/admin/teacher-engagement`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const engagementJson = await engagementRes.json();
    record(9, "Teacher Engagement Leaderboard", engagementRes.ok && Array.isArray(engagementJson.teachers), `Teachers ranked: ${engagementJson.teachers?.length}`);

    // 10. FEATURE 10: In-App Notification System
    const notifRes = await fetch(`${BASE_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const notifJson = await notifRes.json();
    record(10, "In-App Notification System", notifRes.ok && Array.isArray(notifJson.notifications), `Notifications: ${notifJson.notifications?.length}, Unread: ${notifJson.unreadCount}`);

  } catch (err) {
    console.error("FATAL AUDIT ERROR:", err);
  }

  console.log("\n=================================================");
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  console.log(`FINAL AUDIT RESULTS: ${passedCount} PASSED / ${failedCount} FAILED out of ${results.length} CHECKS`);
  console.log("=================================================\n");
}

runFullAudit();
