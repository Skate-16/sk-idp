const path = require('path');

const root = path.join(__dirname, '..');

module.exports = {
  root,
  dataDir: path.join(root, 'data'),
  generatedDir: path.join(root, 'generated-services'),
  catalogFile: path.join(root, 'data', 'catalog.json'),
  eventsFile: path.join(root, 'data', 'events.log'),
  publicDir: path.join(root, 'public')
};
