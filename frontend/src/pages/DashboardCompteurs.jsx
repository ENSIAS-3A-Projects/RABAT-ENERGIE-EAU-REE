import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

function DashboardCompteurs() {
  const [compteurs, setCompteurs] = useState([]);
  const [adresses, setAdresses] = useState([]);
  const [adressesSansCompteur, setAdressesSansCompteur] = useState([]);
  const [quartiers, setQuartiers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    numero_serie: '',
    type: 'EAU',
    id_adresse: '',
    id_client: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filterQuartier, setFilterQuartier] = useState('');
  const [searchAdresse, setSearchAdresse] = useState('');

  const loadCompteurs = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/compteurs');
      setCompteurs(data);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setError("Impossible de charger les compteurs.");
    } finally {
      setLoading(false);
    }
  };

  const loadAdresses = async () => {
    try {
      const { data } = await api.get('/adresses');
      setAdresses(data);
      // Charger uniquement les adresses sans compteur pour la popup
      const { data: adressesSansCompteurData } = await api.get('/adresses', { params: { hasCompteur: 'false' } });
      setAdressesSansCompteur(adressesSansCompteurData || []);
      
      // Extraire les quartiers uniques
      const uniqueQuartiers = [];
      const seenQuartiers = new Set();
      adressesSansCompteurData?.forEach((a) => {
        if (a.quartier && !seenQuartiers.has(a.quartier.id_quartier)) {
          seenQuartiers.add(a.quartier.id_quartier);
          uniqueQuartiers.push(a.quartier);
        }
      });
      setQuartiers(uniqueQuartiers);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  };

  const loadClients = async () => {
    try {
      const { data } = await api.get('/clients');
      setClients(data || []);
      // eslint-disable-next-line no-console
      console.log('Clients chargés:', data?.length || 0);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Erreur lors du chargement des clients:', err);
      setClients([]);
    }
  };

  useEffect(() => {
    loadCompteurs();
    loadAdresses();
    loadClients();
  }, []);

  const totalPages = Math.max(1, Math.ceil(compteurs.length / pageSize));

  const currentPageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return compteurs.slice(start, start + pageSize);
  }, [compteurs, page, pageSize]);

  const handleChangePageSize = (value) => {
    const size = Number(value);
    setPageSize(size);
    setPage(1);
  };

  const handleCreateInputChange = (e) => {
    const { name, value } = e.target;
    setCreateForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateCompteur = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await api.post('/compteurs', createForm);
      setSuccess('Compteur créé avec succès.');
      setCreateForm({ numero_serie: '', type: 'EAU', id_adresse: '', id_client: '' });
      setShowCreateModal(false);
      setFilterQuartier('');
      setSearchAdresse('');
      await loadCompteurs();
      await loadAdresses();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setError(err.response?.data?.message || "Impossible de créer le compteur.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Gestion des compteurs</h2>
          <p className="text-xs text-slate-500 mt-1">
            Liste des compteurs avec adresse et client associés.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              setError('');
              setSuccess('');
              // Recharger les adresses sans compteur avant d'ouvrir la popup
              await loadAdresses();
              setShowCreateModal(true);
              setFilterQuartier('');
              setSearchAdresse('');
            }}
            className="px-3 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
          >
            + Ajouter un compteur
          </button>
          <button
            type="button"
            onClick={loadCompteurs}
            className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100"
          >
            Rafraîchir
          </button>
        </div>
      </div>
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg text-sm">
          {success}
        </div>
      )}
      {loading ? (
        <p className="text-sm text-slate-400">Chargement des compteurs...</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>
              {compteurs.length === 0
                ? 'Aucun compteur à afficher.'
                : `Affichage de ${(page - 1) * pageSize + 1} à ${Math.min(
                    page * pageSize,
                    compteurs.length
                  )} sur ${compteurs.length} compteurs`}
            </span>
            <div className="flex items-center gap-2">
              <span>Par page</span>
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
            <table className="min-w-full text-xs">
              <thead className="bg-slate-900/70 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-400">N° série</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-400">Type</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-400">Adresse</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-400">Quartier</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-400">Client</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-400">Index actuel</th>
                </tr>
              </thead>
              <tbody>
                {currentPageItems.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-xs text-slate-500"
                    >
                      Aucun compteur.
                    </td>
                  </tr>
                )}
                {currentPageItems.map((c) => (
                  <tr key={c.numero_serie} className="border-t border-slate-800/60 hover:bg-slate-900/40">
                    <td className="px-4 py-2 text-slate-100">{c.numero_serie}</td>
                    <td className="px-4 py-2 text-slate-300">{c.type}</td>
                    <td className="px-4 py-2 text-slate-300">
                      {c.adresse?.libelle_complet || '-'}
                    </td>
                    <td className="px-4 py-2 text-slate-300">
                      {c.adresse?.quartier?.libelle || '-'}
                    </td>
                    <td className="px-4 py-2 text-slate-300">
                      {c.client ? c.client.nom_complet : '-'}
                    </td>
                    <td className="px-4 py-2 text-slate-300">{c.index_actuel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {compteurs.length > 0 && (
            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
              <span>
                Page {page} sur {totalPages}
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
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2 py-1 rounded border border-slate-700 disabled:opacity-40 hover:bg-slate-800"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showCreateModal && (() => {
        // Filtrer les adresses selon le quartier et la recherche
        const filteredAdresses = adressesSansCompteur.filter((a) => {
          const matchQuartier = !filterQuartier || a.quartier?.id_quartier === Number(filterQuartier);
          const matchSearch = !searchAdresse || a.libelle_complet.toLowerCase().includes(searchAdresse.toLowerCase());
          return matchQuartier && matchSearch;
        });

        return (
          <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Créer un compteur</h3>
              <p className="text-xs text-slate-500 mb-4">
                Sélectionnez une adresse qui ne possède pas encore de compteur. Le numéro de série sera généré automatiquement si non fourni (9 chiffres).
              </p>
              <form onSubmit={handleCreateCompteur} className="space-y-3">
                {/* Filtres pour la sélection d'adresse */}
                <div className="bg-slate-900/50 rounded-lg p-3 space-y-2 border border-slate-800">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1" htmlFor="filter-quartier">
                      Filtrer par quartier
                    </label>
                    <select
                      id="filter-quartier"
                      value={filterQuartier}
                      onChange={(e) => setFilterQuartier(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Tous les quartiers</option>
                      {quartiers.map((q) => (
                        <option key={q.id_quartier} value={q.id_quartier}>
                          {q.libelle}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1" htmlFor="search-adresse">
                      Rechercher une adresse
                    </label>
                    <input
                      id="search-adresse"
                      type="text"
                      value={searchAdresse}
                      onChange={(e) => setSearchAdresse(e.target.value)}
                      placeholder="Rechercher..."
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1" htmlFor="numero_serie">
                    Numéro de série (optionnel, 9 chiffres)
                  </label>
                  <input
                    id="numero_serie"
                    name="numero_serie"
                    type="text"
                    maxLength={9}
                    value={createForm.numero_serie}
                    onChange={handleCreateInputChange}
                    placeholder="000000001"
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1" htmlFor="type">
                    Type
                  </label>
                  <select
                    id="type"
                    name="type"
                    required
                    value={createForm.type}
                    onChange={handleCreateInputChange}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="EAU">EAU</option>
                    <option value="ELECTRICITE">ELECTRICITE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1" htmlFor="id_adresse">
                    Adresse * ({filteredAdresses.length} disponible{filteredAdresses.length > 1 ? 's' : ''})
                  </label>
                  <select
                    id="id_adresse"
                    name="id_adresse"
                    required
                    value={createForm.id_adresse}
                    onChange={handleCreateInputChange}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Sélectionner une adresse</option>
                    {filteredAdresses.map((a) => (
                      <option key={a.id_adresse} value={a.id_adresse}>
                        {a.libelle_complet} {a.quartier ? `(${a.quartier.libelle})` : ''}
                      </option>
                    ))}
                  </select>
                  {filteredAdresses.length === 0 && (
                    <p className="text-xs text-amber-400 mt-1">
                      Aucune adresse disponible avec ces critères.
                    </p>
                  )}
                </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1" htmlFor="id_client">
                  Client *
                </label>
                <select
                  id="id_client"
                  name="id_client"
                  required
                  value={createForm.id_client}
                  onChange={handleCreateInputChange}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={clients.length === 0}
                >
                  <option value="">
                    {clients.length === 0 ? 'Aucun client disponible' : 'Sélectionner un client'}
                  </option>
                  {clients.map((c) => (
                    <option key={c.id_client} value={c.id_client}>
                      {c.nom_complet}
                    </option>
                  ))}
                </select>
                {clients.length === 0 && (
                  <p className="text-xs text-rose-400 mt-1">
                    Aucun client trouvé. Veuillez d&apos;abord importer des clients via l&apos;intégration ERP.
                  </p>
                )}
              </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreateForm({ numero_serie: '', type: 'EAU', id_adresse: '', id_client: '' });
                      setFilterQuartier('');
                      setSearchAdresse('');
                    }}
                    className="px-3 py-2 text-xs rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || filteredAdresses.length === 0}
                    className="px-3 py-2 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-60"
                  >
                    {submitting ? 'Création...' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default DashboardCompteurs;


