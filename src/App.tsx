import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { useApp } from './context/useApp';
import { Header } from './components/Header';
import { TenantView } from './components/views/TenantView';
import { AgencyView } from './components/views/AgencyView';
import { CompanyView } from './components/views/CompanyView';
import { TechnicianView } from './components/views/TechnicianView';
import { LoginPortal } from './components/LoginPortal';
import { NewTicketModal } from './components/NewTicketModal';
import { TicketDetailModal } from './components/TicketDetailModal';

const MainContent: React.FC = () => {
  const { activePortalTab, currentUser, selectedTicket, setSelectedTicketId } = useApp();

  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);

  // Verify if current authenticated user has access to this portal tab
  const isAuthenticatedForTab = currentUser !== null && currentUser.role === activePortalTab;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 font-sans antialiased">
      <Header onOpenNewTicket={() => setIsNewTicketModalOpen(true)} />

      <main className="flex-1 pb-16">
        {!isAuthenticatedForTab ? (
          <LoginPortal targetRole={activePortalTab} />
        ) : (
          <>
            {activePortalTab === 'inquilino' && (
              <TenantView onOpenNewTicket={() => setIsNewTicketModalOpen(true)} />
            )}

            {activePortalTab === 'imobiliaria' && <AgencyView />}

            {activePortalTab === 'empresa' && <CompanyView />}

            {activePortalTab === 'prestador' && <TechnicianView />}
          </>
        )}
      </main>

      {/* Global New Ticket Modal */}
      <NewTicketModal
        isOpen={isNewTicketModalOpen}
        onClose={() => setIsNewTicketModalOpen(false)}
      />

      {/* Global Ticket Details Modal */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          isOpen={true}
          onClose={() => setSelectedTicketId(null)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
