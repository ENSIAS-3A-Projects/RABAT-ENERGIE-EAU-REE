const http = require('http');

/**
 * Simulation appel ERP Facturation via endpoint mock.
 * Ne doit jamais faire échouer le flux métier appelant.
 *
 * @param {Object} params
 * @param {string} params.numero_serie
 * @param {number} params.consommation
 * @param {Date|string} params.date_releve
 * @param {number} params.id_client
 * @param {string} [params.authorization] - header Authorization à propager
 */
async function sendConsommationToFacturation({
  numero_serie,
  consommation,
  date_releve,
  id_client,
  authorization = ''
}) {
  const apiUrl = process.env.API_URL || 'http://localhost:3000';
  const url = new URL(`${apiUrl}/api/mock/facturation/consommations`);

  const postData = JSON.stringify({
    numero_serie,
    consommation,
    date_releve,
    id_client
  });

  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      Authorization: authorization || ''
    }
  };

  await new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

module.exports = {
  sendConsommationToFacturation
};





