const {
  Client,
  Adresse,
  Agent,
  Quartier
} = require('../models');

// Simulation SI Commercial -> SI Relevés : création de clients + adresses
const importClients = async (req, res) => {
  try {
    const { clients } = req.body;
    if (!Array.isArray(clients) || clients.length === 0) {
      return res.status(400).json({ message: 'clients est requis (tableau non vide)' });
    }

    const created = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const c of clients) {
      // eslint-disable-next-line no-await-in-loop
      const client = await Client.create({
        ref_client_erp: c.ref_client_erp,
        nom_complet: c.nom_complet
      });

      if (c.adresse) {
        // eslint-disable-next-line no-await-in-loop
        await Adresse.create({
          libelle_complet: c.adresse.libelle_complet,
          ref_adresse_erp: c.adresse.ref_adresse_erp,
          id_quartier: c.adresse.id_quartier
        });
      }

      created.push(client);
    }

    return res.status(201).json({ created: created.length });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('IntegrationController.importClients error:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de l’import des clients' });
  }
};

// Simulation SI RH -> SI Relevés : création/mise à jour d’agents
const importAgents = async (req, res) => {
  try {
    const { agents } = req.body;
    if (!Array.isArray(agents) || agents.length === 0) {
      return res.status(400).json({ message: 'agents est requis (tableau non vide)' });
    }

    let created = 0;
    let updated = 0;

    // eslint-disable-next-line no-restricted-syntax
    for (const a of agents) {
      // eslint-disable-next-line no-await-in-loop
      const existing = await Agent.findOne({ where: { matricule_rh: a.matricule_rh } });
      if (existing) {
        existing.nom = a.nom;
        existing.prenom = a.prenom;
        existing.id_quartier = a.id_quartier;
        // eslint-disable-next-line no-await-in-loop
        await existing.save();
        updated += 1;
      } else {
        // eslint-disable-next-line no-await-in-loop
        await Agent.create({
          matricule_rh: a.matricule_rh,
          nom: a.nom,
          prenom: a.prenom,
          id_quartier: a.id_quartier
        });
        created += 1;
      }
    }

    return res.status(200).json({ created, updated });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('IntegrationController.importAgents error:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de l’import des agents' });
  }
};

// Simulation mobile : liste des adresses à relever par agent
const listTournees = async (req, res) => {
  try {
    const { agentId } = req.query;
    if (!agentId) {
      return res.status(400).json({ message: 'agentId est requis' });
    }

    const agent = await Agent.findByPk(agentId, { include: [Quartier] });
    if (!agent || !agent.id_quartier) {
      return res.status(404).json({ message: 'Agent introuvable ou non affecté' });
    }

    const adresses = await Adresse.findAll({
      where: { id_quartier: agent.id_quartier },
      include: [Quartier]
    });

    const payload = adresses.map((a) => ({
      id_adresse: a.id_adresse,
      libelle_complet: a.libelle_complet,
      quartier: a.Quartier ? a.Quartier.libelle : null
    }));

    return res.status(200).json(payload);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('IntegrationController.listTournees error:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la récupération des tournées' });
  }
};

module.exports = {
  importClients,
  importAgents,
  listTournees
};






