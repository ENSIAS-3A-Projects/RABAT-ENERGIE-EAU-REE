const aiQueryService = require('../services/aiQueryService');

/**
 * Traite une requête en langage naturel et retourne les résultats
 */
const processNaturalLanguageQuery = async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'La requête est requise et doit être une chaîne de caractères non vide'
      });
    }

    const result = await aiQueryService.processQuery(query);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(200).json(result); // On retourne 200 même si la requête n'est pas comprise
    }
  } catch (error) {
    console.error('AIController.processNaturalLanguageQuery error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du traitement de la requête en langage naturel'
    });
  }
};

module.exports = {
  processNaturalLanguageQuery
};


