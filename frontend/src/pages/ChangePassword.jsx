import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function ChangePassword() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isFirstLogin = user?.must_change_password;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        newPassword
      };

      if (!isFirstLogin) {
        payload.currentPassword = currentPassword;
      }

      await api.post('/auth/change-password', payload);
      setSuccess('Mot de passe modifié avec succès. Vous allez être déconnecté(e).');

      // Forcer une reconnexion propre après changement de mot de passe
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 2000);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setError("Impossible de changer le mot de passe.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
      <div className="w-full max-w-md bg-slate-900/70 border border-slate-800 rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-semibold mb-2 text-center">Sécurité du compte</h1>
        <p className="text-sm text-slate-400 mb-6 text-center">
          {isFirstLogin
            ? "C'est votre première connexion, vous devez changer le mot de passe reçu par email."
            : 'Changez régulièrement votre mot de passe pour sécuriser votre compte.'}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isFirstLogin && (
            <div>
              <label className="block text-sm mb-1" htmlFor="currentPassword">
                Mot de passe actuel
              </label>
              <input
                id="currentPassword"
                type="password"
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm mb-1" htmlFor="newPassword">
              Nouveau mot de passe
            </label>
            <input
              id="newPassword"
              type="password"
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              Minimum 8 caractères, mélangez lettres, chiffres et caractères spéciaux.
            </p>
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="confirmPassword">
              Confirmer le nouveau mot de passe
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {success && <p className="text-sm text-emerald-400">{success}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 font-semibold py-2 rounded-lg text-sm transition-colors"
          >
            {submitting ? 'Enregistrement...' : 'Enregistrer le nouveau mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChangePassword;




