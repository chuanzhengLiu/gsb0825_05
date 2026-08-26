// Runs before each test file. Provides deterministic env so JWT signing/verify
// works and uploads land in a throwaway directory outside the repo.
const os = require('os');
const path = require('path');

process.env.JWT_SECRET = 'test-secret';
process.env.UPLOAD_DIR = path.join(os.tmpdir(), 'flytie-atlas-test-uploads');
