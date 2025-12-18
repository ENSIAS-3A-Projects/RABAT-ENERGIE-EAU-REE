const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, LogConnexion } = require('../models');
const { sendPasswordEmail } = require('../services/emailService');

// Conformément au cahier des charges : durée de session 10 minutes
const TOKEN_EXPIRATION = '10m';

function generateRandomPassword(length = 12) {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const symbols = '!@#$%^&*';
  const allChars = upper + lower + digits + symbols;

  if (length < 4) {
    // Longueur minimale pour garantir au moins un caractère de chaque catégorie
    // On force à 4 si une valeur plus petite est demandée.
    // eslint-disable-next-line no-param-reassign
    length = 4;
  }

  const picks = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)]
  ];

  for (let i = picks.length; i < length; i += 1) {
    picks.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }

  // Mélanger le tableau pour éviter que les 4 premiers caractères soient toujours dans le même ordre
  for (let i = picks.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = picks[i];
    picks[i] = picks[j];
    picks[j] = tmp;
  }

  return picks.join('');
}

// Fonction pour obtenir l'adresse IP depuis la requête
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         'unknown';
}

// Fonction pour logger les tentatives de connexion
async function logConnexion(email, id_user, success, ip_address) {
  try {
    await LogConnexion.create({
      email,
      id_user: id_user || null,
      success,
      ip_address,
      date_connexion: new Date()
    });
  } catch (error) {
    // Ne pas faire échouer la requête si le logging échoue
    console.error('Erreur lors du logging de connexion:', error);
  }
}

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const ip_address = getClientIp(req);

    if (!email || !password) {
      await logConnexion(email, null, false, ip_address);
      return res.status(400).json({ message: 'Email et mot de passe sont requis' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      await logConnexion(email, null, false, ip_address);
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await logConnexion(email, user.id_user, false, ip_address);
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    // Log de connexion réussie
    await logConnexion(email, user.id_user, true, ip_address);

    const payload = {
      id_user: user.id_user,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret', {
      expiresIn: TOKEN_EXPIRATION
    });

    const decoded = jwt.decode(token);

    return res.status(200).json({
      user: {
        id_user: user.id_user,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        must_change_password: user.must_change_password
      },
      token,
      // Permet au frontend de gérer l'auto-logout sans recoder la logique JWT
      expiresAt: decoded?.exp ? decoded.exp * 1000 : null
    });
  } catch (error) {
    console.error('AuthController.login error:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la connexion' });
  }
};

const register = async (req, res) => {
  try {
    const { nom, prenom, email, role = 'USER' } = req.body;

    if (!nom || !prenom || !email) {
      return res.status(400).json({ message: 'nom, prenom et email sont requis' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: 'Un utilisateur avec cet email existe déjà' });
    }

    const plainPassword = generateRandomPassword(12);
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Format prénom : Première lettre en majuscule selon le cahier des charges
    const formattedPrenom = prenom.charAt(0).toUpperCase() + prenom.slice(1).toLowerCase();
    
    const user = await User.create({
      nom: nom.toUpperCase(),
      prenom: formattedPrenom,
      email,
      password: hashedPassword,
      role,
      must_change_password: true
    });

    try {
      await sendPasswordEmail(email, plainPassword);
    } catch (mailError) {
      // Ne pas faire échouer la requête si MailHog / SMTP tombe
      console.error('Erreur lors de l’envoi de l’email de mot de passe:', mailError);
    }

    return res.status(201).json({
      message: 'Utilisateur créé et mot de passe envoyé par email (simulation)',
      user: {
        id_user: user.id_user,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        must_change_password: user.must_change_password
      }
    });
  } catch (error) {
    console.error('AuthController.register error:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la création utilisateur' });
  }
};

const listAdmins = async (req, res) => {
  try {
    const admins = await User.findAll({
      where: { role: 'SUPERADMIN' },
      order: [['date_creation', 'DESC']]
    });

    return res.status(200).json(
      admins.map((u) => ({
        id_user: u.id_user,
        nom: u.nom,
        prenom: u.prenom,
        email: u.email,
        role: u.role,
        must_change_password: u.must_change_password,
        date_creation: u.date_creation,
        date_modification: u.date_modification
      }))
    );
  } catch (error) {
    console.error('AuthController.listAdmins error:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la récupération des administrateurs' });
  }
};

// Récupérer un utilisateur par ID (SUPERADMIN uniquement)
const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    return res.status(200).json({
      id_user: user.id_user,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      role: user.role,
      must_change_password: user.must_change_password,
      date_creation: user.date_creation,
      date_modification: user.date_modification
    });
  } catch (error) {
    console.error('AuthController.getUser error:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'utilisateur' });
  }
};

