import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { AuthProvider } from '../../context/AuthContext.jsx';
import Dashboard from '../Dashboard.jsx';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: {
        tauxCouverture: 75,
        totalCompteurs: 200,
        relevésCeMois: 150,
        topAgents: [
          { id_agent: 1, nom: 'AGENT', prenom: 'One', nbReleves: 50 },
          { id_agent: 2, nom: 'AGENT', prenom: 'Two', nbReleves: 40 }
        ],
        consommationParMois: [
          { annee: 2025, mois: 10, totalConsommation: 1234 },
          { annee: 2025, mois: 11, totalConsommation: 1500 }
        ]
      }
    })
  }
}));

function DashboardWithProvider() {
  // Simuler un utilisateur connecté dans AuthProvider via localStorage
  localStorage.setItem(
    'user',
    JSON.stringify({
      id_user: 1,
      nom: 'ADMIN',
      prenom: 'Super',
      email: 'admin@ree.ma',
      role: 'SUPERADMIN'
    })
  );
  localStorage.setItem('token', 'fake-jwt');

  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
}

test('renders dashboard stats from API', async () => {
  render(<DashboardWithProvider />);

  await waitFor(() => {
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Taux de couverture/)).toBeInTheDocument();
    expect(screen.getByText(/75%/)).toBeInTheDocument();
    expect(screen.getByText(/Total compteurs/)).toBeInTheDocument();
    expect(screen.getByText(/200/)).toBeInTheDocument();
    expect(screen.getByText(/AGENT One/)).toBeInTheDocument();
  });
});





