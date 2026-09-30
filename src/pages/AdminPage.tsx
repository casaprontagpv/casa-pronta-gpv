import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Building2, Home, ShieldCheck, User, UserCheck } from 'lucide-react';
import { AgenciesTab } from '../admin/tabs/AgenciesTab';
import { PropertiesTab } from '../admin/tabs/PropertiesTab';
import { TenantsTab } from '../admin/tabs/TenantsTab';
import { TechniciansTab } from '../admin/tabs/TechniciansTab';

type Aba = 'imobiliarias' | 'imoveis' | 'inquilinos' | 'tecnicos';

const ABAS: { id: Aba; label: string; icon: typeof Building2 }[] = [
  { id: 'imobiliarias', label: 'Imobiliárias', icon: Building2 },
  { id: 'imoveis', label: 'Imóveis', icon: Home },
  { id: 'inquilinos', label: 'Inquilinos', icon: User },
  { id: 'tecnicos', label: 'Técnicos', icon: UserCheck },
];

/**
 * Painel administrativo — exclusivo da central da Casa Pronta.
 *
 * É por aqui que entra todo mundo no sistema: não há auto-cadastro. Num banco de
 * produção novo, esta é a única tela capaz de destravar o restante.
 *
 * A ordem das abas é a ordem de dependência: imobiliária → imóvel → inquilino.
 * Técnico é independente.
 */
export const AdminPage: React.FC = () => {
  const [aba, setAba] = useState<Aba>('imobiliarias');

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Administração
            </span>
            <h2 className="text-2xl font-extrabold tracking-tight mt-1.5">Cadastros e Acessos</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Todo acesso ao sistema nasce aqui. Não existe auto-cadastro: a central cria a conta e
              informa a credencial pelo canal que preferir.
            </p>
          </div>

          <Link
            to="/empresa"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold transition-colors border border-slate-700"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar à central
          </Link>
        </div>

        <div className="mt-4 p-3 bg-slate-800/60 border border-slate-700/60 rounded-2xl flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-px" />
          <p className="text-[11px] text-slate-300 leading-relaxed">
            A ordem importa: cadastre a <strong>imobiliária</strong>, depois o{' '}
            <strong>imóvel</strong>, e só então o <strong>inquilino</strong> — é o vínculo com o
            imóvel que define o que cada pessoa enxerga.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto text-xs font-bold">
        {ABAS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`pb-3 px-4 border-b-2 flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap ${
              aba === id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {aba === 'imobiliarias' && <AgenciesTab />}
      {aba === 'imoveis' && <PropertiesTab />}
      {aba === 'inquilinos' && <TenantsTab />}
      {aba === 'tecnicos' && <TechniciansTab />}
    </div>
  );
};
