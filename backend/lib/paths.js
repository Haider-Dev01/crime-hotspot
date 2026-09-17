const path = require('path');

const PROJECT_ROOT = process.env.PROJECT_ROOT || path.join(__dirname, '..', '..');
const CLEANED_DIR = path.join(PROJECT_ROOT, 'data', 'cleaned');

module.exports = {
  PROJECT_ROOT,
  CLEANED_DIR,
  CRIME_CSV_PATH: path.join(CLEANED_DIR, 'crime_cleaned.csv'),
  DEMOGRAPHIC_CSV_PATH: path.join(CLEANED_DIR, 'demographic_cleaned.csv'),
  MANIFEST_PATH: path.join(CLEANED_DIR, 'data_manifest.json'),
};
