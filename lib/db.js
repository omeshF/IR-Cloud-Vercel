// lib/db.js - In-memory storage for demo
export const users = [
  { id: 1, username: "admin",   password: "password123",  email: "admin@corp.com",   role: "admin",  salary: 95000 },
  { id: 2, username: "alice",   password: "letmein",      email: "alice@corp.com",   role: "staff",  salary: 52000 },
  { id: 3, username: "bob",     password: "bob123",       email: "bob@corp.com",     role: "staff",  salary: 48000 },
];

export let auditLog = [];

export function logEvent(type, detail, req) {
  const entry = {
    ts:        new Date().toISOString(),
    type,
    detail,
    ip:        req?.headers?.['x-forwarded-for'] || 'unknown',
    userAgent: req?.headers?.['user-agent']?.substring(0, 80) || 'unknown',
  };
  auditLog.push(entry);
  console.log(`[AUDIT] ${JSON.stringify(entry)}`);
  return entry;
}

// Optional: Add new user (in-memory, will reset on cold start)
export function addUser(user) {
  users.push(user);
  return user;
}