export function validatePostContent(content) {
  if (typeof content !== "string") {
    return { valid: false, message: "Post content is required." };
  }

  if (content.length < 1 || content.length > 280) {
    return { valid: false, message: "Post content must be between 1 and 280 characters." };
  }

  return { valid: true };
}
