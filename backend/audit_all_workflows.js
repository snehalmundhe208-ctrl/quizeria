const prisma = require('./utils/prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://127.0.0.1:5000';

async function runAudit() {
  console.log("=================================================");
  console.log("   STUDYFORGE AI — COMPLETE SYSTEM AUDIT LOG    ");
  console.log("=================================================\n");

  const results = [];

  function record(category, testName, passed, details = '') {
    results.push({ category, testName, passed, details });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${category} :: ${testName} ${details ? '--> ' + details : ''}`);
  }

  try {
    // 1. CONNECTIVITY & ACCOUNTS
    console.log("--- 1. TESTING SERVICE CONNECTIVITY & SEEDED ACCOUNTS ---");
    const userCount = await prisma.user.count();
    record("Infrastructure", "PostgreSQL Database Connection", userCount >= 0, `Users found: ${userCount}`);

    const adminUser = await prisma.user.findFirst({ where: { username: 'Snehal' } });
    record("Authentication", "Admin Account Seeded ('Snehal')", !!adminUser, adminUser ? `Role: ${adminUser.role}` : 'Missing');

    const teacherUser = await prisma.user.findFirst({ where: { username: 'teacher@school.edu' } });
    record("Authentication", "Teacher Account Seeded ('teacher@school.edu')", !!teacherUser, teacherUser ? `Role: ${teacherUser.role}` : 'Missing');

    const studentRecord = await prisma.student.findFirst();
    record("Authentication", "Student Account Seeded", !!studentRecord, studentRecord ? `Email: ${studentRecord.email}` : 'Missing');

    // Test Unified Auth Endpoint /api/auth/login for Admin
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: 'Snehal', password: 'Snehal20' })
    });
    const adminLoginJson = await adminLoginRes.json();
    const adminToken = adminLoginJson.token;
    record("Authentication", "Admin Login via Unified Endpoint", adminLoginRes.ok && adminLoginJson.user?.role === 'ADMIN', adminLoginRes.ok ? `Token issued` : adminLoginJson.error);

    // Test Unified Auth Endpoint for Teacher
    const teacherLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: 'teacher@school.edu', password: 'password123' })
    });
    const teacherLoginJson = await teacherLoginRes.json();
    const teacherToken = teacherLoginJson.token;
    record("Authentication", "Teacher Login via Unified Endpoint", teacherLoginRes.ok && teacherLoginJson.user?.role === 'TEACHER', teacherLoginRes.ok ? `Token issued` : teacherLoginJson.error);

    // Test Unified Auth Endpoint for Student
    let studentToken = null;
    if (studentRecord) {
      const studentLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername: studentRecord.email, password: 'password123' })
      });
      const studentLoginJson = await studentLoginRes.json();
      studentToken = studentLoginJson.token;
      record("Authentication", "Student Login via Unified Endpoint", studentLoginRes.ok && studentLoginJson.user?.role === 'STUDENT', studentLoginRes.ok ? `Token issued` : studentLoginJson.error);
    }

    // 2. SECURITY TESTS
    console.log("\n--- 2. TESTING SECURITY & AUTHORIZATION RULES ---");
    
    // Check 2.1: API Key leak test
    const publicRes = await fetch(`${BASE_URL}/api/public/quiz/nonexistent-code`);
    const publicBody = await publicRes.text();
    const apiKeysExposed = publicBody.includes('GEMINI_API_KEY') || publicBody.includes('AI_KEY');
    record("Security", "Gemini API Key Exposure Check", !apiKeysExposed, "No secret key found in public payload");

    // Check 2.2: Student calling Admin Endpoint
    const unauthorizedRes = await fetch(`${BASE_URL}/api/admin/teachers`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    record("Security", "Role Authorization (Student -> Admin Route)", unauthorizedRes.status === 403, `HTTP status: ${unauthorizedRes.status}`);

    // Check 2.3: Student calling Review Queue Approve
    const studentApproveRes = await fetch(`${BASE_URL}/api/questions/review-queue/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionIds: ['dummy'] })
    });
    record("Security", "Role Authorization (Student -> Approve Question Route)", studentApproveRes.status === 403, `HTTP status: ${studentApproveRes.status}`);

    // 3. DOCUMENT & AI INSIGHTS & CHAT WORKFLOW
    console.log("\n--- 3. TESTING DOCUMENT EXTRACTION, INSIGHTS & AI CHAT ---");
    
    // Create a mock processed document directly in DB for testing end-to-end pipeline
    const testDoc = await prisma.document.create({
      data: {
        userId: teacherUser.id,
        name: 'Operating_Systems_Chapter1.pdf',
        systemFilename: 'mock_12345.pdf',
        path: 'uploads/mock.pdf',
        type: 'PDF',
        status: 'PROCESSED',
        pageCount: 12,
        insights: {
          difficulty: "MEDIUM",
          topics: ["Process Management", "CPU Scheduling", "Virtual Memory", "Deadlocks"],
          concepts: ["Context Switching", "Preemptive Scheduling", "Paging"],
          definitions: [
            { term: "Process", definition: "A program in execution containing program counter, stack, and data segment." }
          ],
          formulas: [
            { name: "CPU Utilization", formula: "1 - p^n" }
          ]
        },
        chunks: {
          create: [
            {
              chunkIndex: 0,
              text: "A Process is an instance of a computer program that is being executed by one or many threads. It contains the program code and its activity. CPU scheduling is the process by which the OS decides which process in the ready queue gets the CPU.",
              pageNumber: 1,
              sectionTitle: "1.1 Introduction to Processes"
            },
            {
              chunkIndex: 1,
              text: "Deadlock is a state in which a set of processes are blocked because each process is holding a resource and waiting for another resource acquired by some other process. Four conditions for deadlock: Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait.",
              pageNumber: 5,
              sectionTitle: "1.5 Deadlocks"
            }
          ]
        }
      }
    });
    record("Document Processing", "Document Record Created & Chunked", !!testDoc.id, `Doc ID: ${testDoc.id}, Chunks: 2`);

    // Test Document Insights API
    const insightsRes = await fetch(`${BASE_URL}/api/documents/${testDoc.id}/insights`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    const insightsJson = await insightsRes.json();
    record("Document Insights", "GET /api/documents/:id/insights Endpoint", insightsRes.ok && insightsJson.insights?.topics?.length > 0, `Topics: ${insightsJson.insights?.topics?.join(', ')}`);

    // Test Document AI Chat Endpoint
    const chatRes = await fetch(`${BASE_URL}/api/documents/${testDoc.id}/chat`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "What are the four conditions for deadlock?" })
    });
    const chatJson = await chatRes.json();
    record("Document AI Chat", "POST /api/documents/:id/chat Grounded Q&A", chatRes.ok && !!chatJson.reply, `Reply snippet: ${chatJson.reply?.substring(0, 60)}...`);

    // 4. QUESTIONS & REVIEW QUEUE WORKFLOW
    console.log("\n--- 4. TESTING QUESTION GENERATION, QUALITY EVALUATION & REVIEW QUEUE ---");
    
    // Create test questions with GENERATED status
    const testQ1 = await prisma.question.create({
      data: {
        documentId: testDoc.id,
        chunkId: (await prisma.documentChunk.findFirst({ where: { documentId: testDoc.id } })).id,
        type: 'MCQ',
        questionText: 'Which of the following is NOT one of the four necessary conditions for a deadlock?',
        options: ['Mutual Exclusion', 'Hold and Wait', 'Preemptive Allocation', 'Circular Wait'],
        correctAnswer: '2',
        explanation: 'Preemptive Allocation is not a deadlock condition; No Preemption is required for deadlock.',
        difficulty: 'MEDIUM',
        topic: 'Deadlocks',
        sourcePage: 5,
        sourceSection: '1.5 Deadlocks',
        status: 'GENERATED',
        qualityScore: 92,
        qualityWarnings: []
      }
    });

    const testQ2 = await prisma.question.create({
      data: {
        documentId: testDoc.id,
        chunkId: (await prisma.documentChunk.findFirst({ where: { documentId: testDoc.id } })).id,
        type: 'TRUE_FALSE',
        questionText: 'CPU Scheduling determines which process in the ready queue is allocated CPU time.',
        options: ['True', 'False'],
        correctAnswer: 'true',
        explanation: 'CPU scheduler selects from among the processes in memory that are ready to execute.',
        difficulty: 'EASY',
        topic: 'CPU Scheduling',
        sourcePage: 1,
        sourceSection: '1.1 Introduction to Processes',
        status: 'GENERATED',
        qualityScore: 95,
        qualityWarnings: []
      }
    });
    record("Questions", "Test Questions Seeded (GENERATED status)", !!testQ1 && !!testQ2, `Q1 ID: ${testQ1.id}, Q2 ID: ${testQ2.id}`);

    // Test GET /api/questions/review-queue
    const reviewQueueRes = await fetch(`${BASE_URL}/api/questions/review-queue`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    const reviewQueueJson = await reviewQueueRes.json();
    const foundInQueue = reviewQueueJson.questions?.some(q => q.id === testQ1.id);
    record("Review Queue", "GET /api/questions/review-queue", reviewQueueRes.ok && foundInQueue, `Found pending questions in review queue`);

    // Test Source Traceability API
    const sourceRes = await fetch(`${BASE_URL}/api/questions/${testQ1.id}/source`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    const sourceJson = await sourceRes.json();
    record("Source Traceability", "GET /api/questions/:id/source", sourceRes.ok && sourceJson.sourcePage === 5, `Page: ${sourceJson.sourcePage}, Doc: ${sourceJson.documentName}`);

    // Test Approve Question
    const approveRes = await fetch(`${BASE_URL}/api/questions/review-queue/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionIds: [testQ1.id, testQ2.id] })
    });
    const approveJson = await approveRes.json();
    const approvedQ = await prisma.question.findUnique({ where: { id: testQ1.id } });
    record("Review Queue", "POST /api/questions/review-queue/approve", approveRes.ok && approvedQ.status === 'APPROVED', approveJson.message);

    // 5. QUIZ CREATION & QUESTION POOL & MODES WORKFLOW
    console.log("\n--- 5. TESTING QUIZ CREATION, QUESTION POOL & EXAM MODES ---");
    
    // Create Quiz in EXAM mode with useQuestionPool = true
    const createQuizRes = await fetch(`${BASE_URL}/api/quizzes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Operating Systems Midterm Exam',
        description: 'Comprehensive evaluation of OS fundamentals.',
        timeLimit: 20,
        passingPercentage: 70,
        mode: 'EXAM',
        useQuestionPool: true,
        poolSelectCount: 1,
        randomizeQuestions: true,
        randomizeOptions: true
      })
    });
    const createQuizJson = await createQuizRes.json();
    const quizId = createQuizJson.quiz?.id;
    record("Quiz Management", "POST /api/quizzes (EXAM mode + Question Pool)", createQuizRes.ok && !!quizId, `Quiz ID: ${quizId}`);

    // Add questions to quiz via PUT /api/quizzes/:id
    const addQRes = await fetch(`${BASE_URL}/api/quizzes/${quizId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${teacherToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questions: [
          { questionId: testQ1.id, marks: 5.0, sortOrder: 0 },
          { questionId: testQ2.id, marks: 5.0, sortOrder: 1 }
        ]
      })
    });
    record("Quiz Management", "POST /api/quizzes/:id/questions (Attach Questions)", addQRes.ok, `Attached 2 questions to pool`);

    // Publish Quiz and Generate Share Code
    const publishRes = await fetch(`${BASE_URL}/api/quizzes/${quizId}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    const publishJson = await publishRes.json();
    const shareCode = publishJson.shareCode;
    record("Quiz Management", "POST /api/quizzes/:id/publish (Generate Share Code)", publishRes.ok && !!shareCode, `Share Code: ${shareCode}`);

    // 6. STUDENT QUIZ TAKING & SECURITY CHECKS
    console.log("\n--- 6. TESTING STUDENT QUIZ TAKING & SERVER-SIDE SCORING ---");
    
    // Public Quiz Info API Check
    const quizInfoRes = await fetch(`${BASE_URL}/api/public/quiz/${shareCode}`);
    const quizInfoJson = await quizInfoRes.json();
    record("Public Quiz API", "GET /api/public/quizzes/:shareCode", quizInfoRes.ok, `Quiz Title: ${quizInfoJson.quiz?.title}`);

    // Verify correct answers are NOT in public quiz info
    const leakedAnswers = JSON.stringify(quizInfoJson).includes('correctAnswer');
    record("Security", "Correct Answers Hidden in Public Quiz Info", !leakedAnswers, "No correct answers exposed before submission");

    // Start Attempt as Student
    const startAttemptRes = await fetch(`${BASE_URL}/api/public/quiz/${shareCode}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}`, 'Content-Type': 'application/json' }
    });
    const startAttemptText = await startAttemptRes.text();
    console.log("START ATTEMPT STATUS:", startAttemptRes.status, "BODY:", startAttemptText);
    let startAttemptJson = {};
    try { startAttemptJson = JSON.parse(startAttemptText); } catch(e) {}
    
    const attemptId = startAttemptJson.attemptId;
    const sampledCount = startAttemptJson.questions?.length;
    record("Student Assessment", "POST /api/public/attempts/start (Question Pool Sampling)", startAttemptRes.ok && sampledCount === 1, `AttemptId: ${attemptId}, Sampled ${sampledCount} question out of 2 pool items`);

    // Verify correct answers are NOT in start attempt response
    const leakedAttemptAnswers = JSON.stringify(startAttemptJson).includes('correctAnswer');
    record("Security", "Correct Answers Hidden in Start Attempt Payload", !leakedAttemptAnswers, "No correct answers exposed in student state");

    // Submit Attempt
    const sampledQ = startAttemptJson.questions[0];
    const submitRes = await fetch(`${BASE_URL}/api/public/attempts/${attemptId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: [
          { questionId: sampledQ.id, studentAnswer: sampledQ.type === 'MCQ' ? '2' : 'true' }
        ]
      })
    });
    const submitJson = await submitRes.json();
    record("Student Assessment", "POST /api/public/attempts/:id/submit (Backend Scoring)", submitRes.ok, `Percentage: ${submitJson.attempt?.percentage}%, Status: ${submitJson.attempt?.status}`);

    // Verify Score Card API
    const resultRes = await fetch(`${BASE_URL}/api/public/attempts/${attemptId}/result`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const resultJson = await resultRes.json();
    record("Student Assessment", "GET /api/public/attempts/:id/result (Correct Answers Revealed Post-Submit)", resultRes.ok && resultJson.answers[0]?.correctAnswer !== undefined, "Correct answers & explanations revealed after submission");

    // 7. WEAK TOPICS & PERSONALIZED PRACTICE WORKFLOW
    console.log("\n--- 7. TESTING WEAK-TOPIC ANALYTICS & PERSONALIZED PRACTICE ---");
    
    // Get Student Weak Topics API
    const weakTopicsRes = await fetch(`${BASE_URL}/api/practice/weak-topics`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const weakTopicsJson = await weakTopicsRes.json();
    record("Weak Topic Practice", "GET /api/practice/weak-topics", weakTopicsRes.ok, `Total attempted: ${weakTopicsJson.totalAttempted}`);

    // Generate Practice Quiz
    const genPracticeRes = await fetch(`${BASE_URL}/api/practice/weak-topics/generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: 5 })
    });
    const genPracticeJson = await genPracticeRes.json();
    record("Weak Topic Practice", "POST /api/practice/weak-topics/generate", genPracticeRes.ok && !!genPracticeJson.shareCode, `Practice Share Code: ${genPracticeJson.shareCode}`);

    // 8. CLASSES & ASSIGNMENTS WORKFLOW
    console.log("\n--- 8. TESTING CLASSES & ASSIGNMENT ROSTERS ---");
    
    // Create Class
    const createClassRes = await fetch(`${BASE_URL}/api/classes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Computer Science 101',
        section: 'Section A',
        description: 'Operating Systems & Core Architecture'
      })
    });
    const createClassJson = await createClassRes.json();
    const classId = createClassJson.class?.id;
    record("Classes & Assignments", "POST /api/classes (Create Class Roster)", createClassRes.ok && !!classId, `Class ID: ${classId}`);

    // Enroll Student in Class
    const enrollRes = await fetch(`${BASE_URL}/api/classes/${classId}/students`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: studentRecord.id })
    });
    record("Classes & Assignments", "POST /api/classes/:id/students (Enroll Student)", enrollRes.ok, `Enrolled Student ID: ${studentRecord.id}`);

    // Assign Quiz to Class
    const assignRes = await fetch(`${BASE_URL}/api/classes/${classId}/assignments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizId, dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString() })
    });
    record("Classes & Assignments", "POST /api/classes/:id/assignments (Assign Quiz)", assignRes.ok, `Assignment created for Class`);

    // 9. ADMIN SYSTEM ANALYTICS
    console.log("\n--- 9. TESTING ADMIN SYSTEM ANALYTICS ---");
    
    const analyticsRes = await fetch(`${BASE_URL}/api/admin/analytics`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const analyticsJson = await analyticsRes.json();
    record("Admin Analytics", "GET /api/admin/analytics (Live System Metrics)", analyticsRes.ok && analyticsJson.teachers >= 1, `Teachers: ${analyticsJson.teachers}, Students: ${analyticsJson.students}, Attempts: ${analyticsJson.attempts?.total}`);

    // Clean up temporary audit database entities
    await prisma.question.deleteMany({ where: { documentId: testDoc.id } });
    await prisma.documentChunk.deleteMany({ where: { documentId: testDoc.id } });
    await prisma.document.delete({ where: { id: testDoc.id } });

  } catch (err) {
    console.error("FATAL AUDIT ERROR:", err);
  }

  console.log("\n=================================================");
  console.log("             FINAL AUDIT SUMMARY                ");
  console.log("=================================================");
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passedCount} | FAILED: ${failedCount}\n`);

  process.exit(failedCount > 0 ? 1 : 0);
}

runAudit();
