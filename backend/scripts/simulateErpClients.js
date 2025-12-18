/* eslint-disable no-console */
require('dotenv').config();

async function main() {
  const apiUrl = process.env.SIM_API_URL || 'http://localhost:3000/api';

  const clients = [
    {
      ref_client_erp: 'CL90001',
      nom_complet: 'CLIENT DEMO 1',
      adresse: {
        ref_adresse_erp: 'AD90001',
        libelle_complet: 'Rue de la Démo 1',
        id_quartier: 1
      }
    },
    {
      ref_client_erp: 'CL90002',
      nom_complet: 'CLIENT DEMO 2',
      adresse: {
        ref_adresse_erp: 'AD90002',
        libelle_complet: 'Rue de la Démo 2',
        id_quartier: 2
      }
    }
  ];

  const res = await fetch(`${apiUrl}/integration/erp/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clients })
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Import clients failed (${res.status}): ${msg}`);
  }

  const data = await res.json();
  console.log('Import clients terminé:', data);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});




