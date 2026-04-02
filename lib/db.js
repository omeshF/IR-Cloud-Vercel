// Simple in-memory storage for Vercel (will reset on cold starts)
let inMemoryUsers = null;
let inMemoryAuditLog = [];
let inMemorySessions = {};
let inMemoryLoginAttempts = {};

// Default users with credit card data (PII)
const defaultUsers = [
  { id: 1, username: "admin", password: "password123", email: "admin@corp.com", role: "admin", salary: 95000, credit_card: "4532-1234-5678-9012", ssn: "123-45-6789" },
  { id: 2, username: "alice", password: "letmein", email: "alice@corp.com", role: "staff", salary: 52000, credit_card: "4916-5432-1098-7654", ssn: "987-65-4321" },
  { id: 3, username: "bob", password: "bob123", email: "bob@corp.com", role: "staff", salary: 48000, credit_card: "6011-2345-6789-0123", ssn: "456-78-9012" },
];

export async function getUsers() {
  if (!inMemoryUsers) {
    inMemoryUsers = [...defaultUsers];
  }
  return inMemoryUsers;
}

export async function saveUsers(users) {
  inMemoryUsers = users;
}

export async function addLogEntry(type, detail, req) {
  const entry = {
    id: Date.now(),
    ts: new Date().toISOString(),
    type,
    detail,
    ip: req?.headers?.['x-forwarded-for'] || 'unknown',
    userAgent: req?.headers?.['user-agent']?.substring(0, 100) || 'unknown',
  };
  
  inMemoryAuditLog.push(entry);
  console.log(`[AUDIT] ${JSON.stringify(entry)}`);
  return entry;
}

export async function getAuditLog() {
  return inMemoryAuditLog;
}

export async function getSessions() {
  return inMemorySessions;
}

export async function saveSessions(sessions) {
  inMemorySessions = sessions;
}

export const loginAttempts = inMemoryLoginAttempts;

export const users = defaultUsers;
export const auditLog = inMemoryAuditLog;
export const sessions = inMemorySessions;

export function logEvent(type, detail, req) {
  return addLogEntry(type, detail, req);
}