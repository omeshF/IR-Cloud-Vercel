// Simulated user store — in a real app this would be a database
// 🔴 VULN: Passwords stored in plaintext (OWASP A02)
export const users = [
  { id: 1, username: "admin",   password: "password123",  email: "admin@corp.com",   role: "admin",  salary: 95000 },
  { id: 2, username: "alice",   password: "letmein",      email: "alice@corp.com",   role: "staff",  salary: 52000 },
  { id: 3, username: "bob",     password: "bob123",       email: "bob@corp.com",     role: "staff",  salary: 48000 },
];

export const auditLog = [];

export function logEvent(type, detail, req) {
  const entry = {
    ts:        new Date().toISOString(),
    type,
    detail,
    ip:        req?.headers?.['x-forwarded-for'] || 'unknown',
    userAgent: req?.headers?.['user-agent']?.substring(0, 80) || 'unknown',
  };
  auditLog.push(entry);
  // 🔴 VULN: Sensitive data written to logs (OWASP A09)
  console.log(`[AUDIT] ${JSON.stringify(entry)}`);
  return entry;
}