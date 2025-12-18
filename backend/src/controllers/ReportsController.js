const { Op, fn, col, literal } = require('sequelize');
const { Releve, Compteur, Agent, Adresse, Quartier } = require('../models');

const getMonthlyReport = async (req, res) => {
  try {
    const year = Number(req.query.year);
    const month = Number(req.query.month);

    if (!year || !month) {
      return res.status(400).json({ message: 'year et month sont requis' });
    }

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    // Calculer le nombre de jours dans le mois
    const daysInMonth = new Date(year, month, 0).getDate();

    // Relevés joints pour statistiques détaillées
    const relevés = await Releve.findAll({
      where: {
        date_releve: {
          [Op.gte]: start,
          [Op.lt]: end
        }
      },
      include: [
        {
          model: Compteur,
          include: [
            {
              model: Adresse,
              include: [Quartier]
            }
          ]
        },
        {
          model: Agent
        }
      ]
    });

    // Agrégation par agent et par type
    const perAgent = {};
    const perQuartier = {};
    const perType = { EAU: { nbReleves: 0, totalConsommation: 0 }, ELECTRICITE: { nbReleves: 0, totalConsommation: 0 } };

    relevés.forEach((r) => {
      const agentKey = r.Agent ? r.Agent.id_agent : null;
      const q = r.Compteur?.Adresse?.Quartier;
      const quartierKey = q ? q.id_quartier : null;
      const cons = r.consommation || 0;
      const type = r.Compteur?.type || 'UNKNOWN';

      // Par type
      if (type === 'EAU' || type === 'ELECTRICITE') {
        perType[type].nbReleves += 1;
        perType[type].totalConsommation += cons;
      }

      if (agentKey) {
        if (!perAgent[agentKey]) {
          perAgent[agentKey] = {
            id_agent: r.Agent.id_agent,
            nom: r.Agent.nom,
            prenom: r.Agent.prenom,
            nbReleves: 0,
            totalConsommation: 0,
            parType: { EAU: { nbReleves: 0, totalConsommation: 0 }, ELECTRICITE: { nbReleves: 0, totalConsommation: 0 } },
            parQuartier: {}
          };
        }
        perAgent[agentKey].nbReleves += 1;
        perAgent[agentKey].totalConsommation += cons;
        if (type === 'EAU' || type === 'ELECTRICITE') {
          perAgent[agentKey].parType[type].nbReleves += 1;
          perAgent[agentKey].parType[type].totalConsommation += cons;
        }
        // Compter par quartier pour cet agent
        if (quartierKey) {
          if (!perAgent[agentKey].parQuartier[quartierKey]) {
            perAgent[agentKey].parQuartier[quartierKey] = {
              id_quartier: q.id_quartier,
              libelle: q.libelle,
              nbReleves: 0
            };
          }
          perAgent[agentKey].parQuartier[quartierKey].nbReleves += 1;
        }
      }

      if (quartierKey) {
        if (!perQuartier[quartierKey]) {
          perQuartier[quartierKey] = {
            id_quartier: q.id_quartier,
            libelle: q.libelle,
            ville: q.ville,
            nbReleves: 0,
            totalConsommation: 0,
            parType: { EAU: { nbReleves: 0, totalConsommation: 0 }, ELECTRICITE: { nbReleves: 0, totalConsommation: 0 } }
          };
        }
        perQuartier[quartierKey].nbReleves += 1;
        perQuartier[quartierKey].totalConsommation += cons;
        if (type === 'EAU' || type === 'ELECTRICITE') {
          perQuartier[quartierKey].parType[type].nbReleves += 1;
          perQuartier[quartierKey].parType[type].totalConsommation += cons;
        }
      }
    });

    // Calculer le nombre moyen de relevés par agent par jour par quartier
    const agentsWithAverages = Object.values(perAgent).map((agent) => {
      const quartiersWithAvg = Object.values(agent.parQuartier || {}).map((q) => ({
        ...q,
        moyenneRelevesParJour: daysInMonth > 0 ? Number((q.nbReleves / daysInMonth).toFixed(2)) : 0
      }));
      return {
        ...agent,
        moyenneRelevesParJour: daysInMonth > 0 ? Number((agent.nbReleves / daysInMonth).toFixed(2)) : 0,
        parQuartier: quartiersWithAvg
      };
    });

    return res.status(200).json({
      periode: { year, month },
      joursDansMois: daysInMonth,
      totalReleves: relevés.length,
      parType: perType,
      parAgent: agentsWithAverages,
      parQuartier: Object.values(perQuartier)
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('ReportsController.getMonthlyReport error:', error);
    return res.status(500).json({ message: 'Erreur serveur lors du rapport mensuel' });
  }
};

const getYearlyComparison = async (req, res) => {
  try {
    const year = Number(req.query.year);
    if (!year) {
      return res.status(400).json({ message: 'year est requis' });
    }

    const startCurrent = new Date(year, 0, 1);
    const endCurrent = new Date(year + 1, 0, 1);
    const startPrev = new Date(year - 1, 0, 1);
    const endPrev = new Date(year, 0, 1);

    const aggregate = async (start, end) => {
      const rows = await Releve.findAll({
        attributes: [
          [fn('MONTH', col('date_releve')), 'mois'],
          [fn('SUM', col('consommation')), 'totalConsommation']
        ],
        where: {
          date_releve: {
            [Op.gte]: start,
            [Op.lt]: end
          }
        },
        include: [
          {
            model: Compteur,
            attributes: ['type'],
            required: true
          }
        ],
        // Pour respecter ONLY_FULL_GROUP_BY, on ajoute le PK du compteur au GROUP BY.
        group: ['mois', 'Compteur.type', 'Compteur.numero_serie'],
        // On ordonne uniquement par mois ; l'ordre par type n'est pas nécessaire ici.
        order: [[literal('mois'), 'ASC']]
      });
      
      // Organiser par mois et par type
      const byMonth = {};
      rows.forEach((r) => {
        const mois = r.get('mois');
        const type = r.Compteur?.type || 'UNKNOWN';
        if (!byMonth[mois]) {
          byMonth[mois] = {
            mois,
            EAU: 0,
            ELECTRICITE: 0,
            total: 0
          };
        }
        const cons = Number(r.get('totalConsommation') || 0);
        if (type === 'EAU' || type === 'ELECTRICITE') {
          byMonth[mois][type] = cons;
        }
        byMonth[mois].total += cons;
      });
      
      return Object.values(byMonth).sort((a, b) => a.mois - b.mois);
    };

    const current = await aggregate(startCurrent, endCurrent);
    const previous = await aggregate(startPrev, endPrev);

    return res.status(200).json({
      year,
      current,
      previous
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('ReportsController.getYearlyComparison error:', error);
    return res.status(500).json({ message: 'Erreur serveur lors du rapport annuel comparatif' });
  }
};

// Génération PDF simplifiée : on renvoie un PDF texte avec les principaux indicateurs.
const getMonthlyReportPdf = async (req, res) => {
  // eslint-disable-next-line global-require
  const PDFDocument = require('pdfkit');

  try {
    const year = Number(req.query.year);
    const month = Number(req.query.month);

    if (!year || !month) {
      return res.status(400).json({ message: 'year et month sont requis' });
    }

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const relevés = await Releve.findAll({
      where: {
        date_releve: {
          [Op.gte]: start,
          [Op.lt]: end
        }
      },
      include: [
        {
          model: Compteur,
          include: [
            {
              model: Adresse,
              include: [Quartier]
            }
          ]
        },
        {
          model: Agent
        }
      ]
    });

    const perAgent = {};
    const perQuartier = {};

    relevés.forEach((r) => {
      const agentKey = r.Agent ? r.Agent.id_agent : null;
      const q = r.Compteur?.Adresse?.Quartier;
      const quartierKey = q ? q.id_quartier : null;
      const cons = r.consommation || 0;

      if (agentKey) {
        if (!perAgent[agentKey]) {
          perAgent[agentKey] = {
            id_agent: r.Agent.id_agent,
            nom: r.Agent.nom,
            prenom: r.Agent.prenom,
            nbReleves: 0,
            totalConsommation: 0
          };
        }
        perAgent[agentKey].nbReleves += 1;
        perAgent[agentKey].totalConsommation += cons;
      }

      if (quartierKey) {
        if (!perQuartier[quartierKey]) {
          perQuartier[quartierKey] = {
            id_quartier: q.id_quartier,
            libelle: q.libelle,
            ville: q.ville,
            nbReleves: 0,
            totalConsommation: 0
          };
        }
        perQuartier[quartierKey].nbReleves += 1;
        perQuartier[quartierKey].totalConsommation += cons;
      }
    });

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="rapport_${year}_${month}.pdf"`
    );
    doc.pipe(res);

    doc.fontSize(18).text(`Rapport mensuel ${month}/${year}`, { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Total relevés: ${relevés.length}`);
    doc.moveDown();
    doc.fontSize(14).text('Par agent:');
    Object.values(perAgent).forEach((a) => {
      doc
        .fontSize(10)
        .text(
          `- ${a.nom} ${a.prenom}: ${a.nbReleves} relevés, ${a.totalConsommation} unités consommées`
        );
    });
    doc.moveDown();
    doc.fontSize(14).text('Par quartier:');
    Object.values(perQuartier).forEach((q) => {
      doc
        .fontSize(10)
        .text(
          `- ${q.libelle} (${q.ville}): ${q.nbReleves} relevés, ${q.totalConsommation} unités`
        );
    });

    doc.end();
    return null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('ReportsController.getMonthlyReportPdf error:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la génération du PDF' });
  }
};

// Fonction pour calculer la tendance (régression linéaire simple)
function calculateTrend(data) {
  if (!data || data.length < 2) {
    return { slope: 0, intercept: 0, trend: 'stable' };
  }

  const n = data.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  data.forEach((point, index) => {
    const x = index + 1;
    const y = point.totalConsommation || point.total || 0;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  let trend = 'stable';
  if (slope > 0.1) trend = 'increasing';
  else if (slope < -0.1) trend = 'decreasing';

  return { slope, intercept, trend };
}

// Endpoint pour obtenir les tendances
const getTrends = async (req, res) => {
  try {
    const { year, months = 6 } = req.query;
    const numMonths = Number(months);
    const targetYear = Number(year) || new Date().getFullYear();

    const startDate = new Date(targetYear, 0, 1);
    const endDate = new Date(targetYear + 1, 0, 1);

    // Récupérer les données mensuelles
    const rows = await Releve.findAll({
      attributes: [
        [fn('MONTH', col('date_releve')), 'mois'],
        [fn('SUM', col('consommation')), 'totalConsommation']
      ],
      where: {
        date_releve: {
          [Op.gte]: startDate,
          [Op.lt]: endDate
        }
      },
      include: [
        {
          model: Compteur,
          attributes: ['type'],
          required: true
        }
      ],
      // Ajout de Compteur.numero_serie pour compatibilité ONLY_FULL_GROUP_BY.
      group: ['mois', 'Compteur.type', 'Compteur.numero_serie'],
      order: [[literal('mois'), 'ASC']]
    });

    // Organiser par mois et type
    const monthlyData = {};
    rows.forEach((r) => {
      const mois = r.get('mois');
      const type = r.Compteur?.type || 'UNKNOWN';
      if (!monthlyData[mois]) {
        monthlyData[mois] = { mois, EAU: 0, ELECTRICITE: 0, total: 0 };
      }
      const cons = Number(r.get('totalConsommation') || 0);
      if (type === 'EAU' || type === 'ELECTRICITE') {
        monthlyData[mois][type] = cons;
      }
      monthlyData[mois].total += cons;
    });

    const sortedData = Object.values(monthlyData)
      .sort((a, b) => a.mois - b.mois)
      .slice(-numMonths);

    // Calculer les tendances
    const trendTotal = calculateTrend(sortedData.map((d) => ({ total: d.total })));
    const trendEau = calculateTrend(sortedData.map((d) => ({ totalConsommation: d.EAU })));
    const trendElectricite = calculateTrend(sortedData.map((d) => ({ totalConsommation: d.ELECTRICITE })));

    return res.status(200).json({
      periode: { year: targetYear, months: numMonths },
      donnees: sortedData,
      tendances: {
        total: trendTotal,
        EAU: trendEau,
        ELECTRICITE: trendElectricite
      }
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('ReportsController.getTrends error:', error);
    return res.status(500).json({ message: 'Erreur serveur lors du calcul des tendances' });
  }
};

// PDF export pour les tendances de consommation
const getTrendsPdf = async (req, res) => {
  // eslint-disable-next-line global-require
  const PDFDocument = require('pdfkit');

  try {
    const { year, months = 6 } = req.query;
    const numMonths = Number(months);
    const targetYear = Number(year) || new Date().getFullYear();

    const startDate = new Date(targetYear, 0, 1);
    const endDate = new Date(targetYear + 1, 0, 1);

    // Récupérer les données mensuelles (même logique que getTrends)
    const rows = await Releve.findAll({
      attributes: [
        [fn('MONTH', col('date_releve')), 'mois'],
        [fn('SUM', col('consommation')), 'totalConsommation']
      ],
      where: {
        date_releve: {
          [Op.gte]: startDate,
          [Op.lt]: endDate
        }
      },
      include: [
        {
          model: Compteur,
          attributes: ['type'],
          required: true
        }
      ],
      group: ['mois', 'Compteur.type', 'Compteur.numero_serie'],
      order: [[literal('mois'), 'ASC']]
    });

    // Organiser par mois et type
    const monthlyData = {};
    rows.forEach((r) => {
      const mois = r.get('mois');
      const type = r.Compteur?.type || 'UNKNOWN';
      if (!monthlyData[mois]) {
        monthlyData[mois] = { mois, EAU: 0, ELECTRICITE: 0, total: 0 };
      }
      const cons = Number(r.get('totalConsommation') || 0);
      if (type === 'EAU' || type === 'ELECTRICITE') {
        monthlyData[mois][type] = cons;
      }
      monthlyData[mois].total += cons;
    });

    const sortedData = Object.values(monthlyData)
      .sort((a, b) => a.mois - b.mois)
      .slice(-numMonths);

    // Calculer les tendances
    const trendTotal = calculateTrend(sortedData.map((d) => ({ total: d.total })));
    const trendEau = calculateTrend(sortedData.map((d) => ({ totalConsommation: d.EAU })));
    const trendElectricite = calculateTrend(sortedData.map((d) => ({ totalConsommation: d.ELECTRICITE })));

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="rapport_tendances_${targetYear}.pdf"`
    );
    doc.pipe(res);

    doc.fontSize(18).text(`Rapport des Tendances de Consommation ${targetYear}`, { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Période analysée: ${numMonths} derniers mois de ${targetYear}`);
    doc.moveDown();

    // Tendance globale
    doc.fontSize(14).text('Tendances Globales:', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Total: ${trendTotal.trend === 'increasing' ? '↗ Hausse' : trendTotal.trend === 'decreasing' ? '↘ Baisse' : '→ Stable'}`);
    doc.fontSize(10).text(`Eau: ${trendEau.trend === 'increasing' ? '↗ Hausse' : trendEau.trend === 'decreasing' ? '↘ Baisse' : '→ Stable'}`);
    doc.fontSize(10).text(`Électricité: ${trendElectricite.trend === 'increasing' ? '↗ Hausse' : trendElectricite.trend === 'decreasing' ? '↘ Baisse' : '→ Stable'}`);
    doc.moveDown();

    // Données mensuelles
    doc.fontSize(14).text('Données Mensuelles:', { underline: true });
    doc.moveDown(0.5);
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    sortedData.forEach((d) => {
      doc.fontSize(10).text(
        `${monthNames[d.mois - 1] || d.mois}: Total=${d.total}, Eau=${d.EAU}, Électricité=${d.ELECTRICITE}`
      );
    });

    doc.end();
    return null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('ReportsController.getTrendsPdf error:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la génération du PDF des tendances' });
  }
};

module.exports = {
  getMonthlyReport,
  getYearlyComparison,
  getMonthlyReportPdf,
  getTrends,
  getTrendsPdf,
  calculateTrend
};


