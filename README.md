# 🌊 SI Relevés - Gestion Intelligente (AI-Driven Project)

> **Projet Académique - Système d'Information & Intelligence Artificielle**
> *RABAT ENERGIE & EAU (REE)*

![AI Powered](https://img.shields.io/badge/AI-Powered-blueviolet) ![Status](https://img.shields.io/badge/Status-Validated-success) ![Stack](https://img.shields.io/badge/Stack-MERN-blue) ![Security](https://img.shields.io/badge/Security-JWT%20%2B%20Logs-red)

## 📄 Contexte du Projet

Ce projet s'inscrit dans la transformation digitale de la société **Rabat Energie & Eau (REE)**. L'objectif est de développer la brique **"SI Relevés"** (Backoffice Web), une application centralisée permettant la gestion des compteurs d'eau et d'électricité, l'affectation des agents de terrain, et l'analyse intelligente de la consommation.

### 🤖 La Particularité : "Intelligent SI"
Ce projet dépasse le développement classique. **L'ensemble du cycle de vie (Analyse, Conception, Code, Tests) a été assisté par l'IA**, et l'application intègre des fonctionnalités d'IA natives pour assister les décideurs.

---

## 🚀 Fonctionnalités Implémentées

Le système est désormais complet et validé sur les volets suivants :

### 1. 🔐 Sécurité & Administration (Super-Admin)
* **Authentification Forte :** Login via JWT (expiration 10 min) avec hachage Bcrypt.
* **Gestion des Accès :** Création d'Administrateurs et Super-admins avec sélection de rôle.
* **Politique de Mot de Passe :**
    * Génération automatique et envoi par email (simulation MailHog).
    * Validation de la complexité (Majuscule, Minuscule, Chiffre, Symbole).
    * **Changement obligatoire** à la première connexion (avec validation du mot de passe actuel).
* **Auditabilité :** Journalisation complète des tentatives de connexion (Succès/Échec, IP, Horodatage) via la table `t_log_connexion`.

### 2. 📊 Gestion Métier (Backoffice)
* **Gestion des Compteurs :** 
    * CRUD complet, association unique aux adresses, génération d'ID (9 chiffres).
    * Gestion des conditions de concurrence avec transactions atomiques.
    * Détection et gestion du rollover des compteurs (ex: 99999 → 00001).
* **Gestion des Agents :** Affectation géographique (Quartiers) et suivi de performance.
* **Traitement des Relevés :**
    * Calcul automatique des consommations (Nouveau - Ancien).
    * Détection des incohérences et gestion du rollover des compteurs.
    * Intégration avec l'ERP Facturation (simulation).
* **Reporting PDF :** 
    * Génération et export de rapports mensuels détaillés.
    * Export PDF des tendances de consommation avec analyse prédictive.

### 3. 🧠 Module "Intelligence Artificielle" (Intelligent SI)
L'application intègre un contrôleur dédié (`AIController`) offrant des services avancés :
* **🗣️ Interrogation en Langage Naturel (NLP) :**
    * Les utilisateurs peuvent poser des questions directes : *"Quelle est la consommation d'eau en janvier ?"*, *"Donne-moi le top 5 des agents"*.
    * Le système traduit l'intention en requêtes SQL Sequelize complexes dynamiquement.
    * Endpoint : `POST /api/ai/query`
* **📈 Analyse Prédictive des Tendances :**
    * Calcul de régression linéaire sur l'historique de consommation.
    * Détection automatique des tendances (Hausse ↗, Baisse ↘, Stable →) pour l'Eau et l'Électricité.
    * Export PDF des tendances disponible.

### 4. 🌐 Navigation & Interface
* **React Router DOM :** Navigation basée sur les chemins URL avec routes protégées.
* **Sidebar Fixe :** Barre latérale fixe et sticky pour une meilleure expérience utilisateur.
* **Routes Protégées :** Système d'authentification avec redirection automatique.

---

## 🛠 Architecture Technique & Stack

L'architecture repose sur une approche Micro-services conteneurisée :

* **Frontend :** 
    * React.js + Vite + TailwindCSS (Interface réactive et moderne).
    * React Router DOM pour la navigation.
    * Context API pour la gestion d'état global.
* **Backend :** 
    * Node.js + Express (API RESTful).
    * JWT pour l'authentification.
    * Services d'IA pour le traitement du langage naturel.
* **ORM :** Sequelize (Gestion des modèles et relations).
* **Base de Données :** MySQL 8.0.
* **Simulateurs Intégrés :** Modules internes simulant les échanges avec l'ERP (Clients/RH) et l'App Mobile pour garantir l'autonomie de la solution.
* **Outils DevOps :**
    * **Docker Compose :** Orchestration complète.
    * **MailHog :** Serveur SMTP de test pour intercepter les emails.
    * **PhpMyAdmin :** Administration BDD.

---

## 📂 Structure du Projet

```bash
.
├── backend/                 # API Node.js, Modèles Sequelize, AI Services
│   ├── src/
│   │   ├── controllers/     # Logique métier (Auth, Relevés, AI, Reports)
│   │   ├── models/          # Définitions BDD (User, Agent, LogConnexion...)
│   │   ├── services/        # Services (Email, Facturation, AI Query)
│   │   ├── routes/          # Définition des routes API
│   │   ├── middlewares/     # Middlewares (Auth JWT)
│   │   └── config/          # Configuration (Database)
│   ├── scripts/             # Simulateurs de données (ERP/Traffic)
│   └── ...
├── frontend/                # Application React
│   ├── src/
│   │   ├── pages/           # Vues (Dashboard, Login, Admin)
│   │   ├── components/      # Composants réutilisables (ProtectedRoute)
│   │   ├── context/          # Gestion d'état (AuthContext)
│   │   ├── services/         # Services API
│   │   └── ...
│   └── ...
├── docs/                    # Documentation (Diagrammes validés, SQL)
└── docker-compose.yml       # Configuration de déploiement
```

---

## ⚙️ Installation et Démarrage

### Prérequis

* Docker & Docker Compose installés.

### Déploiement Rapide

1. **Cloner le dépôt**
```bash
git clone https://github.com/ENSIAS-3A-Projects/RABAT-ENERGIE-EAU-REE.git
cd RABAT-ENERGIE-EAU-REE
```

2. **Lancer l'environnement**
```bash
docker-compose up -d --build
```

*(Cette commande construit les images, lance la BDD, le Backend, le Frontend et les outils)*.

3. **Initialisation des Données (Seeding)**
Le backend exécute automatiquement le script `seed.js` au démarrage pour créer :
* 1 Superadmin
* 20 Agents, 5 Quartiers
* 100 Clients & Compteurs
* Historique de relevés pour l'IA.

4. **Accès aux Services**
* **Application Web :** `http://localhost:5173` (ou port 80 selon config)
* **API Backend :** `http://localhost:3000`
* **MailHog (Emails) :** `http://localhost:8025`
* **PhpMyAdmin :** `http://localhost:8080`

### 🔑 Identifiants par défaut

* **Email :** `admin@ree.ma`
* **Mot de passe :** `password123`
* *(Note : Il vous sera demandé de changer ce mot de passe dès la première connexion).*

---

## 📡 API Endpoints Principaux

### Authentification
* `POST /api/auth/login` - Connexion
* `POST /api/auth/register` - Création d'utilisateur (SuperAdmin)
* `POST /api/auth/change-password` - Changement de mot de passe
* `GET /api/auth/users` - Liste des utilisateurs (SuperAdmin)
* `PATCH /api/auth/users/:id` - Modification d'utilisateur
* `POST /api/auth/users/:id/reset-password` - Réinitialisation mot de passe

### Gestion Métier
* `GET /api/compteurs` - Liste des compteurs
* `POST /api/compteurs` - Création d'un compteur
* `GET /api/releves` - Liste des relevés
* `POST /api/releves` - Création d'un relevé
* `GET /api/agents` - Liste des agents
* `GET /api/adresses` - Liste des adresses

### Rapports & IA
* `GET /api/reports/monthly` - Rapport mensuel (JSON)
* `GET /api/reports/monthly.pdf` - Rapport mensuel (PDF)
* `GET /api/reports/trends` - Tendances de consommation (JSON)
* `GET /api/reports/trends.pdf` - Tendances de consommation (PDF)
* `POST /api/ai/query` - Requête en langage naturel

---

## 🧪 Tests & Validation

Le projet inclut :
* Tests unitaires pour les contrôleurs principaux
* Validation des fonctionnalités selon les exigences fonctionnelles
* Tests d'intégration pour les flux critiques

---

## 👥 Équipe Projet

* Bouazza Chaymae
* Benabbou Imane
* Alaoui Sosse Saad
* Taqi Mohamed

---

*Projet validé - Décembre 2025.*
