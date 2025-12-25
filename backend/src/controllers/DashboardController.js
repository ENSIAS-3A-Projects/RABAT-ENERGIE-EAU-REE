const { Op, fn, col, literal } = require('sequelize');
const { Compteur, Releve, Agent } = require('../models');

const getStats = async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const totalCompteurs = await Compteur.count();

    const relevésCeMois = await Releve.count({
      distinct: true,
      col: 'numero_serie',
      where: {
        date_releve: {
          [Op.gte]: monthStart,
          [Op.lt]: nextMonthStart
        }
      }
    });

    const tauxCouverture =
      totalCompteurs === 0 ? 0 : Number(((relevésCeMois / totalCompteurs) * 100).toFixed(2));

    // Top Agents par nombre de relevés
    const topAgentsRaw = await Releve.findAll({
      attributes: [
        'id_agent',
        [fn('COUNT', col('Releve.id_releve')), 'nbReleves']
      ],
      include: [
        {
          model: Agent,
          attributes: ['id_agent', 'nom', 'prenom']
        }
      ],
      group: ['Releve.id_agent', 'Agent.id_agent'],
      order: [[literal('nbReleves'), 'DESC']],
      limit: 10
    });

    const topAgents = topAgentsRaw.map((row) => ({
      id_agent: row.id_agent,
      nom: row.Agent?.nom,
      prenom: row.Agent?.prenom,
      nbReleves: Number(row.get('nbReleves'))
    }));

    // Consommation par mois (Eau + Elec confondus) sur les 6 derniers mois
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const consommationParMoisRaw = await Releve.findAll({
      attributes: [
        [fn('YEAR', col('date_releve')), 'annee'],
        [fn('MONTH', col('date_releve')), 'mois'],
        [fn('SUM', col('consommation')), 'totalConsommation']
      ],
      where: {
        date_releve: {
          [Op.gte]: sixMonthsAgo,
          [Op.lte]: now
        }
      },
      group: ['annee', 'mois'],
      order: [
        [literal('annee'), 'ASC'],
        [literal('mois'), 'ASC']
      ]
    });

    const consommationParMois = consommationParMoisRaw.map((row) => ({
      annee: row.get('annee'),
      mois: row.get('mois'),
      totalConsommation: Number(row.get('totalConsommation') || 0)
    }));

    return res.status(200).json({
      tauxCouverture,
      totalCompteurs,
      relevésCeMois,
      topAgents,
      consommationParMois
    });
  } catch (error) {
    console.error('DashboardController.getStats error:', error);
    return res.status(500).json({ message: 'Erreur serveur lors du calcul des statistiques' });
  }
};

module.exports = {
  getStats
};







