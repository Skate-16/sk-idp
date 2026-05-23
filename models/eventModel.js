const { eventsFile } = require('../config/paths');
const fileStore = require('../utils/fileStore');

function add(type, message, meta = {}) {
  const row = { time: new Date().toISOString(), type, message, meta };
  fileStore.appendLine(eventsFile, JSON.stringify(row));
}

function recent(limit = 20) {
  return fileStore.readText(eventsFile)
    .trim()
    .split('\n')
    .filter(Boolean)
    .slice(-limit)
    .reverse()
    .map(line => JSON.parse(line));
}

module.exports = { add, recent };