// Liste paginée/filtrée de tous les utilisateurs (SUPERADMIN uniquement)
const listUsers = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      role,
      email
    } = req.query;

    const limit = Number(pageSize);
    const offset = (Number(page) - 1) * limit;

    const where = {};
    if (role) {
      where.role = role;
    }
    if (email) {
      where.email = email;
    }

    // Tri par nom (ascendant par défaut) selon le cahier des charges
    const orderBy = req.query.sortBy || 'nom';
    const orderDirection = req.query.sortOrder === 'DESC' ? 'DESC' : 'ASC';
    
    const { rows, count } = await User.findAndCountAll({
      where,
      order: [[orderBy, orderDirection]],
      offset,
      limit
    });

    return res.status(200).json({
      items: rows.map((u) => ({
        id_user: u.id_user,
        nom: u.nom,
        prenom: u.prenom,
        email: u.email,
        role: u.role,
        must_change_password: u.must_change_password,
        date_creation: u.date_creation,
        date_modification: u.date_modification
      })),
      total: count,
      page: Number(page),
      pageSize: limit
    });
  } catch (error) {
    console.error('AuthController.listUsers error:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la récupération des utilisateurs' });
  }
};

// Mise à jour basique des informations utilisateur (nom, prénom, rôle)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, prenom, role } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    if (nom) user.nom = nom.toUpperCase();
    // Format prénom : Première lettre en majuscule selon le cahier des charges
    if (prenom) {
      user.prenom = prenom.charAt(0).toUpperCase() + prenom.slice(1).toLowerCase();
    }
    if (role) user.role = role;
    user.date_modification = new Date();

    await user.save();

    return res.status(200).json({
      id_user: user.id_user,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      role: user.role,
      must_change_password: user.must_change_password,
      date_creation: user.date_creation,
      date_modification: user.date_modification
    });
  } catch (error) {
    console.error('AuthController.updateUser error:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la mise à jour utilisateur' });
  }
};

// Réinitialisation du mot de passe par un SUPERADMIN
const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    const plainPassword = generateRandomPassword(12);
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    user.password = hashedPassword;
    user.must_change_password = true;
    user.date_modification = new Date();
    await user.save();

    try {
      await sendPasswordEmail(user.email, plainPassword);
    } catch (mailError) {
      console.error('Erreur lors de l’envoi de l’email de réinitialisation de mot de passe:', mailError);
    }

    return res.status(200).json({
      message: 'Mot de passe réinitialisé et envoyé par email (simulation)',
      user: {
        id_user: user.id_user,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        must_change_password: user.must_change_password,
        date_modification: user.date_modification
      }
    });
  } catch (error) {
    console.error('AuthController.resetPassword error:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la réinitialisation du mot de passe' });
  }
};

// Fonction pour valider la complexité du mot de passe
function validatePasswordComplexity(password) {
  if (password.length < 8) {
    return { valid: false, message: 'Le mot de passe doit contenir au moins 8 caractères.' };
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*]/.test(password);

  if (!hasUpper) {
    return { valid: false, message: 'Le mot de passe doit contenir au moins une lettre majuscule.' };
  }
  if (!hasLower) {
    return { valid: false, message: 'Le mot de passe doit contenir au moins une lettre minuscule.' };
  }
  if (!hasDigit) {
    return { valid: false, message: 'Le mot de passe doit contenir au moins un chiffre.' };
  }
  if (!hasSymbol) {
    return { valid: false, message: 'Le mot de passe doit contenir au moins un symbole (!@#$%^&*).' };
  }

  return { valid: true };
}

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: 'Le nouveau mot de passe est requis' });
    }

    // Validation de la complexité du mot de passe
    const complexityCheck = validatePasswordComplexity(newPassword);
    if (!complexityCheck.valid) {
      return res.status(400).json({ message: complexityCheck.message });
    }

    const userId = req.user?.id_user;
    if (!userId) {
      return res.status(401).json({ message: "Utilisateur non authentifié" });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    // Exiger le mot de passe actuel même pour la première connexion (sécurité renforcée)
    // Cela prouve que l'utilisateur possède les credentials envoyés par email
    if (!currentPassword) {
      return res
        .status(400)
        .json({ message: 'Le mot de passe actuel est requis pour le changement (y compris lors de la première connexion).' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Mot de passe actuel incorrect.' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    user.must_change_password = false;
    user.date_modification = new Date();
    await user.save();

    return res
      .status(200)
      .json({ message: 'Mot de passe mis à jour avec succès.' });
  } catch (error) {
    console.error('AuthController.changePassword error:', error);
    return res.status(500).json({ message: 'Erreur serveur lors du changement de mot de passe' });
  }
};

module.exports = {
  login,
  register,
  listAdmins,
  changePassword,
  listUsers,
  getUser,
  updateUser,
  resetPassword
};



