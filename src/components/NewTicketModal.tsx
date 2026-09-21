import React, { useState } from 'react';
import { useApp } from '../context/useApp';
import { Category, PreferredPeriod, PriorityLevel, PropertyType } from '../types';
import {
  X,
  Upload,
  Camera,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Share2,
} from 'lucide-react';
import { generateWhatsAppLink } from '../utils/helpers';

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_SAMPLE_PHOTOS: { label: string; url: string }[] = [
  {
    label: '💧 Vazamento Hidráulico',
    url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=600',
  },
  {
    label: '⚡ Curto / Elétrica',
    url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=600',
  },
  {
    label: '🖌️ Pintura Descascando',
    url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&q=80&w=600',
  },
  {
    label: '🚪 Fechadura / Porta',
    url: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&q=80&w=600',
  },
];

export const NewTicketModal: React.FC<NewTicketModalProps> = ({ isOpen, onClose }) => {
  const { createTicket, setSelectedTicketId, currentUser } = useApp();

  // O formulário parte dos dados de quem está logado. Antes vinha pré-preenchido com
  // "Mariana Costa" e o endereço dela — um inquilino que abrisse chamado registrava
  // o nome e o imóvel de outra pessoa, e o chamado caía no isolamento de dados dela.
  const [tenantName, setTenantName] = useState(currentUser?.name ?? '');
  const [tenantPhone, setTenantPhone] = useState(currentUser?.phone ?? '');
  const [tenantEmail] = useState(currentUser?.email ?? '');
  const [address, setAddress] = useState(currentUser?.propertyAddress ?? '');
  const [propertyType, setPropertyType] = useState<PropertyType>('apartamento');
  const [environment, setEnvironment] = useState('');
  const [category, setCategory] = useState<Category>('hidraulica');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<PriorityLevel>('normal');
  const [preferredPeriod, setPreferredPeriod] = useState<PreferredPeriod>('manha');
  const [photos, setPhotos] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const [createdProtocol, setCreatedProtocol] = useState<string | null>(null);
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        if (loadEvt.target?.result) {
          setPhotos((prev) => [...prev, loadEvt.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!tenantName.trim() || !tenantPhone.trim() || !address.trim()) {
      setFormError('Preencha nome, telefone e endereço do imóvel.');
      return;
    }
    if (!environment.trim()) {
      setFormError('Informe em qual ambiente do imóvel está o problema.');
      return;
    }
    if (!description.trim()) {
      setFormError('Descreva o problema relatado.');
      return;
    }
    setFormError(null);

    const newTicket = createTicket({
      tenantName,
      tenantPhone,
      tenantEmail,
      address,
      propertyType,
      environment,
      category,
      description,
      photos,
      urgency,
      preferredPeriod,
    });

    setCreatedProtocol(newTicket.protocol);
    setCreatedTicketId(newTicket.id);
  };

  const handleFinish = () => {
    if (createdTicketId) {
      setSelectedTicketId(createdTicketId);
    }
    setCreatedProtocol(null);
    setCreatedTicketId(null);
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base">Abertura de Chamado de Manutenção</h3>
              <p className="text-xs text-slate-400">
                Preencha em menos de 2 minutos para acionar a imobiliária
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Protocol Screen */}
        {createdProtocol ? (
          <div className="p-8 text-center flex-1 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10" />
            </div>
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-600 mb-1">
              Chamado Aberto com Sucesso!
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 mb-2">
              Protocolo {createdProtocol}
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
              Sua solicitação foi registrada no sistema. A imobiliária e a equipe de manutenção
              foram notificadas e já estão analisando o caso.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 w-full max-w-md text-left mb-6 space-y-2 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="font-medium text-slate-500">Imóvel:</span>
                <span className="font-bold text-slate-900">{address}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-500">Ambiente & Categoria:</span>
                <span className="font-bold text-slate-900">
                  {environment} ({category})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-500">Urgência:</span>
                <span className="font-bold text-rose-600 capitalize">{urgency}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-500">Período Preferencial:</span>
                <span className="font-bold text-slate-900 capitalize">{preferredPeriod}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href={generateWhatsAppLink(
                  tenantPhone,
                  `Olá! Meu chamado de manutenção foi aberto sob o protocolo ${createdProtocol} para o imóvel: ${address}. Descrição: ${description}`
                )}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Notificar Imobiliária via WhatsApp</span>
              </a>

              <button
                onClick={handleFinish}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <span>Acompanhar Chamado na Linha do Tempo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Form Screen */
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
            {/* Quick Demo Helper */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-800 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Dica de Demonstração: </span>
                Os dados já vêm pré-preenchidos para teste rápido. Você pode alterar qualquer
                informação ou apenas clicar em &quot;Criar Chamado&quot;.
              </div>
            </div>

            {/* Tenant Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome do Inquilino *
                </label>
                <input
                  type="text"
                  required
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  WhatsApp / Telefone *
                </label>
                <input
                  type="text"
                  required
                  value={tenantPhone}
                  onChange={(e) => setTenantPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Address & Property */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Endereço do Imóvel *
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tipo de Imóvel
                </label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="apartamento">Apartamento</option>
                  <option value="casa">Casa Residencial</option>
                  <option value="sobrado">Sobrado</option>
                  <option value="comercial">Sala Comercial</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            </div>

            {/* Room & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ambiente onde está o problema *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Cozinha, Banheiro Social, Quarto..."
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Categoria do Problema *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
                >
                  <option value="hidraulica">💧 Hidráulica (Vazamento, Torneira, Sifão)</option>
                  <option value="eletrica">⚡ Elétrica (Chuveiro, Tomada, Disjuntor)</option>
                  <option value="infiltracao">🌧️ Infiltração / Umidade</option>
                  <option value="pintura">🖌️ Pintura / Textura</option>
                  <option value="porta_fechadura">🚪 Portas e Fechaduras</option>
                  <option value="janela">🪟 Janelas e Esquadrias</option>
                  <option value="revestimento_piso">🧱 Revestimentos e Pisos</option>
                  <option value="telhado">🏠 Telhado e Calhas</option>
                  <option value="outro">🔧 Outro Reparo</option>
                </select>
              </div>
            </div>

            {/* Urgency & Preferred Period */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nível de Urgência
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: 'emergencial', label: '🔴 Emergencial', desc: 'Risco iminente' },
                    { val: 'alta', label: '🟠 Alta', desc: 'Prejudica uso' },
                    { val: 'normal', label: '🟡 Normal', desc: 'Sem risco grave' },
                    { val: 'baixa', label: '🟢 Baixa', desc: 'Pode aguardar' },
                  ].map((u) => (
                    <button
                      type="button"
                      key={u.val}
                      onClick={() => setUrgency(u.val as PriorityLevel)}
                      className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                        urgency === u.val
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-1 ring-indigo-500'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold">{u.label}</div>
                      <div className="text-[10px] text-slate-500">{u.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Melhor Período para Atendimento
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { val: 'manha', label: 'Manhã (08h - 12h)' },
                      { val: 'tarde', label: 'Tarde (13h - 18h)' },
                      { val: 'integral', label: 'Horário Comercial' },
                      { val: 'sabado', label: 'Sábado pela Manhã' },
                    ] satisfies { val: PreferredPeriod; label: string }[]
                  ).map((p) => (
                    <button
                      type="button"
                      key={p.val}
                      onClick={() => setPreferredPeriod(p.val)}
                      className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                        preferredPeriod === p.val
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="text-xs">{p.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Descrição Detalhada do Problema *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Descreva exatamente o que está acontecendo (ex: começou após forte chuva, vazamento contínuo, barulho estranho, etc.)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Photos & Videos Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700">
                  Fotos e Vídeos do Problema
                </label>
                <span className="text-[11px] text-slate-400">
                  {photos.length} foto(s) selecionada(s)
                </span>
              </div>

              {/* Preset Sample Photos Bar */}
              <div className="mb-3">
                <span className="text-[11px] text-slate-500 block mb-1.5 font-medium">
                  Ou adicione uma foto de exemplo rápida para teste:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_SAMPLE_PHOTOS.map((sample) => (
                    <button
                      key={sample.label}
                      type="button"
                      onClick={() => setPhotos((prev) => [...prev, sample.url])}
                      className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 font-medium cursor-pointer"
                    >
                      + {sample.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Thumbnails list */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {photos.map((src, idx) => (
                  <div
                    key={idx}
                    className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 group"
                  >
                    <img
                      src={src}
                      alt="Anexo"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <label className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/50 flex flex-col items-center justify-center text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer">
                  <Upload className="w-4 h-4 mb-0.5" />
                  <span className="text-[9px] font-bold">Subir</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {formError && (
              <div
                role="alert"
                className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-700"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm shadow-indigo-200 flex items-center gap-1.5 cursor-pointer"
              >
                <span>Enviar e Gerar Protocolo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
