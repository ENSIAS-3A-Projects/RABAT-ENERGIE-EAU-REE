const { Op } = require('sequelize');
const { Releve, Compteur, Agent, Adresse, Quartier, Client } = require('../models');

/**
 * Service de traitement de requêtes en langage naturel
 * Traduit les questions en requêtes de base de données
 */
class AIQueryService {
  /**
   * Parse une requête en langage naturel et retourne les résultats
   */
  async processQuery(query) {
    const normalizedQuery = query.toLowerCase().trim();

    // Détection du type de requête
    if (this.isConsumptionQuery(normalizedQuery)) {
      return this.handleConsumptionQuery(normalizedQuery);
    }
    
    if (this.isAgentQuery(normalizedQuery)) {
      return this.handleAgentQuery(normalizedQuery);
    }
    
    if (this.isMeterQuery(normalizedQuery)) {
      return this.handleMeterQuery(normalizedQuery);
    }
    
    if (this.isReadingQuery(normalizedQuery)) {
      return this.handleReadingQuery(normalizedQuery);
    }
    
    if (this.isStatisticsQuery(normalizedQuery)) {
      return this.handleStatisticsQuery(normalizedQuery);
    }

    // Requête non reconnue
    return {
      success: false,
      message: 'Je n\'ai pas compris votre requête. Essayez des questions comme: "Consommation eau janvier", "Top agents", "Compteurs eau", etc.',
      suggestions: [
        'Consommation eau en janvier',
        'Top 5 agents ce mois',
        'Liste des compteurs d\'électricité',
        'Relevés du quartier X',
        'Statistiques de consommation'
      ]
    };
  }

  /**
   * Détecte si la requête concerne la consommation
   */
  isConsumptionQuery(query) {
    const keywords = ['consommation', 'consommer', 'eau', 'électricité', 'electricite', 'janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    return keywords.some(kw => query.includes(kw));
  }

  /**
   * Détecte si la requête concerne les agents
   */
  isAgentQuery(query) {
    const keywords = ['agent', 'agents', 'top', 'meilleur', 'performance'];
    return keywords.some(kw => query.includes(kw));
  }

  /**
   * Détecte si la requête concerne les compteurs
   */
  isMeterQuery(query) {
    const keywords = ['compteur', 'compteurs', 'mètre', 'metre'];
    return keywords.some(kw => query.includes(kw));
  }

  /**
   * Détecte si la requête concerne les relevés
   */
  isReadingQuery(query) {
    const keywords = ['relevé', 'relevés', 'releve', 'releves', 'lecture', 'lectures'];
    return keywords.some(kw => query.includes(kw));
  }

  /**
   * Détecte si la requête concerne les statistiques
   */
  isStatisticsQuery(query) {
    const keywords = ['statistique', 'statistiques', 'moyenne', 'total', 'somme', 'kpi'];
    return keywords.some(kw => query.includes(kw));
  }

  /**
   * Traite une requête de consommation
   */
  async handleConsumptionQuery(query) {
    try {
      // Extraire le type (eau/électricité)
      const isWater = query.includes('eau');
      const isElectricity = query.includes('électricité') || query.includes('electricite');
      const type = isWater ? 'EAU' : (isElectricity ? 'ELECTRICITE' : null);

      // Extraire le mois
      const monthMap = {
        'janvier': 1, 'février': 2, 'fevrier': 2, 'mars': 3, 'avril': 4,
        'mai': 5, 'juin': 6, 'juillet': 7, 'août': 8, 'aout': 8,
        'septembre': 9, 'octobre': 10, 'novembre': 11, 'décembre': 12, 'decembre': 12
      };
      
      let month = null;
      let year = new Date().getFullYear();
      
      for (const [monthName, monthNum] of Object.entries(monthMap)) {
        if (query.includes(monthName)) {
          month = monthNum;
          break;
        }
      }

      // Si pas de mois spécifié, utiliser le mois actuel
      if (!month) {
        month = new Date().getMonth() + 1;
      }

      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);

      const where = {
        date_releve: {
          [Op.gte]: start,
          [Op.lt]: end
        }
      };

      const include = [
        {
          model: Compteur,
          include: [
            {
              model: Adresse,
              include: [Quartier]
            }
          ],
          ...(type ? { where: { type } } : {})
        }
      ];

      const relevés = await Releve.findAll({
        where,
        include,
        limit: 1000
      });

      const totalConsommation = relevés.reduce((sum, r) => sum + (r.consommation || 0), 0);
      const nbReleves = relevés.length;

      return {
        success: true,
        query: query,
        type: 'consumption',
        data: {
          periode: { year, month },
          type: type || 'TOUS',
          totalConsommation,
          nbReleves,
          moyenneConsommation: nbReleves > 0 ? Math.round(totalConsommation / nbReleves) : 0
        },
        message: `Consommation ${type ? (type === 'EAU' ? 'd\'eau' : 'd\'électricité') : 'totale'} en ${monthMap ? Object.keys(monthMap).find(k => monthMap[k] === month) : month}/${year}: ${totalConsommation} unités (${nbReleves} relevés)`
      };
    } catch (error) {
      console.error('AIQueryService.handleConsumptionQuery error:', error);
      return {
        success: false,
        message: 'Erreur lors du traitement de la requête de consommation'
      };
    }
  }

