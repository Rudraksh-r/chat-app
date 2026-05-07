/**
 * Extracts the avatar URL from a user object.
 * Handles both the new object shape { url, public_id }
 * and the old string shape for backward compatibility.
 * Falls back to a generated avatar if none exists.
 *
 * @param {object} user - A user object from the API
 * @returns {string} - A valid image URL, always
 */
export const getAvatarUrl = (user) => {
  if (!user) return getDefaultAvatar("?");

  // New shape: avatar is an object with a url property
  if (user.avatar?.url) return user.avatar.url;

  // Old shape: avatar is a plain string (backward compat)
  if (typeof user.avatar === "string" && user.avatar) return user.avatar;

  // Fallback: generate a placeholder avatar using the user's name.
  // ui-avatars.com generates letter-based avatars for free.
  // This means every user always has a visually distinct avatar
  // even before they upload one.
  return getDefaultAvatar(user.fullName || user.username || "?");
};

const getDefaultAvatar = (name) => {
  const encoded = encodeURIComponent(name);
  return `https://ui-avatars.com/api/?name=${encoded}&background=4F46E5&color=fff&size=150`;
};

// Explain the working of this code in detail