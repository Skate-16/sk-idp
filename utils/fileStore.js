const fs = require('fs');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function ensureFile(filePath, content) {
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, content);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeText(filePath, content) {
  fs.writeFileSync(filePath, content);
}

function appendLine(filePath, content) {
  fs.appendFileSync(filePath, content + '\n');
}

function removeDir(dirPath) {
  if (fs.existsSync(dirPath)) fs.rmSync(dirPath, { recursive: true, force: true });
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

module.exports = { ensureDir, ensureFile, readJson, writeJson, readText, writeText, appendLine, removeDir, exists };