  /**
   * Traite une requête sur les agents
   */
  async handleAgentQuery(query) {
    try {
      // Extraire le nombre (top N)
      const topMatch = query.match(/top\s*(\d+)/);
      const limit = topMatch ? parseInt(topMatch[1], 10) : 5;

      // Extraire le mois si spécifié
      const monthMap = {
        'janvier': 1, 'février': 2, 'fevrier': 2, 'mars': 3, 'avril': 4,
        'mai': 5, 'juin': 6, 'juillet': 7, 'août': 8, 'aout': 8,
        'septembre': 9, 'octobre': 10, 'novembre': 11, 'décembre': 12, 'decembre': 12
      };
      
      let month = new Date().getMonth() + 1;
      let year = new Date().getFullYear();
      
      for (const [monthName, monthNum] of Object.entries(monthMap)) {
        if (query.includes(monthName)) {
          month = monthNum;
          break;
        }
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
            model: Agent,
            required: true
          }
        ]
      });

      // Agréger par agent
      const agentStats = {};
      relevés.forEach((r) => {
        if (r.Agent) {
          const agentId = r.Agent.id_agent;
          if (!agentStats[agentId]) {
            agentStats[agentId] = {
              id_agent: agentId,
              nom: r.Agent.nom,
              prenom: r.Agent.prenom,
              nbReleves: 0,
              totalConsommation: 0
            };
          }
          agentStats[agentId].nbReleves += 1;
          agentStats[agentId].totalConsommation += (r.consommation || 0);
        }
      });

      const topAgents = Object.values(agentStats)
        .sort((a, b) => b.nbReleves - a.nbReleves)
        .slice(0, limit);

      return {
        success: true,
        query: query,
        type: 'agents',
        data: {
          periode: { year, month },
          topAgents
        },
        message: `Top ${limit} agents en ${month}/${year}: ${topAgents.map(a => `${a.prenom} ${a.nom} (${a.nbReleves} relevés)`).join(', ')}`
      };
    } catch (error) {
      console.error('AIQueryService.handleAgentQuery error:', error);
      return {
        success: false,
        message: 'Erreur lors du traitement de la requête sur les agents'
      };
    }
  }

  /**
   * Traite une requête sur les compteurs
   */
  async handleMeterQuery(query) {
    try {
      const isWater = query.includes('eau');
      const isElectricity = query.includes('électricité') || query.includes('electricite');
      const type = isWater ? 'EAU' : (isElectricity ? 'ELECTRICITE' : null);

      const where = type ? { type } : {};

      const compteurs = await Compteur.findAll({
        where,
        include: [
          {
            model: Adresse,
            include: [Quartier]
          },
          {
            model: Client
          }
        ],
        limit: 500
      });

      return {
        success: true,
        query: query,
        type: 'meters',
        data: {
          type: type || 'TOUS',
          nbCompteurs: compteurs.length,
          compteurs: compteurs.slice(0, 50).map(c => ({
            numero_serie: c.numero_serie,
            type: c.type,
            index_actuel: c.index_actuel,
            quartier: c.Adresse?.Quartier?.libelle
          }))
        },
        message: `Trouvé ${compteurs.length} compteur${compteurs.length > 1 ? 's' : ''} ${type ? (type === 'EAU' ? 'd\'eau' : 'd\'électricité') : ''}`
      };
    } catch (error) {
      console.error('AIQueryService.handleMeterQuery error:', error);
      return {
        success: false,
        message: 'Erreur lors du traitement de la requête sur les compteurs'
      };
    }
  }

  /**
   * Traite une requête sur les relevés
   */
  async handleReadingQuery(query) {
    try {
      // Extraire le quartier si mentionné
      const quartiers = await Quartier.findAll();
      let quartierFilter = null;
      
      for (const q of quartiers) {
        if (query.includes(q.libelle.toLowerCase())) {
          quartierFilter = q.libelle;
          break;
        }
      }

      const where = {};
      const include = [
        {
          model: Compteur,
          include: [
            {
              model: Adresse,
              include: [
                {
                  model: Quartier,
                  ...(quartierFilter ? { where: { libelle: quartierFilter } } : {})
                }
              ]
            }
          ]
        },
        {
          model: Agent
        }
      ];

      const relevés = await Releve.findAll({
        where,
        include,
        order: [['date_releve', 'DESC']],
        limit: 100
      });

      return {
        success: true,
        query: query,
        type: 'readings',
        data: {
          quartier: quartierFilter || 'TOUS',
          nbReleves: relevés.length,
          relevés: relevés.slice(0, 20).map(r => ({
            id_releve: r.id_releve,
            date_releve: r.date_releve,
            consommation: r.consommation,
            type: r.Compteur?.type,
            quartier: r.Compteur?.Adresse?.Quartier?.libelle,
            agent: r.Agent ? `${r.Agent.prenom} ${r.Agent.nom}` : null
          }))
        },
        message: `Trouvé ${relevés.length} relevé${relevés.length > 1 ? 's' : ''} ${quartierFilter ? `dans le quartier ${quartierFilter}` : ''}`
      };
    } catch (error) {
      console.error('AIQueryService.handleReadingQuery error:', error);
      return {
        success: false,
        message: 'Erreur lors du traitement de la requête sur les relevés'
      };
    }
  }

  /**
   * Traite une requête de statistiques
   */
  async handleStatisticsQuery(query) {
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

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
            required: true
          }
        ]
      });

      const totalConsommation = relevés.reduce((sum, r) => sum + (r.consommation || 0), 0);
      const nbReleves = relevés.length;
      const moyenne = nbReleves > 0 ? Math.round(totalConsommation / nbReleves) : 0;

      // Par type
      const parType = { EAU: 0, ELECTRICITE: 0 };
      relevés.forEach((r) => {
        const type = r.Compteur?.type;
        if (type === 'EAU' || type === 'ELECTRICITE') {
          parType[type] += (r.consommation || 0);
        }
      });

      return {
        success: true,
        query: query,
        type: 'statistics',
        data: {
          periode: { year: now.getFullYear(), month: now.getMonth() + 1 },
          totalConsommation,
          nbReleves,
          moyenneConsommation: moyenne,
          parType
        },
        message: `Statistiques du mois: ${totalConsommation} unités consommées (${nbReleves} relevés), moyenne: ${moyenne} unités/relevé`
      };
    } catch (error) {
      console.error('AIQueryService.handleStatisticsQuery error:', error);
      return {
        success: false,
        message: 'Erreur lors du traitement de la requête de statistiques'
      };
    }
  }
}

module.exports = new AIQueryService();

