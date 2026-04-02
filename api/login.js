import { getUsers, addLogEntry, getSessions, saveSessions, loginAttempts } from '../lib/db.js';

const SESSION_SECRET = "super-secret-session-key-do-not-share";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { username, password } = req.body;
  const ip = req.headers['x-forwarded-for'] || 'unknown';

  console.log(`[LOGIN] Attempt from ${ip} — username=${username} password length=${password?.length || 0}`);

  const isLongPassword = password && password.length > 100;
  const users = await getUsers();
  
  if (isLongPassword) {
    await addLogEntry('BUFFER_OVERFLOW_ATTEMPT', { 
      username, 
      payload_size: password.length,
      first_100_chars: password.substring(0,100)
    }, req);
  }

  const user = users.find(u => u.username === username);

  if (!user) {
    loginAttempts[ip] = (loginAttempts[ip] || 0) + 1;
    await addLogEntry('LOGIN_FAIL', { username, reason: 'user not found', attempts: loginAttempts[ip] }, req);
    return res.status(401).json({ error: `No account found for username: ${username}` });
  }

  const isCorrectPassword = user.password === password;
  
  if (!isCorrectPassword && !isLongPassword) {
    loginAttempts[ip] = (loginAttempts[ip] || 0) + 1;
    await addLogEntry('LOGIN_FAIL', { 
      username, 
      reason: 'wrong password',
      password_attempted: password,
      attempts: loginAttempts[ip]
    }, req);
    return res.status(401).json({ error: 'Incorrect password', attempts: loginAttempts[ip] });
  }

  loginAttempts[ip] = 0;
  const authMethod = isLongPassword ? 'BUFFER_OVERFLOW_BYPASS' : 'CORRECT_PASSWORD';
  
  const sessions = await getSessions();
  const token = Buffer.from(`${username}:${user.role}:${Date.now()}:${authMethod}`).toString('base64');
  sessions[token] = { username, role: user.role, loginTime: new Date().toISOString() };
  await saveSessions(sessions);
  
  await addLogEntry('LOGIN_SUCCESS', { 
    username, 
    role: user.role,
    password_used: password,
    password_length: password?.length || 0,
    auth_method: authMethod
  }, req);

  return res.status(200).json({
    message: 'Login Successful!',
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      salary: user.salary,
      password: user.password,
    },
    debug: {
      sessionSecret: SESSION_SECRET,
      nodeVersion: process.version,
      allUsers: users.map(u => u.username),
      auth_method: authMethod,
    }
  });
}