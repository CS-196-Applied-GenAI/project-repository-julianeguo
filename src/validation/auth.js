const USERNAME_REGEX = /^[A-Za-z0-9_]{3,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateUsername(username) {
  if (typeof username !== "string" || username.length === 0) {
    return { valid: false, message: "Username is required." };
  }

  if (!USERNAME_REGEX.test(username)) {
    return {
      valid: false,
      message:
        "Username must be 3-20 characters and only contain letters, numbers, or underscores."
    };
  }

  return { valid: true };
}

export function validatePassword(password) {
  if (typeof password !== "string" || password.length === 0) {
    return { valid: false, message: "Password is required." };
  }

  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long." };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must include at least one uppercase letter." };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password must include at least one lowercase letter." };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must include at least one number." };
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, message: "Password must include at least one symbol." };
  }

  return { valid: true };
}

export function validateEmail(email) {
  if (typeof email !== "string" || email.trim().length === 0) {
    return { valid: false, message: "Email is required." };
  }

  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, message: "Email format is invalid." };
  }

  return { valid: true };
}

export function validateBio(bio) {
  if (typeof bio !== "string") {
    return { valid: false, message: "Bio must be a string." };
  }

  if (bio.length > 200) {
    return { valid: false, message: "Bio must be 200 characters or fewer." };
  }

  return { valid: true };
}
