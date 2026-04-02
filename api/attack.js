import { getUsers, saveUsers, addLogEntry, getSessions, getAuditLog } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { action, target } = req.body;
  const ip = req.headers['x-forwarded-for'] || 'unknown';
  
  await addLogEntry('MALWARE_TRIGGERED', { action, target, ip, timestamp: new Date().toISOString() }, req);
  
  const results = {
    actions: [],
    dataExfiltrated: [],
    vulnerabilitiesExploited: []
  };
  
  // Exploit 1: IDOR - Harvest all user data
  if (action === 'harvest_users' || action === 'full_attack') {
    const users = await getUsers();
    for (const user of users) {
      results.dataExfiltrated.push({
        type: 'USER_DATA',
        id: user.id,
        username: user.username,
        password: user.password,
        email: user.email,
        salary: user.salary
      });
      await addLogEntry('DATA_EXFILTRATION', { 
        target: 'USER_PROFILE',
        user_id: user.id,
        username: user.username,
        data: { password: user.password, email: user.email }
      }, req);
    }
    results.actions.push('✅ IDOR Exploit: All user profiles harvested');
    results.vulnerabilitiesExploited.push('IDOR - No authentication on /api/profile');
  }
  
  // Exploit 2: Brute force simulation
  if (action === 'brute_force' || action === 'full_attack') {
    const commonPasswords = ['password', '123456', 'admin', 'password123', 'letmein', 'qwerty'];
    const users = await getUsers();
    const cracked = [];
    
    for (const user of users) {
      if (commonPasswords.includes(user.password)) {
        cracked.push({ username: user.username, password: user.password });
        await addLogEntry('BRUTE_FORCE_SUCCESS', { 
          username: user.username,
          password: user.password,
          vulnerability: 'No rate limiting'
        }, req);
      }
    }
    
    results.dataExfiltrated.push({
      type: 'CRACKED_CREDENTIALS',
      count: cracked.length,
      credentials: cracked
    });
    results.actions.push(`✅ Brute Force: ${cracked.length} accounts cracked due to no rate limiting`);
    results.vulnerabilitiesExploited.push('No rate limiting - unlimited login attempts');
  }
  
  // Exploit 3: Session hijacking
  if (action === 'steal_sessions' || action === 'full_attack') {
    const sessions = await getSessions();
    const sessionTokens = Object.keys(sessions);
    
    results.dataExfiltrated.push({
      type: 'ACTIVE_SESSIONS',
      count: sessionTokens.length,
      sessions: sessions
    });
    results.actions.push(`✅ Session Hijacking: ${sessionTokens.length} active sessions stolen`);
    results.vulnerabilitiesExploited.push('Session tokens exposed via /api/sessions endpoint');
    await addLogEntry('SESSION_THEFT', { stolen_sessions: sessionTokens.length }, req);
  }
  
  // Exploit 4: Access audit log
  if (action === 'access_audit' || action === 'full_attack') {
    const auditLog = await getAuditLog();
    results.dataExfiltrated.push({
      type: 'AUDIT_LOG',
      entries: auditLog.length,
      logs: auditLog.slice(-20) // Last 20 entries
    });
    results.actions.push(`✅ Audit Log Access: ${auditLog.length} log entries exposed`);
    results.vulnerabilitiesExploited.push('No authentication on /api/audit endpoint');
    await addLogEntry('AUDIT_LOG_THEFT', { entries_viewed: auditLog.length }, req);
  }
  
  // Exploit 5: Register backdoor admin account
  if (action === 'create_backdoor' || action === 'full_attack') {
    const users = await getUsers();
    const backdoorUser = {
      id: users.length + 1,
      username: 'backdoor_' + Date.now(),
      password: 'hacked123',
      email: 'attacker@malicious.com',
      role: 'admin',
      salary: 999999,
      ssn: '000-00-0000'
    };
    
    users.push(backdoorUser);
    await saveUsers(users);
    
    results.dataExfiltrated.push({
      type: 'BACKDOOR_ACCOUNT',
      username: backdoorUser.username,
      password: backdoorUser.password
    });
    results.actions.push(`✅ Backdoor Account Created: ${backdoorUser.username} / hacked123`);
    results.vulnerabilitiesExploited.push('No input validation on registration - account created without email verification');
    await addLogEntry('BACKDOOR_CREATED', { username: backdoorUser.username }, req);
  }
  
  // Exploit 6: Buffer overflow simulation
  if (action === 'buffer_overflow' || action === 'full_attack') {
    const overflowPayload = 'A'.repeat(10000) + '\\x90'.repeat(1000) + 'MALICIOUS_SHELLCODE';
    results.dataExfiltrated.push({
      type: 'BUFFER_OVERFLOW_PAYLOAD',
      size: overflowPayload.length,
      payload_preview: overflowPayload.substring(0, 100)
    });
    results.actions.push(`✅ Buffer Overflow: ${overflowPayload.length} byte payload sent (no validation)`);
    results.vulnerabilitiesExploited.push('No input validation - accepts arbitrarily long passwords');
    await addLogEntry('BUFFER_OVERFLOW_EXPLOIT', { payload_size: overflowPayload.length }, req);
  }
  
  // Generate attack summary
  const attackSummary = {
    attack_id: Date.now(),
    timestamp: new Date().toISOString(),
    attacker_ip: ip,
    total_actions: results.actions.length,
    data_records_exfiltrated: results.dataExfiltrated.length,
    vulnerabilities_used: results.vulnerabilitiesExploited,
    details: results
  };
  
  await addLogEntry('MALWARE_COMPLETE', attackSummary, req);
  
  return res.status(200).json({
    message: '🚨 MALWARE ATTACK SIMULATION COMPLETE 🚨',
    warning: 'THIS IS A SIMULATED ATTACK FOR EDUCATIONAL PURPOSES',
    attack_summary: attackSummary,
    evidence: {
      check_audit_log: 'View /api/audit to see all attack traces',
      compromised_accounts: results.dataExfiltrated.filter(d => d.type === 'USER_DATA' || d.type === 'CRACKED_CREDENTIALS'),
      backdoor_created: results.dataExfiltrated.find(d => d.type === 'BACKDOOR_ACCOUNT'),
      recommendations: [
        'Add authentication to /api/profile, /api/audit, /api/sessions',
        'Implement rate limiting on login',
        'Hash passwords with bcrypt',
        'Add input validation for password length',
        'Remove debug info from production responses'
      ]
    }
  });
}