import React, { useCallback, useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { createAgency, listAgencies, setAgencyActive, type Agency, AdminError } from '../adminApi';
import {
  BotaoSalvar,
  Campo,
  entradaClasses,
  Erro,
  Painel,
  Sucesso,
  Vazio,
} from '../components/AdminUI';

/** Imobiliárias parceiras. Cada uma enxerga apenas a própria carteira. */
export const AgenciesTab: React.FC = () => {
  const [lista, setLista] = useState<Agency[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');

  const recarregar = useCallback(async () => {
    try {
      setLista(await listAgencies());
      setErro(null);
    } catch (e) {
      setErro(e instanceof AdminError ? e.message : 'Não foi possível carregar.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setSucesso(null);

    if (nome.trim().length < 2) {
      setErro('Informe o nome da imobiliária.');
      return;
    }

    setSalvando(true);
    try {
      const criada = await createAgency({ name: nome, cnpj, phone: telefone, email });
      setSucesso(`${criada.name} cadastrada.`);
      setNome('');
      setCnpj('');
      setTelefone('');
      setEmail('');
      await recarregar();
    } catch (e) {
      setErro(e instanceof AdminError ? e.message : 'Não foi possível cadastrar.');
    } finally {
      setSalvando(false);
    }
  };

  const alternar = async (a: Agency) => {
    try {
      await setAgencyActive(a.id, !a.active);
      await recarregar();
    } catch (e) {
      setErro(e instanceof AdminError ? e.message : 'Não foi possível alterar.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Painel
        titulo="Nova imobiliária"
        descricao="Ela passa a enxergar somente os imóveis e chamados da própria carteira."
      >
        <form onSubmit={enviar} className="space-y-4">
          <Erro mensagem={erro} />
          <Sucesso mensagem={sucesso} />

          <Campo label="Nome" htmlFor="ag-nome" required>
            <input
              id="ag-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Aliança Gestão Imobiliária"
              className={entradaClasses}
            />
          </Campo>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="CNPJ" htmlFor="ag-cnpj">
              <input
                id="ag-cnpj"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0001-00"
                className={entradaClasses}
              />
            </Campo>

            <Campo label="Telefone" htmlFor="ag-tel">
              <input
                id="ag-tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 3000-0000"
                className={entradaClasses}
              />
            </Campo>
          </div>

          <Campo label="E-mail de contato" htmlFor="ag-email">
            <input
              id="ag-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contato@imobiliaria.com.br"
              className={entradaClasses}
            />
          </Campo>

          <BotaoSalvar salvando={salvando}>CADASTRAR IMOBILIÁRIA</BotaoSalvar>
        </form>
      </Painel>

      <Painel
        titulo={`Imobiliárias (${lista.length})`}
        descricao="Desativar não apaga: o histórico dos imóveis continua íntegro."
      >
        {carregando ? (
          <Vazio>Carregando…</Vazio>
        ) : lista.length === 0 ? (
          <Vazio>Nenhuma imobiliária cadastrada ainda.</Vazio>
        ) : (
          <ul className="divide-y divide-slate-100">
            {lista.map((a) => (
              <li key={a.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Building2 className="w-4 h-4 text-purple-600 shrink-0" />
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-bold truncate ${a.active ? 'text-slate-900' : 'text-slate-400 line-through'}`}
                    >
                      {a.name}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {a.cnpj ?? 'sem CNPJ'} · {a.email ?? 'sem e-mail'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => void alternar(a)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors shrink-0 ${
                    a.active
                      ? 'text-rose-700 hover:bg-rose-50'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  {a.active ? 'Desativar' : 'Reativar'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Painel>
    </div>
  );
};
