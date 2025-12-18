/* eslint-disable no-console */
require('dotenv').config();

async function main() {
  const apiUrl = process.env.SIM_API_URL || 'http://localhost:3000/api';

  const agents = [
    {
      matricule_rh: 'RH9001',
      nom: 'AGENT',
      prenom: 'Demo1',
      id_quartier: 1
    },
    {
      matricule_rh: 'RH9002',
      nom: 'AGENT',
      prenom: 'Demo2',
      id_quartier: 2
    }
  ];

  const res = await fetch(`${apiUrl}/integration/erp/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agents })
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Import agents failed (${res.status}): ${msg}`);
  }

  const data = await res.json();
  console.log('Import agents terminé:', data);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});





