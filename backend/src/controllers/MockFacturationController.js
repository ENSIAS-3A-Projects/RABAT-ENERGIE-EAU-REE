// Mock endpoint pour simuler l'envoi de consommations vers le SI Facturation
const sendConsommation = async (req, res) => {
  try {
    const { numero_serie, consommation, date_releve, id_client } = req.body;

    if (!numero_serie || consommation === undefined) {
      return res.status(400).json({ message: 'numero_serie et consommation sont requis' });
    }

    // Simulation : on loggue la demande et on retourne un succès
    // eslint-disable-next-line no-console
    console.log('📧 [MOCK FACTURATION] Réception demande de facturation:', {
      numero_serie,
      consommation,
      date_releve: date_releve || new Date().toISOString(),
      id_client,
      timestamp: new Date().toISOString()
    });

    // Dans un vrai système, on pourrait stocker ces données dans une table dédiée
    // ou les envoyer vers un vrai endpoint ERP

    return res.status(200).json({
      success: true,
      message: 'Consommation transmise au SI Facturation (simulation)',
      data: {
        numero_serie,
        consommation,
        date_releve: date_releve || new Date().toISOString(),
        id_client
      }
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('MockFacturationController.sendConsommation error:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la transmission à la facturation' });
  }
};

module.exports = {
  sendConsommation
};



