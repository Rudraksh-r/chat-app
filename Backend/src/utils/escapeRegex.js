/**
 * Escapes all regex metacharacters in a string so it can be safely
 * used inside a RegExp / MongoDB $regex without risk of ReDoS or
 * regex-injection.
 *
 * @param {string} str — raw user input
 * @returns {string} escaped string safe for RegExp construction
 */
export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
