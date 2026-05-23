const http = require('http');

function checkUrl(url) {
  return new Promise(resolve => {
    if (!url) return resolve(false);
    const req = http.get(url, res => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.setTimeout(1200, () => {
      req.destroy();
      resolve(false);
    });
    req.on('error', () => resolve(false));
  });
}

async function withRuntimeStatus(services) {
  return Promise.all(services.map(async service => {
    const localHealthUrl = service.publicUrl ? `${service.publicUrl}/health` : '';
    const awsHealthUrl = service.awsUrl ? `${service.awsUrl}/health` : '';
    const localRunning = await checkUrl(localHealthUrl);
    const awsRunning = await checkUrl(awsHealthUrl);

    return {
      ...service,
      localHealthUrl,
      awsHealthUrl,
      localStatus: localRunning ? 'running' : 'not running',
      awsStatus: service.awsUrl ? (awsRunning ? 'running' : 'not running') : 'not deployed',
      runtimeStatus: localRunning || awsRunning ? 'running' : 'not running'
    };
  }));
}

module.exports = { withRuntimeStatus };
