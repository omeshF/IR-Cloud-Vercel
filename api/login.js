import { users, logEvent } from '../lib/db.js';

// 🔴 VULN A02: Hardcoded secret key in source
const SESSION_SECRET = "super-secret-session-key-do-not-share";

let failedAttempts = {};

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { username, password } = req.body;
  const ip = req.headers['x-forwarded-for'] || 'unknown';

  // 🔴 VULN A09: Credentials written to log
  console.log(`[LOGIN] Attempt from ${ip} — username=${username} password length=${password?.length || 0}`);
  console.log(`[CONFIG] Session secret=${SESSION_SECRET}`);

  // Check for buffer overflow attempt (long password)
  const isLongPassword = password && password.length > 100;
  
  if (isLongPassword) {
    console.log(`[ALERT] 🔴 POSSIBLE BUFFER OVERFLOW ATTEMPT: ${password.length} byte string received`);
    logEvent('BUFFER_OVERFLOW_ATTEMPT', { 
      username, 
      payload_size: password.length,
      first_100_chars: password.substring(0,100)
    }, req);
  }

  // Find the user by username
  const user = users.find(u => u.username === username);

  if (!user) {
    failedAttempts[ip] = (failedAttempts[ip] || 0) + 1;
    logEvent('LOGIN_FAIL', { username, reason: 'user not found' }, req);
    // 🔴 VULN A01: Verbose error reveals whether username exists
    return res.status(401).json({ error: `No account found for username: ${username}` });
  }

  // 🔴 VULNERABILITY: Accepts long passwords (buffer overflow) OR correct password
  const isCorrectPassword = user.password === password;
  
  if (!isCorrectPassword && !isLongPassword) {
    // Wrong password AND not a long string - reject
    failedAttempts[ip] = (failedAttempts[ip] || 0) + 1;
    logEvent('LOGIN_FAIL', { 
      username, 
      reason: 'wrong password',
      password_attempted: password,
      attempts: failedAttempts[ip]
    }, req);
    return res.status(401).json({ 
      error: 'Incorrect password',
      attempts: failedAttempts[ip]
    });
  }

  // Login succeeds for correct password OR long password (buffer overflow)
  failedAttempts[ip] = 0;
  
  const authMethod = isLongPassword ? 'BUFFER_OVERFLOW_BYPASS' : 'CORRECT_PASSWORD';
  
  logEvent('LOGIN_SUCCESS', { 
    username, 
    role: user.role,
    password_used: password,
    password_length: password?.length || 0,
    auth_method: authMethod,
    vulnerability: isLongPassword ? 'Buffer overflow string accepted as valid password' : 'None'
  }, req);

  // 🔴 VULN A07: Token is just base64 - not signed
  const fakeToken = Buffer.from(`${username}:${user.role}:${Date.now()}:${authMethod}`).toString('base64');

  // Return success message based on user role
  let successMessage = 'Login Successful!';
  if (user.role === 'admin') {
    successMessage = 'Login Successful! Welcome Admin.';
  }

  return res.status(200).json({
    message: successMessage,
    warning: isLongPassword ? '🔴 Security vulnerability: System accepted extremely long password without validation' : undefined,
    token: fakeToken,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      // 🔴 VULN A01: Returns salary and password in login response
      salary: user.salary,
      password: user.password, // Returns plaintext password too!
    },
    debug: {
      // 🔴 VULN A05: Debug info returned in production response
      sessionSecret: SESSION_SECRET,
      nodeVersion: process.version,
      allUsers: users.map(u => u.username),
      auth_method: authMethod,
      vuln_details: isLongPassword ? {
        type: "Buffer Overflow Vulnerability",
        description: "System accepted extremely long password without validation",
        impact: "Denial of service, potential remote code execution",
        password_length: password.length
      } : {
        type: "Authentication Bypass",
        description: "Password validation logic flaw",
        impact: "Unauthorized access"
      }
    }
  });
}