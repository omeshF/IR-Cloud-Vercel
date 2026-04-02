import { getUsers, saveUsers, addLogEntry, getSessions, getAuditLog } from '../lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { action } = req.body;
  const ip = req.headers['x-forwarded-for'] || 'unknown';
  
  await addLogEntry('MALWARE_TRIGGERED', { action, ip, timestamp: new Date().toISOString() }, req);
  
  const attackLog = [];
  const stolenData = [];
  const vulnerabilities = [];
  
  // ========== STEP 1: Reconnaissance - Try common passwords ==========
  attackLog.push('🔍 STEP 1: Attacker starts reconnaissance - trying common passwords');
  await addLogEntry('ATTACK_STEP_1_RECON', { message: 'Trying common passwords on login endpoint' }, req);
  
  const commonPasswords = ['password', '123456', 'admin', 'qwerty', 'letmein', 'welcome'];
  const users = await getUsers();
  
  for (const pw of commonPasswords.slice(0, 3)) {
    await addLogEntry('BRUTE_FORCE_ATTEMPT', { username: 'admin', password_attempted: pw, success: false }, req);
    attackLog.push(`  ❌ Attempted password: "${pw}" - Failed`);
  }
  
  // ========== STEP 2: Buffer Overflow Attack ==========
  attackLog.push('\n💥 STEP 2: Attacker tries buffer overflow attack with long string of A\'s');
  await addLogEntry('ATTACK_STEP_2_BUFFER_OVERFLOW', { message: 'Sending 10,000+ character password to bypass validation' }, req);
  
  const longPassword = 'A'.repeat(10000);
  await addLogEntry('BUFFER_OVERFLOW_ATTEMPT', { username: 'admin', payload_size: longPassword.length, payload_preview: longPassword.substring(0, 50) + '...' }, req);
  attackLog.push(`  ✅ SUCCESS! Password "${longPassword.substring(0, 30)}..." (${longPassword.length} chars) was accepted!`);
  attackLog.push(`  🔴 VULNERABILITY: No input validation on password length`);
  vulnerabilities.push('No input validation - accepts arbitrarily long passwords');
  
  await addLogEntry('LOGIN_SUCCESS_BUFFER_OVERFLOW', { username: 'admin', auth_method: 'BUFFER_OVERFLOW_BYPASS', password_length: longPassword.length }, req);
  attackLog.push(`  ✅ Logged in as admin using buffer overflow attack!`);
  
  // ========== STEP 3: IDOR - Harvest all user data ==========
  attackLog.push('\n📁 STEP 3: Attacker exploits IDOR vulnerability to steal user data');
  await addLogEntry('ATTACK_STEP_3_IDOR', { message: 'Accessing /api/profile without authentication' }, req);
  vulnerabilities.push('IDOR - No authentication on /api/profile');
  
  for (const user of users) {
    await addLogEntry('IDOR_PROFILE_ACCESS', { user_id: user.id, username: user.username, endpoint: '/api/profile?id=' + user.id }, req);
    stolenData.push({
      type: 'USER_PROFILE',
      id: user.id,
      username: user.username,
      password: user.password,
      email: user.email,
      salary: user.salary,
      credit_card: user.credit_card || 'N/A',
      ssn: user.ssn || 'N/A'
    });
    attackLog.push(`  📋 User ID ${user.id}: ${user.username}`);
    attackLog.push(`     → Password: ${user.password}`);
    attackLog.push(`     → Credit Card: ${user.credit_card || 'N/A'}`);
    attackLog.push(`     → SSN: ${user.ssn || 'N/A'}`);
    attackLog.push(`     → Salary: $${user.salary}`);
    
    await addLogEntry('DATA_EXFILTRATION', { 
      target: 'USER_PROFILE',
      user_id: user.id,
      username: user.username,
      stolen_data: { password: user.password, credit_card: user.credit_card, ssn: user.ssn, salary: user.salary }
    }, req);
  }
  
  // ========== STEP 4: Access Audit Log ==========
  attackLog.push('\n📋 STEP 4: Attacker accesses internal audit log');
  await addLogEntry('ATTACK_STEP_4_AUDIT_ACCESS', { message: 'Accessing /api/audit endpoint' }, req);
  vulnerabilities.push('No authentication on /api/audit endpoint');
  
  const auditLog = await getAuditLog();
  attackLog.push(`  ✅ Retrieved ${auditLog.length} log entries`);
  attackLog.push(`  📊 Logs contain: login attempts, profile accesses, and system events`);
  stolenData.push({ type: 'AUDIT_LOG', entries: auditLog.length, logs: auditLog.slice(-10) });
  await addLogEntry('AUDIT_LOG_THEFT', { entries_viewed: auditLog.length }, req);
  
  // ========== STEP 5: Steal Active Sessions ==========
  attackLog.push('\n🎫 STEP 5: Attacker checks for active sessions');
  await addLogEntry('ATTACK_STEP_5_SESSIONS', { message: 'Accessing /api/sessions endpoint' }, req);
  vulnerabilities.push('Session tokens exposed via /api/sessions endpoint');
  
  const sessions = await getSessions();
  const sessionCount = Object.keys(sessions).length;
  attackLog.push(`  ✅ Found ${sessionCount} active sessions`);
  if (sessionCount > 0) {
    attackLog.push(`  🎫 Session tokens could be used for session hijacking`);
    stolenData.push({ type: 'ACTIVE_SESSIONS', count: sessionCount, sessions: sessions });
  }
  await addLogEntry('SESSION_CHECK', { active_sessions: sessionCount }, req);
  
  // ========== STEP 6: Create Backdoor Admin Account ==========
  attackLog.push('\n🚪 STEP 6: Attacker creates backdoor admin account for persistent access');
  await addLogEntry('ATTACK_STEP_6_BACKDOOR', { message: 'Registering new admin account' }, req);
  vulnerabilities.push('No input validation on registration - account created without email verification');
  
  const backdoorUser = {
    id: users.length + 1,
    username: 'attacker_backdoor',
    password: 'hacked123',
    email: 'attacker@darkweb.com',
    role: 'admin',
    salary: 999999,
    credit_card: '9999-9999-9999-9999',
    ssn: '000-00-0000'
  };
  
  users.push(backdoorUser);
  await saveUsers(users);
  attackLog.push(`  ✅ Backdoor account created:`);
  attackLog.push(`     → Username: ${backdoorUser.username}`);
  attackLog.push(`     → Password: ${backdoorUser.password}`);
  attackLog.push(`     → Role: ${backdoorUser.role}`);
  stolenData.push({ type: 'BACKDOOR_ACCOUNT', username: backdoorUser.username, password: backdoorUser.password });
  await addLogEntry('BACKDOOR_CREATED', { username: backdoorUser.username, password: backdoorUser.password, role: backdoorUser.role }, req);
  
  // ========== STEP 7: Attempt to crack passwords (brute force) ==========
  attackLog.push('\n🔓 STEP 7: Attacker attempts to crack passwords via brute force');
  await addLogEntry('ATTACK_STEP_7_BRUTE_FORCE', { message: 'Testing common passwords against user accounts' }, req);
  vulnerabilities.push('No rate limiting - unlimited login attempts');
  
  const crackedPasswords = [];
  const commonPwds = ['password123', 'letmein', 'bob123', 'admin', 'password'];
  
  for (const user of users.slice(0, 3)) {
    for (const testPw of commonPwds) {
      await addLogEntry('BRUTE_FORCE_ATTEMPT', { username: user.username, password_attempted: testPw, success: user.password === testPw }, req);
      if (user.password === testPw) {
        crackedPasswords.push({ username: user.username, password: user.password });
        attackLog.push(`  ✅ CRACKED! ${user.username}:${user.password}`);
        break;
      }
    }
  }
  
  stolenData.push({ type: 'CRACKED_CREDENTIALS', count: crackedPasswords.length, credentials: crackedPasswords });
  
  // ========== STEP 8: Exfiltrate all stolen data ==========
  attackLog.push('\n💾 STEP 8: Attacker packages stolen data for exfiltration');
  await addLogEntry('ATTACK_STEP_8_EXFILTRATION', { message: 'Preparing stolen data for exfiltration' }, req);
  
  attackLog.push(`\n📊 ATTACK SUMMARY:`);
  attackLog.push(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  attackLog.push(`  ✅ Total users compromised: ${users.length}`);
  attackLog.push(`  ✅ Passwords stolen: ${users.length}`);
  attackLog.push(`  ✅ Credit cards stolen: ${users.filter(u => u.credit_card).length}`);
  attackLog.push(`  ✅ SSNs stolen: ${users.filter(u => u.ssn).length}`);
  attackLog.push(`  ✅ Backdoor account created: Yes`);
  attackLog.push(`  ✅ Audit logs stolen: ${auditLog.length} entries`);
  attackLog.push(`  ✅ Vulnerabilities exploited: ${vulnerabilities.length}`);
  attackLog.push(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  const attackSummary = {
    attack_id: Date.now(),
    timestamp: new Date().toISOString(),
    attacker_ip: ip,
    steps_completed: 8,
    vulnerabilities_exploited: vulnerabilities,
    data_stolen: {
      users_compromised: users.length,
      passwords_stolen: users.length,
      credit_cards_stolen: users.filter(u => u.credit_card).length,
      ssns_stolen: users.filter(u => u.ssn).length,
      backdoor_created: true,
      audit_logs_stolen: auditLog.length
    },
    stolen_data_summary: stolenData,
    detailed_attack_log: attackLog
  };
  
  await addLogEntry('MALWARE_COMPLETE', attackSummary, req);
  
  // Format the attack log for display
  const formattedAttackLog = attackLog.join('\n');
  
  return res.status(200).json({
    message: '🚨 MALWARE ATTACK SIMULATION COMPLETE 🚨',
    attack_summary: attackSummary,
    formatted_attack_log: formattedAttackLog,
    evidence: {
      check_audit_log: 'View /api/audit to see all attack traces',
      stolen_passwords: users.map(u => ({ username: u.username, password: u.password, credit_card: u.credit_card, ssn: u.ssn })),
      backdoor_credentials: { username: backdoorUser.username, password: backdoorUser.password },
      vulnerabilities: vulnerabilities,
      recommendations: [
        '✅ Add authentication to /api/profile, /api/audit, /api/sessions',
        '✅ Implement rate limiting on login (max 5 attempts per minute)',
        '✅ Hash passwords with bcrypt before storing',
        '✅ Add input validation - reject passwords longer than 100 chars',
        '✅ Remove debug info from production responses',
        '✅ Encrypt sensitive data like credit cards and SSNs',
        '✅ Implement proper logging and monitoring with alerting'
      ]
    }
  });
}