// Mirrors the varchar(n) limits in schema.sql — keep in sync if the schema changes.
const LIMITS = {
  user_name: 100,
  user_email: 150,
  book_title: 255,
  book_author: 150,
  book_genre: 100,
};

/**
 * Checks a set of {field: value} pairs against LIMITS keys of the same name.
 * Returns an error message string, or null if everything is within bounds.
 */
function checkLengths(fields) {
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    const max = LIMITS[key];
    if (max && String(value).length > max) {
      const label = key.split('_').slice(1).join(' ') || key;
      return `${label} must be ${max} characters or fewer`;
    }
  }
  return null;
}

module.exports = { LIMITS, checkLengths };
