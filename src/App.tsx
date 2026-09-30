import React, { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { useApp } from './context/useApp';
import { AuthProvider } from './auth/AuthProvider';
import { useAuth } from './auth/useAuth';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { homePathForRole } from './auth/portalRoutes';
import { LoadingScreen } from './components/LoadingScreen';
import { Header } from './components/Header';
import { TenantView } from './components/views/TenantView';
import { AgencyView } from './components/views/AgencyView';
import { CompanyView } from './components/views/CompanyView';
import { TechnicianView } from './components/views/TechnicianView';
import { LoginPage } from './pages/LoginPage';
import { RecoverPasswordPage } from './pages/RecoverPasswordPage';
import { NewPasswordPage } from './pages/NewPasswordPage';
import { AdminPage } from './pages/AdminPage';
import { NewTicketModal } from './components/NewTicketModal';
import { TicketDetailModal } from './components/TicketDetailModal';

/** Moldura comum dos portais: cabeçalho, conteúdo e os modais globais. */
const PortalShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { selectedTicket, setSelectedTicketId } = useApp();
  const [novoChamadoAberto, setNovoChamadoAberto] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 font-sans antialiased">
      <Header onOpenNewTicket={() => setNovoChamadoAberto(true)} />

      <main className="flex-1 pb-16">{children}</main>

      <NewTicketModal isOpen={novoChamadoAberto} onClose={() => setNovoChamadoAberto(false)} />

      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          isOpen
          onClose={() => setSelectedTicketId(null)}
        />
      )}
    </div>
  );
};

/** Raiz: leva ao portal do papel, ou ao login quando não há sessão. */
const Home: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return <Navigate to={user ? homePathForRole(user.role) : '/login'} replace />;
};

const TenantPortal: React.FC = () => {
  const [novoChamadoAberto, setNovoChamadoAberto] = useState(false);
  return (
    <>
      <TenantView onOpenNewTicket={() => setNovoChamadoAberto(true)} />
      <NewTicketModal isOpen={novoChamadoAberto} onClose={() => setNovoChamadoAberto(false)} />
    </>
  );
};

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/recuperar-senha" element={<RecoverPasswordPage />} />
    <Route path="/nova-senha" element={<NewPasswordPage />} />

    <Route path="/" element={<Home />} />

    <Route
      path="/inquilino"
      element={
        <ProtectedRoute allow="inquilino">
          <PortalShell>
            <TenantPortal />
          </PortalShell>
        </ProtectedRoute>
      }
    />

    <Route
      path="/imobiliaria"
      element={
        <ProtectedRoute allow="imobiliaria">
          <PortalShell>
            <AgencyView />
          </PortalShell>
        </ProtectedRoute>
      }
    />

    <Route
      path="/empresa"
      element={
        <ProtectedRoute allow="empresa">
          <PortalShell>
            <CompanyView />
          </PortalShell>
        </ProtectedRoute>
      }
    />

    <Route
      path="/prestador"
      element={
        <ProtectedRoute allow="prestador">
          <PortalShell>
            <TechnicianView />
          </PortalShell>
        </ProtectedRoute>
      }
    />

    <Route
      path="/admin"
      element={
        <ProtectedRoute allow="empresa">
          <PortalShell>
            <AdminPage />
          </PortalShell>
        </ProtectedRoute>
      }
    />

    {/* Rota desconhecida cai na raiz, que redireciona conforme a sessão. */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
