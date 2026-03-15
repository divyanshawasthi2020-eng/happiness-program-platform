// ─── Template Engine ──────────────────────────────────────────────────────────
// Replaces {VariableName} placeholders in message templates.
// Supported variables: {Name} {City} {CourseDate} {TeacherName} {OrgLink}
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Replace all {Variable} placeholders in a template string
 * @param {string} template
 * @param {object} vars - { Name, City, CourseDate, TeacherName, OrgLink }
 * @returns {string}
 */
export function buildMessage(template, vars = {}) {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return vars[key] !== undefined ? vars[key] : match;
  });
}

/**
 * Extract all variable names from a template
 */
export function extractVariables(template) {
  const matches = template.match(/\{(\w+)\}/g) || [];
  return [...new Set(matches.map(m => m.slice(1, -1)))];
}

/**
 * Preview a template with sample data
 */
export function previewTemplate(template, teacherName = 'Your Name') {
  return buildMessage(template, {
    Name:        'Priya Sharma',
    City:        'Mumbai',
    CourseDate:  '15 April 2026',
    TeacherName: teacherName,
    OrgLink:     'https://www.artofliving.org/happiness-program',
  });
}

// Supported variables documentation
export const TEMPLATE_VARIABLES = [
  { key: '{Name}',        desc: 'Lead\'s first name',        example: 'Priya' },
  { key: '{City}',        desc: 'Lead\'s city or course city', example: 'Mumbai' },
  { key: '{CourseDate}',  desc: 'Course date (auto-formatted)', example: '15 April 2026' },
  { key: '{TeacherName}', desc: 'Teacher\'s display name',   example: 'Meera Sharma' },
  { key: '{OrgLink}',     desc: 'Organisation registration link', example: 'https://...' },
];
