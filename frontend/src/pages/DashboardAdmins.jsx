import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Badge = ({ children }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-200">
    {children}
  </span>
);

function DashboardAdmins() {
  const { user } = useAuth();

  const [admins, setAdmins] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [usersError, setUsersError] = useState('');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminForm, setAdminForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    role: 'USER'
  });
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [adminSuccess, setAdminSuccess] = useState('');
  const [usersSuccess, setUsersSuccess] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [editingForm, setEditingForm] = useState({ nom: '', prenom: '', role: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState('nom');
  const [sortOrder, setSortOrder] = useState('ASC');
  const [filterRole, setFilterRole] = useState('');

  const loadAdmins = async () => {
    setLoadingAdmins(true);
    setAdminError('');
    try {
      const { data } = await api.get('/auth/admins');
      setAdmins(data);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setAdminError("Impossible de charger les administrateurs.");
    } finally {
      setLoadingAdmins(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    setUsersError('');
    try {
      const params = {
        sortBy,
        sortOrder,
        page,
        pageSize
      };
      if (filterRole) {
        params.role = filterRole;
      }
      const { data } = await api.get('/auth/users', { params });
      setAllUsers(data.items || []);
      setTotalUsers(data.total || 0);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setUsersError("Impossible de charger les utilisateurs.");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [sortBy, sortOrder, filterRole, page, pageSize]);


  // Le tri et la pagination sont maintenant gérés côté serveur
  const currentPageItems = allUsers;
  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize));

  const handleChangePageSize = (value) => {
    const size = Number(value);
    setPageSize(size);
    setPage(1);
  };

  const handleAdminInputChange = (e) => {
    const { name, value } = e.target;
    setAdminForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setAdminError('');
    setAdminSuccess('');
    setAdminSubmitting(true);
    try {
      await api.post('/auth/register', {
        nom: adminForm.nom,
        prenom: adminForm.prenom,
        email: adminForm.email,
        role: adminForm.role
      });
      setAdminSuccess("Admin créé et email envoyé (simulation MailHog).");
      setAdminForm({ nom: '', prenom: '', email: '', role: 'USER' });
      setShowAdminModal(false);
      await Promise.all([loadAdmins(), loadUsers()]);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setAdminError("Impossible de créer l'administrateur.");
    } finally {
      setAdminSubmitting(false);
    }
  };

  const openEditUser = (u) => {
    setEditingUser(u);
    setEditingForm({
      nom: u.nom,
      prenom: u.prenom,
      role: u.role
    });
    setUsersSuccess('');
    setUsersError('');
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditingForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    setUsersError('');
    setUsersSuccess('');
    try {
      await api.patch(`/auth/users/${editingUser.id_user}`, {
        nom: editingForm.nom,
        prenom: editingForm.prenom,
        role: editingForm.role
      });
      setUsersSuccess('Utilisateur mis à jour.');
      setEditingUser(null);
      await loadUsers();
      await loadAdmins();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setUsersError("Impossible de mettre à jour l'utilisateur.");
    }
  };

  const handleResetPassword = async (u) => {
    setUsersError('');
    setUsersSuccess('');
    try {
      await api.post(`/auth/users/${u.id_user}/reset-password`);
      setUsersSuccess(`Mot de passe réinitialisé pour ${u.email} (email envoyé via MailHog).`);
      await loadUsers();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setUsersError("Impossible de réinitialiser le mot de passe.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Gestion des utilisateurs</h2>
          <p className="text-xs text-slate-500 mt-1">
            Vue réservée au SUPERADMIN pour gérer les accès backoffice (admins et utilisateurs).
          </p>
        </div>
        {user?.role === 'SUPERADMIN' && (
          <button
            type="button"
            onClick={() => {
              setAdminSuccess('');
              setAdminError('');
              setShowAdminModal(true);
            }}
            className="px-3 py-2 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-sm"
          >
            + Ajouter un admin
          </button>
        )}
      </div>

      {adminError && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-sm">
          {adminError}
        </div>
      )}
      {adminSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg text-sm">
          {adminSuccess}
        </div>
      )}
      {usersError && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-sm">
          {usersError}
        </div>
      )}
      {usersSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg text-sm">
          {usersSuccess}
        </div>
      )}

      {loadingAdmins ? (
        <p className="text-sm text-slate-400">Chargement des administrateurs...</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/70 border-b border-slate-800">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-400">Nom complet</th>
                <th className="px-4 py-2 text-left font-medium text-slate-400">Email</th>
                <th className="px-4 py-2 text-left font-medium text-slate-400">Rôle</th>
                <th className="px-4 py-2 text-left font-medium text-slate-400">Créé le</th>
                <th className="px-4 py-2 text-left font-medium text-slate-400">Modifié le</th>
              </tr>
            </thead>
            <tbody>
              {admins.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-xs text-slate-500"
                  >
                    Aucun administrateur pour le moment.
                  </td>
                </tr>
              )}
              {admins.map((a) => (
                <tr key={a.id_user} className="border-t border-slate-800/60 hover:bg-slate-900/40">
                  <td className="px-4 py-2 text-slate-100">
                    {a.nom} {a.prenom}
                  </td>
                  <td className="px-4 py-2 text-slate-300">{a.email}</td>
                  <td className="px-4 py-2 text-slate-300 text-xs">
                    <Badge>{a.role}</Badge>
                  </td>
                  <td className="px-4 py-2 text-slate-400 text-xs">
                    {a.date_creation
                      ? new Date(a.date_creation).toLocaleDateString('fr-FR')
                      : '-'}
                  </td>
                  <td className="px-4 py-2 text-slate-400 text-xs">
                    {a.date_modification
                      ? new Date(a.date_modification).toLocaleDateString('fr-FR')
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100">Tous les utilisateurs</h3>
          <button
            type="button"
            onClick={loadUsers}
            className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100"
          >
            Rafraîchir
          </button>
        </div>
        {loadingUsers ? (
          <p className="text-sm text-slate-400">Chargement des utilisateurs...</p>
        ) : (
          <>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
              <div className="flex items-center gap-2">
                <span>Filtrer par rôle</span>
                <select
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100"
                  value={filterRole}
                  onChange={(e) => {
                    setFilterRole(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Tous</option>
                  <option value="USER">USER</option>
                  <option value="SUPERADMIN">SUPERADMIN</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span>Trier par</span>
                <select
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100"
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="nom">Nom</option>
                  <option value="role">Rôle</option>
                  <option value="date_creation">Date création</option>
                </select>
                <select
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100"
                  value={sortOrder}
                  onChange={(e) => {
                    setSortOrder(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="ASC">Croissant</option>
                  <option value="DESC">Décroissant</option>
                </select>
                <span className="ml-2">Par page</span>
                <select
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100"
                  value={pageSize}
                  onChange={(e) => handleChangePageSize(e.target.value)}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-900/70 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-slate-400">Nom complet</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-400">Email</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-400">Rôle</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-400">Statut</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-400">Modifié le</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPageItems.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-6 text-center text-xs text-slate-500"
                      >
                        Aucun utilisateur.
                      </td>
                    </tr>
                  )}
                  {currentPageItems.map((u) => (
                    <tr key={u.id_user} className="border-t border-slate-800/60 hover:bg-slate-900/40">
                      <td className="px-4 py-2 text-slate-100">
                        {u.nom} {u.prenom}
                      </td>
                      <td className="px-4 py-2 text-slate-300">{u.email}</td>
                      <td className="px-4 py-2 text-slate-300 text-xs">
                        <Badge>{u.role}</Badge>
                      </td>
                      <td className="px-4 py-2 text-slate-300 text-xs">
                        {u.must_change_password ? (
                          <Badge>Doit changer le mot de passe</Badge>
                        ) : (
                          <Badge>Actif</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2 text-slate-400 text-xs">
                        {u.date_modification
                          ? new Date(u.date_modification).toLocaleDateString('fr-FR')
                          : '-'}
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-300 space-x-2">
                        <button
                          type="button"
                          onClick={() => openEditUser(u)}
                          className="px-2 py-1 rounded border border-slate-700 hover:bg-slate-800"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResetPassword(u)}
                          className="px-2 py-1 rounded border border-emerald-600 text-emerald-400 hover:bg-emerald-600/10"
                        >
                          Réinitialiser MDP
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalUsers > 0 && (
              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                <span>
                  Page {page} sur {totalPages} ({totalUsers} utilisateur{totalUsers > 1 ? 's' : ''} au total)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-2 py-1 rounded border border-slate-700 disabled:opacity-40 hover:bg-slate-800"
                  >
                    Précédent
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2 py-1 rounded border border-slate-700 disabled:opacity-40 hover:bg-slate-800"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showAdminModal && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-100 mb-2">Ajouter un administrateur</h3>
            <p className="text-xs text-slate-500 mb-4">
              Un mot de passe aléatoire sera généré et envoyé par email (via MailHog).
            </p>
            <form onSubmit={handleCreateAdmin} className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1" htmlFor="nom">
                    Nom
                  </label>
                  <input
                    id="nom"
                    name="nom"
                    required
                    value={adminForm.nom}
                    onChange={handleAdminInputChange}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1" htmlFor="prenom">
                    Prénom
                  </label>
                  <input
                    id="prenom"
                    name="prenom"
                    required
                    value={adminForm.prenom}
                    onChange={handleAdminInputChange}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={adminForm.email}
                  onChange={handleAdminInputChange}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1" htmlFor="role">
                  Rôle
                </label>
                <select
                  id="role"
                  name="role"
                  value={adminForm.role}
                  onChange={handleAdminInputChange}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="USER">USER (Admin Backoffice)</option>
                  <option value="SUPERADMIN">SUPERADMIN</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className="px-3 py-2 text-xs rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={adminSubmitting}
                  className="px-3 py-2 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-60"
                >
                  {adminSubmitting ? 'Création...' : 'Créer et envoyer l’email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-100 mb-2">
              Modifier l&apos;utilisateur
            </h3>
            <form onSubmit={handleSaveUser} className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1" htmlFor="edit-nom">
                    Nom
                  </label>
                  <input
                    id="edit-nom"
                    name="nom"
                    required
                    value={editingForm.nom}
                    onChange={handleEditInputChange}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1" htmlFor="edit-prenom">
                    Prénom
                  </label>
                  <input
                    id="edit-prenom"
                    name="prenom"
                    required
                    value={editingForm.prenom}
                    onChange={handleEditInputChange}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1" htmlFor="edit-role">
                  Rôle
                </label>
                <select
                  id="edit-role"
                  name="role"
                  value={editingForm.role}
                  onChange={handleEditInputChange}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="USER">USER</option>
                  <option value="SUPERADMIN">SUPERADMIN</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-2 text-xs rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-3 py-2 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardAdmins;


