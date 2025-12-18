const {
  Compteur,
  Adresse,
  Client,
  Quartier
} = require('../models');
const { sequelize } = require('../config/database');

async function countCompteursForAdresse(id_adresse) {
  const count = await Compteur.count({ where: { id_adresse } });
  return count;
}

const listCompteurs = async (req, res) => {
  try {
    const { type, quartier } = req.query;

    const where = {};
    if (type) {
      where.type = type;
    }

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
      order: [['numero_serie', 'ASC']]
    });

    const payload = compteurs.map((c) => ({
      numero_serie: c.numero_serie,
      type: c.type,
      index_actuel: c.index_actuel,
      adresse: c.Adresse
        ? {
            id_adresse: c.Adresse.id_adresse,
            libelle_complet: c.Adresse.libelle_complet,
            quartier: c.Adresse.Quartier
              ? {
                  id_quartier: c.Adresse.Quartier.id_quartier,
                  libelle: c.Adresse.Quartier.libelle,
                  ville: c.Adresse.Quartier.ville
                }
              : null
          }
        : null,
      client: c.Client
        ? {
            id_client: c.Client.id_client,
            nom_complet: c.Client.nom_complet,
            ref_client_erp: c.Client.ref_client_erp
          }
        : null
    }));

    const filtered = quartier
      ? payload.filter(
          (c) => c.adresse?.quartier?.libelle && c.adresse.quartier.libelle === quartier
        )
      : payload;

    return res.status(200).json(filtered);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('CompteurController.listCompteurs error:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la récupération des compteurs' });
  }
};

const createCompteur = async (req, res) => {
  try {
    const {
      numero_serie,
      type,
      id_adresse,
      id_client
    } = req.body;

    if (!type || !id_adresse || !id_client) {
      return res
        .status(400)
        .json({ message: 'type, id_adresse et id_client sont requis' });
    }

    const allowedTypes = ['EAU', 'ELECTRICITE'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ message: 'type doit être EAU ou ELECTRICITE' });
    }

    const countForAdresse = await countCompteursForAdresse(id_adresse);
    if (countForAdresse >= 4) {
      return res.status(400).json({
        message:
          "Cette adresse possède déjà le nombre maximum de compteurs autorisés (4)."
      });
    }

    let numeroSerieFinal = numero_serie;
    
    // Si aucun numéro de série fourni, générer un nouveau avec gestion de la concurrence
    if (!numeroSerieFinal) {
      const maxRetries = 5;
      let retries = 0;
      let created = false;
      let compteur = null;

      while (retries < maxRetries && !created) {
        const transaction = await sequelize.transaction();
        
        try {
          // Utiliser une transaction pour garantir l'atomicité
          const maxExisting = await Compteur.max('numero_serie', { transaction });
          const next = (Number(maxExisting || 0) || 0) + 1;
          numeroSerieFinal = String(next).padStart(9, '0');

          // Vérifier si le numéro existe déjà (protection contre les races)
          const existing = await Compteur.findByPk(numeroSerieFinal, { transaction });
          if (existing) {
            await transaction.rollback();
            retries += 1;
            // Attendre un peu avant de réessayer
            await new Promise((resolve) => setTimeout(resolve, 50 * retries));
            continue;
          }

          // Créer le compteur dans la transaction
          compteur = await Compteur.create({
            numero_serie: numeroSerieFinal,
            type,
            id_adresse,
            id_client,
            index_actuel: 0
          }, { transaction });

          await transaction.commit();
          created = true;
        } catch (error) {
          await transaction.rollback();
          
          // Si c'est une erreur de contrainte unique, réessayer
          if (error.name === 'SequelizeUniqueConstraintError' || error.code === 'ER_DUP_ENTRY') {
            retries += 1;
            await new Promise((resolve) => setTimeout(resolve, 50 * retries));
            continue;
          }
          
          // Autre erreur, la propager
          throw error;
        }
      }

      if (!created) {
        return res.status(500).json({ 
          message: 'Impossible de générer un numéro de série unique après plusieurs tentatives' 
        });
      }

      return res.status(201).json(compteur);
    }

    // Si un numéro de série est fourni, vérifier qu'il n'existe pas déjà
    const existing = await Compteur.findByPk(numeroSerieFinal);
    if (existing) {
      return res.status(400).json({ message: 'Un compteur avec ce numéro de série existe déjà' });
    }

    const compteur = await Compteur.create({
      numero_serie: numeroSerieFinal,
      type,
      id_adresse,
      id_client,
      index_actuel: 0
    });

    return res.status(201).json(compteur);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('CompteurController.createCompteur error:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la création du compteur' });
  }
};

const updateCompteur = async (req, res) => {
  try {
    const { numero_serie } = req.params;
    const {
      type,
      id_adresse,
      id_client
    } = req.body;

    const compteur = await Compteur.findByPk(numero_serie);
    if (!compteur) {
      return res.status(404).json({ message: 'Compteur introuvable' });
    }

    if (type) {
      const allowedTypes = ['EAU', 'ELECTRICITE'];
      if (!allowedTypes.includes(type)) {
        return res.status(400).json({ message: 'type doit être EAU ou ELECTRICITE' });
      }
      compteur.type = type;
    }
    if (id_adresse) {
      compteur.id_adresse = id_adresse;
    }
    if (id_client) {
      compteur.id_client = id_client;
    }

    await compteur.save();
    return res.status(200).json(compteur);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('CompteurController.updateCompteur error:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du compteur' });
  }
};

const deleteCompteur = async (req, res) => {
  try {
    const { numero_serie } = req.params;
    const compteur = await Compteur.findByPk(numero_serie);
    if (!compteur) {
      return res.status(404).json({ message: 'Compteur introuvable' });
    }

    await compteur.destroy();
    return res.status(204).send();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('CompteurController.deleteCompteur error:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la suppression du compteur' });
  }
};

module.exports = {
  listCompteurs,
  createCompteur,
  updateCompteur,
  deleteCompteur
};


