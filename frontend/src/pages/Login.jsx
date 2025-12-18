import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@ree.ma');
  const [password, setPassword] = useState('password123');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      // Navigation will be handled by App.jsx based on user state
      // Navigate to dashboard - App.jsx will redirect to change-password if needed
      navigate('/dashboard', { replace: true });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setError('Identifiants invalides ou erreur serveur.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
      <div className="w-full max-w-md bg-slate-900/70 border border-slate-800 rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-semibold mb-2 text-center">SI Relevés - REE</h1>
        <p className="text-sm text-slate-400 mb-6 text-center">
          Connexion à l&apos;espace backoffice
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="password">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 font-semibold py-2 rounded-lg text-sm transition-colors"
          >
            {submitting ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        <p className="mt-4 text-xs text-slate-500 text-center">
          Démo : admin@ree.ma / password123 (générés par le seeding)
        </p>
      </div>
    </div>
  );
}

export default Login;


