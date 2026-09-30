import React, { useCallback, useEffect, useState } from 'react';
import { Home } from 'lucide-react';
import {
  AdminError,
  createProperty,
  listAgencies,
  listProperties,
  type Agency,
  type PropertyWithAgency,
} from '../adminApi';
import {
  BotaoSalvar,
  Campo,
  entradaClasses,
  Erro,
  Painel,
  Sucesso,
  Vazio,
} from '../components/AdminUI';
import { getPropertyTypeLabel } from '../../utils/helpers';
import type { PropertyType } from '../../types';

const TIPOS: PropertyType[] = ['apartamento', 'casa', 'sobrado', 'comercial', 'outro'];

/**
 * Imóveis sob gestão.
 *
 * Ter chave própria é o que impede o prontuário de se fragmentar quando o mesmo
 * endereço é digitado de duas formas — problema que o protótipo tinha.
 */
export const PropertiesTab: React.FC = () => {
  const [imoveis, setImoveis] = useState<PropertyWithAgency[]>([]);
  const [imobiliarias, setImobiliarias] = useState<Agency[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [agencyId, setAgencyId] = useState('');
  const [codigo, setCodigo] = useState('');
  const [endereco, setEndereco] = useState('');
  const [unidade, setUnidade] = useState('');
  const [bairro, setBairro] = useState('');
  const [tipo, setTipo] = useState<PropertyType>('apartamento');

  const recarregar = useCallback(async () => {
    try {
      const [ims, ags] = await Promise.all([listProperties(), listAgencies()]);
      setImoveis(ims);
      setImobiliarias(ags.filter((a) => a.active));
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

    if (!agencyId) {
      setErro('Escolha a imobiliária responsável.');
      return;
    }
    if (!codigo.trim() || !endereco.trim()) {
      setErro('Código e endereço são obrigatórios.');
      return;
    }

    setSalvando(true);
    try {
      await createProperty({
        agencyId,
        code: codigo,
        address: endereco,
        unit: unidade,
        neighborhood: bairro,
        propertyType: tipo,
      });
      setSucesso(`Imóvel ${codigo.toUpperCase()} cadastrado.`);
      setCodigo('');
      setEndereco('');
      setUnidade('');
      setBairro('');
      await recarregar();
    } catch (e) {
      setErro(e instanceof AdminError ? e.message : 'Não foi possível cadastrar.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Painel
        titulo="Novo imóvel"
        descricao="O imóvel pertence a uma imobiliária, e é por ele que o inquilino enxerga os próprios chamados."
      >
        <form onSubmit={enviar} className="space-y-4">
          <Erro mensagem={erro} />
          <Sucesso mensagem={sucesso} />

          <Campo label="Imobiliária" htmlFor="im-agencia" required>
            <select
              id="im-agencia"
              value={agencyId}
              onChange={(e) => setAgencyId(e.target.value)}
              className={entradaClasses}
            >
              <option value="">Selecione…</option>
              {imobiliarias.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Campo>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo
              label="Código"
              htmlFor="im-codigo"
              hint="Identificador interno, ex.: IMOV-402"
              required
            >
              <input
                id="im-codigo"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="IMOV-402"
                className={`${entradaClasses} uppercase`}
              />
            </Campo>

            <Campo label="Tipo" htmlFor="im-tipo" required>
              <select
                id="im-tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as PropertyType)}
                className={entradaClasses}
              >
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {getPropertyTypeLabel(t)}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <Campo label="Endereço" htmlFor="im-endereco" required>
            <input
              id="im-endereco"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Rua das Acácias, 450"
              className={entradaClasses}
            />
          </Campo>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Unidade" htmlFor="im-unidade" hint="Apto, casa, conjunto…">
              <input
                id="im-unidade"
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                placeholder="Apto 402"
                className={entradaClasses}
              />
            </Campo>

            <Campo label="Bairro" htmlFor="im-bairro">
              <input
                id="im-bairro"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                placeholder="Pinheiros"
                className={entradaClasses}
              />
            </Campo>
          </div>

          <BotaoSalvar salvando={salvando}>CADASTRAR IMÓVEL</BotaoSalvar>
        </form>
      </Painel>

      <Painel titulo={`Imóveis (${imoveis.length})`} descricao="Toda a carteira administrada.">
        {carregando ? (
          <Vazio>Carregando…</Vazio>
        ) : imoveis.length === 0 ? (
          <Vazio>Nenhum imóvel cadastrado. Comece pela imobiliária.</Vazio>
        ) : (
          <ul className="divide-y divide-slate-100 max-h-[32rem] overflow-y-auto">
            {imoveis.map((p) => (
              <li key={p.id} className="py-3 flex items-start gap-2.5">
                <Home className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {p.address}
                    {p.unit ? ` — ${p.unit}` : ''}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    <span className="font-mono">{p.code}</span> ·{' '}
                    {p.agencies?.name ?? 'sem imobiliária'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Painel>
    </div>
  );
};
