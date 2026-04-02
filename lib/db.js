// Simple in-memory storage for Vercel (will reset on cold starts)
// For production, replace with Vercel KV or Upstash Redis

// In-memory storage (shared within the same function instance)
let inMemoryUsers = null;
let inMemoryAuditLog = [];
let inMemorySessions = {};
let inMemoryLoginAttempts = {};

// Default users
const defaultUsers = [
  { id: 1, username: "admin", password: "password123", email: "admin@corp.com", role: "admin", salary: 95000 },
  { id: 2, username: "alice", password: "letmein", email: "alice@corp.com", role: "staff", salary: 52000 },
  { id: 3, username: "bob", password: "bob123", email: "bob@corp.com", role: "staff", salary: 48000 },
];

// Get users from memory
export async function getUsers() {
  if (!inMemoryUsers) {
    inMemoryUsers = [...defaultUsers];
  }
  return inMemoryUsers;
}

// Save users back to memory
export async function saveUsers(users) {
  inMemoryUsers = users;
}

// Add a log entry
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

// Get all audit logs
export async function getAuditLog() {
  return inMemoryAuditLog;
}

// Session management
export async function getSessions() {
  return inMemorySessions;
}

export async function saveSessions(sessions) {
  inMemorySessions = sessions;
}

// Login attempts tracking
export const loginAttempts = inMemoryLoginAttempts;

// For backward compatibility
export const users = defaultUsers;
export const auditLog = inMemoryAuditLog;
export const sessions = inMemorySessions;

export function logEvent(type, detail, req) {
  return addLogEntry(type, detail, req);
}