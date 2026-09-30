import React, { useCallback, useEffect, useState } from 'react';
import { UserCheck } from 'lucide-react';
import {
  AdminError,
  createTechnician,
  createUserAccount,
  listTechnicians,
  setTechnicianActive,
  type ContaCriada,
  type Technician,
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
 * Técnicos de campo.
 *
 * A conta e o registro de técnico são coisas distintas: é o `profile_id` em
 * `technicians` que dá ao usuário acesso à própria agenda. Sem ele a pessoa
 * autentica e vê uma agenda vazia.
 */
export const TechniciansTab: React.FC = () => {
  const [lista, setLista] = useState<Technician[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [criada, setCriada] = useState<ContaCriada | null>(null);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [equipe, setEquipe] = useState('');
  const [especialidades, setEspecialidades] = useState('');
  const [convidar, setConvidar] = useState(false);

  const recarregar = useCallback(async () => {
    try {
      setLista(await listTechnicians());
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
    setCriada(null);

    if (!nome.trim() || !email.trim()) {
      setErro('Nome e e-mail são obrigatórios.');
      return;
    }

    setSalvando(true);
    try {
      const conta = await createUserAccount({
        name: nome,
        email,
        role: 'prestador',
        phone: telefone || undefined,
        sendInvite: convidar,
      });

      try {
        await createTechnician({
          profileId: conta.userId,
          name: nome,
          team: equipe || 'Equipe Geral',
          specialties: especialidades
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          phone: telefone,
          email,
        });
      } catch (e) {
        setErro(
          `Conta criada, mas o registro de técnico falhou: ${
            e instanceof AdminError ? e.message : 'erro desconhecido'
          }. A pessoa consegue entrar, mas ainda não tem agenda.`
        );
        setCriada(conta);
        await recarregar();
        return;
      }

      setCriada(conta);
      setNome('');
      setEmail('');
      setTelefone('');
      setEquipe('');
      setEspecialidades('');
      await recarregar();
    } catch (e) {
      setErro(e instanceof AdminError ? e.message : 'Não foi possível criar o técnico.');
    } finally {
      setSalvando(false);
    }
  };

  const alternar = async (t: Technician) => {
    try {
      await setTechnicianActive(t.id, !t.active);
      await recarregar();
    } catch (e) {
      setErro(e instanceof AdminError ? e.message : 'Não foi possível alterar.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Painel
        titulo="Novo técnico"
        descricao="Cria a conta e o registro de técnico. É o vínculo entre os dois que dá acesso à agenda."
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

          <Campo label="Nome completo" htmlFor="tec-nome" required>
            <input
              id="tec-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Carlos Santos"
              className={entradaClasses}
            />
          </Campo>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="E-mail" htmlFor="tec-email" required>
              <input
                id="tec-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="carlos@casapronta.com.br"
                className={entradaClasses}
              />
            </Campo>

            <Campo label="Telefone" htmlFor="tec-tel">
              <input
                id="tec-tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 98000-0000"
                className={entradaClasses}
              />
            </Campo>
          </div>

          <Campo label="Equipe" htmlFor="tec-equipe" hint="Ex.: Equipe Hidráulica">
            <input
              id="tec-equipe"
              value={equipe}
              onChange={(e) => setEquipe(e.target.value)}
              placeholder="Equipe Hidráulica"
              className={entradaClasses}
            />
          </Campo>

          <Campo
            label="Especialidades"
            htmlFor="tec-esp"
            hint="Separadas por vírgula: Hidráulica, Vazamentos, Tubulações"
          >
            <input
              id="tec-esp"
              value={especialidades}
              onChange={(e) => setEspecialidades(e.target.value)}
              placeholder="Hidráulica, Vazamentos"
              className={entradaClasses}
            />
          </Campo>

          <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={convidar}
              onChange={(e) => setConvidar(e.target.checked)}
              className="mt-0.5"
            />
            <span>Enviar convite por e-mail em vez de gerar senha temporária.</span>
          </label>

          <BotaoSalvar salvando={salvando}>CRIAR TÉCNICO</BotaoSalvar>
        </form>
      </Painel>

      <Painel
        titulo={`Técnicos (${lista.filter((t) => t.active).length} ativos)`}
        descricao="Desativar tira da agenda sem apagar o histórico dos atendimentos feitos."
      >
        {carregando ? (
          <Vazio>Carregando…</Vazio>
        ) : lista.length === 0 ? (
          <Vazio>Nenhum técnico cadastrado ainda.</Vazio>
        ) : (
          <ul className="divide-y divide-slate-100 max-h-[32rem] overflow-y-auto">
            {lista.map((t) => (
              <li key={t.id} className="py-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <UserCheck
                    className={`w-4 h-4 shrink-0 mt-0.5 ${t.active ? 'text-cyan-600' : 'text-slate-300'}`}
                  />
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-bold truncate ${t.active ? 'text-slate-900' : 'text-slate-400 line-through'}`}
                    >
                      {t.name}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{t.team}</p>
                    {t.specialties.length > 0 && (
                      <p className="text-[11px] text-slate-400 truncate">
                        {t.specialties.join(' · ')}
                      </p>
                    )}
                    {!t.profile_id && (
                      <p className="text-[11px] text-amber-700 font-semibold">
                        sem conta vinculada — não acessa a agenda
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => void alternar(t)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors shrink-0 ${
                    t.active
                      ? 'text-rose-700 hover:bg-rose-50'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  {t.active ? 'Desativar' : 'Reativar'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Painel>
    </div>
  );
};
