const { Op } = require('sequelize');
const {
  Compteur, Releve, Adresse, Quartier, Agent
} = require('../models');
const { sendConsommationToFacturation } = require('../services/facturationService');

const createReleve = async (req, res) => {
  try {
    const { numero_serie, nouvel_index, id_agent } = req.body;

    if (!numero_serie || nouvel_index === undefined || !id_agent) {
      return res
        .status(400)
        .json({ message: 'numero_serie, nouvel_index et id_agent sont requis' });
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
        return res
          .status(400)
          .json({ 
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
      // Ne pas faire échouer la création du relevé si l'appel mock échoue
      // eslint-disable-next-line no-console
      console.warn('Erreur lors de l\'appel mock facturation (non bloquant):', factError.message);
    }

    return res.status(201).json(releve);
  } catch (error) {
    console.error('ReleveController.createReleve error:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la création du relevé' });
  }
};

const listReleves = async (req, res) => {
  try {
    const { dateFrom, dateTo, quartier } = req.query;

    const where = {};

    if (dateFrom || dateTo) {
      where.date_releve = {};
      if (dateFrom) {
        where.date_releve[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        where.date_releve[Op.lte] = new Date(dateTo);
      }
    }

    const quartierFilter = quartier && quartier !== 'ALL'
      ? { libelle: quartier }
      : {};

    const releves = await Releve.findAll({
      where,
      include: [
        {
          model: Compteur,
          include: [
            {
              model: Adresse,
              include: [
                {
                  model: Quartier,
                  where: quartierFilter
                }
              ]
            }
          ]
        },
        {
          model: Agent
        }
      ],
      order: [['date_releve', 'DESC']],
      limit: 500
    });

    const payload = releves.map((r) => ({
      id_releve: r.id_releve,
      date_releve: r.date_releve,
      ancien_index: r.ancien_index,
      nouvel_index: r.nouvel_index,
      consommation: r.consommation,
      numero_serie: r.Compteur?.numero_serie,
      type_compteur: r.Compteur?.type,
      quartier: r.Compteur?.Adresse?.Quartier?.libelle,
      agent: r.Agent
        ? {
            id_agent: r.Agent.id_agent,
            nom: r.Agent.nom,
            prenom: r.Agent.prenom
          }
        : null
    }));

    return res.status(200).json(payload);
  } catch (error) {
    console.error('ReleveController.listReleves error:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la récupération des relevés' });
  }
};

module.exports = {
  createReleve,
  listReleves
};


