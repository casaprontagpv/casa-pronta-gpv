import React, { useCallback, useEffect, useState } from 'react';
import { User } from 'lucide-react';
import {
  AdminError,
  createUserAccount,
  endTenancy,
  linkTenantToProperty,
  listProperties,
  listTenancies,
  type ContaCriada,
  type PropertyWithAgency,
  type TenancyRow,
} from '../adminApi';
import {
  BotaoSalvar,
  Campo,
  CredencialCriada,
  entradaClasses,
  Erro,
  Painel,
  Vazio,
} from '../components/AdminUI';

/**
 * Inquilinos.
 *
 * Duas coisas acontecem juntas: a conta nasce (pelo servidor, com service_role)
 * e é vinculada a um imóvel. Sem o vínculo o inquilino autentica mas não enxerga
 * nada — é o vínculo que define o que ele vê.
 */
export const TenantsTab: React.FC = () => {
  const [vinculos, setVinculos] = useState<TenancyRow[]>([]);
  const [imoveis, setImoveis] = useState<PropertyWithAgency[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [criada, setCriada] = useState<ContaCriada | null>(null);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [convidar, setConvidar] = useState(false);

  const recarregar = useCallback(async () => {
    try {
      const [vs, ims] = await Promise.all([listTenancies(), listProperties()]);
      setVinculos(vs);
      setImoveis(ims);
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

  // Imóveis sem locatário ativo — o banco recusa um segundo.
  const ocupados = new Set(vinculos.filter((v) => v.active).map((v) => v.properties?.id));
  const disponiveis = imoveis.filter((p) => !ocupados.has(p.id));

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setCriada(null);

    if (!nome.trim() || !email.trim()) {
      setErro('Nome e e-mail são obrigatórios.');
      return;
    }
    if (!propertyId) {
      setErro('Escolha o imóvel. Sem vínculo, o inquilino não enxerga chamado nenhum.');
      return;
    }

    setSalvando(true);
    try {
      const conta = await createUserAccount({
        name: nome,
        email,
        role: 'inquilino',
        phone: telefone || undefined,
        sendInvite: convidar,
      });

      try {
        await linkTenantToProperty(propertyId, conta.userId);
      } catch (e) {
        // A conta já existe; só o vínculo falhou. Dizer isso é melhor do que
        // um erro genérico que faria o admin tentar criar tudo de novo.
        setErro(
          `Conta criada, mas o vínculo com o imóvel falhou: ${
            e instanceof AdminError ? e.message : 'erro desconhecido'
          }. Faça o vínculo pela lista ao lado.`
        );
        setCriada(conta);
        await recarregar();
        return;
      }

      setCriada(conta);
      setNome('');
      setEmail('');
      setTelefone('');
      setPropertyId('');
      await recarregar();
    } catch (e) {
      setErro(e instanceof AdminError ? e.message : 'Não foi possível criar a conta.');
    } finally {
      setSalvando(false);
    }
  };

  const encerrar = async (v: TenancyRow) => {
    try {
      await endTenancy(v.id);
      await recarregar();
    } catch (e) {
      setErro(e instanceof AdminError ? e.message : 'Não foi possível encerrar.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Painel
        titulo="Novo inquilino"
        descricao="Cria a conta e vincula ao imóvel. É o vínculo que define o que a pessoa enxerga."
      >
        <form onSubmit={enviar} className="space-y-4">
          <Erro mensagem={erro} />

          {criada && (
            <CredencialCriada
              email={criada.email}
              senha={criada.temporaryPassword}
              convidado={criada.invited}
              onFechar={() => setCriada(null)}
            />
          )}

          <Campo label="Nome completo" htmlFor="in-nome" required>
            <input
              id="in-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Mariana Costa"
              className={entradaClasses}
            />
          </Campo>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="E-mail" htmlFor="in-email" required>
              <input
                id="in-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mariana@email.com"
                className={entradaClasses}
              />
            </Campo>

            <Campo label="Telefone" htmlFor="in-tel">
              <input
                id="in-tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 98000-0000"
                className={entradaClasses}
              />
            </Campo>
          </div>

          <Campo
            label="Imóvel"
            htmlFor="in-imovel"
            hint={
              disponiveis.length === 0
                ? 'Nenhum imóvel livre. Cadastre um, ou encerre o vínculo do locatário anterior.'
                : 'Só aparecem imóveis sem locatário ativo.'
            }
            required
          >
            <select
              id="in-imovel"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className={entradaClasses}
              disabled={disponiveis.length === 0}
            >
              <option value="">Selecione…</option>
              {disponiveis.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.address}
                  {p.unit ? ` (${p.unit})` : ''}
                </option>
              ))}
            </select>
          </Campo>

          <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={convidar}
              onChange={(e) => setConvidar(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Enviar convite por e-mail em vez de gerar senha temporária.
              <span className="block text-[11px] text-slate-500">
                A pessoa define a própria senha pelo link recebido.
              </span>
            </span>
          </label>

          <BotaoSalvar salvando={salvando}>CRIAR INQUILINO</BotaoSalvar>
        </form>
      </Painel>

      <Painel
        titulo={`Vínculos (${vinculos.filter((v) => v.active).length} ativos)`}
        descricao="Encerrar um vínculo preserva o histórico: o chamado continua apontando para quem morava lá."
      >
        {carregando ? (
          <Vazio>Carregando…</Vazio>
        ) : vinculos.length === 0 ? (
          <Vazio>Nenhum inquilino vinculado ainda.</Vazio>
        ) : (
          <ul className="divide-y divide-slate-100 max-h-[32rem] overflow-y-auto">
            {vinculos.map((v) => (
              <li key={v.id} className="py-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <User
                    className={`w-4 h-4 shrink-0 mt-0.5 ${v.active ? 'text-emerald-600' : 'text-slate-300'}`}
                  />
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-bold truncate ${v.active ? 'text-slate-900' : 'text-slate-400'}`}
                    >
                      {v.profiles?.name ?? 'perfil removido'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {v.properties?.address}
                      {v.properties?.unit ? ` — ${v.properties.unit}` : ''}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{v.profiles?.email}</p>
                  </div>
                </div>
                {v.active && (
                  <button
                    onClick={() => void encerrar(v)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-700 hover:bg-rose-50 cursor-pointer transition-colors shrink-0"
                  >
                    Encerrar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Painel>
    </div>
  );
};
