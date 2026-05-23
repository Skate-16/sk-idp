const { dataDir, generatedDir, catalogFile, eventsFile } = require('../config/paths');
const fileStore = require('../utils/fileStore');

function ensureStorage() {
  for (const dir of [dataDir, generatedDir]) fileStore.ensureDir(dir);
  fileStore.ensureFile(catalogFile, '[]');
  fileStore.ensureFile(eventsFile, '');
}

module.exports = { ensureStorage };
