const { Op } = require('sequelize');
const { Agent, Quartier, Adresse, Compteur, Releve, Client } = require('../models');
const { sendConsommationToFacturation } = require('../services/facturationService');

// Liste des adresses/compteurs non relevés pour un agent (pour l'app mobile)
const getTournees = async (req, res) => {
  try {
    const { agentId } = req.query;

    if (!agentId) {
      return res.status(400).json({ message: 'agentId est requis' });
    }

    const agent = await Agent.findByPk(agentId, { include: [Quartier] });
    if (!agent || !agent.id_quartier) {
      return res.status(404).json({ message: 'Agent introuvable ou non affecté à un quartier' });
    }

    // Récupérer tous les compteurs du quartier de l'agent
    const compteurs = await Compteur.findAll({
      include: [
        {
          model: Adresse,
          where: { id_quartier: agent.id_quartier },
          include: [Quartier],
          required: true
        },
        {
          model: Client,
          required: false
        },
        {
          model: Releve,
          required: false,
          where: {
            date_releve: {
              [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          }
        }
      ]
    });

    // Filtrer pour ne garder que ceux non relevés ce mois
    const nonReleves = compteurs.filter((c) => !c.Releves || c.Releves.length === 0);

    const payload = nonReleves.map((c) => ({
      numero_serie: c.numero_serie,
      type: c.type,
      index_actuel: c.index_actuel,
      adresse: {
        id_adresse: c.Adresse.id_adresse,
        libelle_complet: c.Adresse.libelle_complet,
        quartier: c.Adresse.Quartier ? c.Adresse.Quartier.libelle : null
      },
      client: c.Client
        ? {
            id_client: c.Client.id_client,
            nom_complet: c.Client.nom_complet
          }
        : null
    }));

    return res.status(200).json({
      agent: {
        id_agent: agent.id_agent,
        nom: agent.nom,
        prenom: agent.prenom,
        quartier: agent.Quartier ? agent.Quartier.libelle : null
      },
      compteurs: payload
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('MobileController.getTournees error:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la récupération des tournées' });
  }
};

// Wrapper pour création de relevé depuis l'app mobile
const createReleveMobile = async (req, res) => {
  try {
    const { numero_serie, nouvel_index, id_agent } = req.body;

    if (!numero_serie || nouvel_index === undefined || !id_agent) {
      return res.status(400).json({ message: 'numero_serie, nouvel_index et id_agent sont requis' });
    }

    const compteur = await Compteur.findByPk(numero_serie);
    if (!compteur) {
      return res.status(404).json({ message: 'Compteur introuvable' });
    }

    const ancien_index = compteur.index_actuel || 0;
    const nouvel_index_num = Number(nouvel_index);
    const ancien_index_num = Number(ancien_index);

    // Détection du rollover du compteur (ex: 99999 -> 00001)
    // On considère un rollover si l'ancien index est proche d'une valeur maximale typique
    // et que le nouvel index est beaucoup plus petit
    const METER_MAX_THRESHOLD = 99999; // Seuil pour détecter un compteur proche du maximum
    const ROLLOVER_THRESHOLD = 1000; // Si la différence est très grande, c'est probablement un rollover

    let consommation;
    if (nouvel_index_num < ancien_index_num) {
      // Possible rollover : vérifier si l'ancien index est proche du max
      if (ancien_index_num >= METER_MAX_THRESHOLD - ROLLOVER_THRESHOLD) {
        // Rollover détecté : consommation = (MAX - ancien) + nouvel
        // On utilise METER_MAX_THRESHOLD comme valeur max approximative
        consommation = (METER_MAX_THRESHOLD - ancien_index_num) + nouvel_index_num;
      } else {
        // Pas un rollover, c'est une erreur
        return res.status(400).json({ 
          message: 'nouvel_index doit être supérieur ou égal à ancien_index (sauf en cas de rollover du compteur)' 
        });
      }
    } else {
      // Cas normal : consommation = nouveau - ancien
      consommation = nouvel_index_num - ancien_index_num;
    }

    const releve = await Releve.create({
      date_releve: new Date(),
      ancien_index,
      nouvel_index,
      consommation,
      numero_serie,
      id_agent
    });

    compteur.index_actuel = nouvel_index;
    await compteur.save();

    // Simulation appel ERP Facturation via endpoint mock (non bloquante)
    try {
      await sendConsommationToFacturation({
        numero_serie,
        consommation,
        date_releve: releve.date_releve,
        id_client: compteur.id_client,
        authorization: req.headers.authorization || ''
      });
    } catch (factError) {
      // eslint-disable-next-line no-console
      console.warn('Erreur lors de l\'appel mock facturation (non bloquant):', factError.message);
    }

    return res.status(201).json({
      success: true,
      releve: {
        id_releve: releve.id_releve,
        date_releve: releve.date_releve,
        consommation
      }
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('MobileController.createReleveMobile error:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la création du relevé' });
  }
};

module.exports = {
  getTournees,
  createReleveMobile
};

