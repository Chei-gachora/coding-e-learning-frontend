// src/lib/auth.js
// Simple mock authentication library for development purposes.
// In a real application this would interface with a backend API.

/**
 * Simulate a login request.
 * Returns a promise that resolves with an access token, refresh token, and user data.
 */
export async function login(email, password, customName = "") {
  // Simple validation – in development we accept any non‑empty credentials.
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  // Determine role based on email prefix (mirrors detectRoleFromEmail).
  const lower = email.toLowerCase().trim();
  const localPart = lower.split("@")[0];
  let role = "student";
  if (localPart === "admin" || localPart.startsWith("admin.") || localPart.startsWith("admin_")) {
    role = "admin";
  } else if (localPart === "instructor" || localPart.startsWith("instructor.") || localPart.startsWith("instructor_")) {
    role = "instructor";
  }

  const user = {
    id: `usr_${role}_1`,
    name: customName || (role === "admin" ? "System Admin" : role === "instructor" ? "Dr. Sarah Jenkins" : "Alex Johnson"),
    email,
    role,
    avatar: role.charAt(0).toUpperCase(),
    title: role === "admin" ? "Platform Administrator" : role === "instructor" ? "Senior Instructor" : "Student Learner"
  };

  // Fake JWT‑like tokens (just strings for demo).
  const access = "fake-access-token";
  const refresh = "fake-refresh-token";

  return { access, refresh, user };
}

/**
 * Simulate a logout request.
 * In a real app this would invalidate the refresh token on the server.
 */
export async function logout(refreshToken) {
  // No‑op for the mock – simply resolve.
  return Promise.resolve();
}
