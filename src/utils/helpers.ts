import {
  TicketStatus,
  PriorityLevel,
  Category,
  PropertyType,
  AppointmentStatus,
  UserRole,
} from '../types';

/**
 * Normaliza texto livre para comparação: minúsculas, sem acento, espaços colapsados.
 * Usado no isolamento de dados, onde endereço e nome de imobiliária ainda são texto livre.
 */
export const normalizeText = (value?: string | null): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Compara dois textos livres por igualdade normalizada.
 * Retorna `false` quando qualquer um dos lados é vazio — ausência de dado nunca é um casamento.
 */
export const sameText = (a?: string | null, b?: string | null): boolean => {
  const left = normalizeText(a);
  const right = normalizeText(b);
  return left.length > 0 && left === right;
};

/** Data no formato ISO `YYYY-MM-DD`, que é como `Appointment.date` é gravado. */
export const toIsoDate = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const ROLE_LABELS: Record<UserRole, string> = {
  inquilino: 'Inquilino',
  imobiliaria: 'Imobiliária',
  empresa: 'Empresa Prestadora',
  prestador: 'Técnico de Campo',
};

export const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val);
};

export const getStatusConfig = (status: TicketStatus) => {
  switch (status) {
    case 'chamado_aberto':
      return {
        label: 'Chamado Aberto',
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'bg-blue-500',
        step: 1,
      };
    case 'em_analise':
      return {
        label: 'Em Análise (Imobiliária)',
        bg: 'bg-purple-50 text-purple-700 border-purple-200',
        dot: 'bg-purple-500',
        step: 2,
      };
    case 'aguardando_vistoria':
      return {
        label: 'Aguardando Vistoria/Parecer',
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
        step: 3,
      };
    case 'orcamento_enviado':
      return {
        label: 'Orçamento Enviado',
        bg: 'bg-orange-50 text-orange-700 border-orange-200',
        dot: 'bg-orange-500',
        step: 4,
      };
    case 'aguardando_aprovacao':
      return {
        label: 'Aguardando Aprovação',
        bg: 'bg-yellow-50 text-yellow-800 border-yellow-200',
        dot: 'bg-yellow-500',
        step: 5,
      };
    case 'orcamento_aprovado':
      return {
        label: 'Orçamento Aprovado',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
        step: 6,
      };
    case 'orcamento_reprovado':
      return {
        label: 'Orçamento Reprovado',
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
        step: 6,
      };
    case 'servico_agendado':
      return {
        label: 'Serviço Agendado',
        bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        dot: 'bg-indigo-500',
        step: 7,
      };
    case 'em_execucao':
      return {
        label: 'Em Execução',
        bg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        dot: 'bg-cyan-500',
        step: 8,
      };
    case 'pendente':
      return {
        label: 'Pendente / Retorno',
        bg: 'bg-amber-50 text-amber-800 border-amber-300',
        dot: 'bg-amber-600',
        step: 9,
      };
    case 'concluido':
      return {
        label: 'Concluído',
        bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        dot: 'bg-emerald-600',
        step: 10,
      };
    case 'cancelado':
      return {
        label: 'Cancelado',
        bg: 'bg-slate-100 text-slate-700 border-slate-300',
        dot: 'bg-slate-500',
        step: 0,
      };
    default:
      return {
        label: status,
        bg: 'bg-slate-100 text-slate-700 border-slate-200',
        dot: 'bg-slate-400',
        step: 1,
      };
  }
};

export const getPriorityConfig = (priority: PriorityLevel) => {
  switch (priority) {
    case 'emergencial':
      return {
        label: 'Emergencial',
        badge: 'bg-rose-600 text-white border-rose-700',
        iconColor: 'text-rose-600',
        glow: 'ring-2 ring-rose-500 ring-offset-1',
        dot: 'bg-rose-600',
      };
    case 'alta':
      return {
        label: 'Alta Prioridade',
        badge: 'bg-orange-500 text-white border-orange-600',
        iconColor: 'text-orange-500',
        glow: '',
        dot: 'bg-orange-500',
      };
    case 'normal':
      return {
        label: 'Normal',
        badge: 'bg-amber-100 text-amber-800 border-amber-300',
        iconColor: 'text-amber-500',
        glow: '',
        dot: 'bg-amber-500',
      };
    case 'baixa':
      return {
        label: 'Baixa Prioridade',
        badge: 'bg-slate-100 text-slate-700 border-slate-300',
        iconColor: 'text-slate-400',
        glow: '',
        dot: 'bg-slate-400',
      };
  }
};

export const getCategoryLabel = (cat: Category): string => {
  switch (cat) {
    case 'eletrica':
      return 'Elétrica';
    case 'hidraulica':
      return 'Hidráulica';
    case 'pintura':
      return 'Pintura';
    case 'infiltracao':
      return 'Infiltração / Umidade';
    case 'porta_fechadura':
      return 'Portas e Fechaduras';
    case 'janela':
      return 'Janelas e Esquadrias';
    case 'revestimento_piso':
      return 'Revestimento e Pisos';
    case 'telhado':
      return 'Telhado e Calhas';
    case 'outro':
      return 'Outro Reparo';
  }
};

export const getPropertyTypeLabel = (type: PropertyType): string => {
  switch (type) {
    case 'apartamento':
      return 'Apartamento';
    case 'casa':
      return 'Casa Residencial';
    case 'sobrado':
      return 'Sobrado';
    case 'comercial':
      return 'Sala / Imóvel Comercial';
    case 'outro':
      return 'Outro';
  }
};

export const getAppointmentStatusConfig = (status: AppointmentStatus) => {
  switch (status) {
    case 'agendado':
      return { label: 'Agendado', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'confirmado':
      return {
        label: 'Confirmado pelo Inquilino',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    case 'aguardando_confirmacao':
      return {
        label: 'Aguardando Inquilino',
        color: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    case 'em_deslocamento':
      return { label: 'Em Deslocamento', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    case 'em_atendimento':
      return { label: 'Em Atendimento', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
    case 'concluido':
      return { label: 'Concluído', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    case 'reagendar':
      return { label: 'Reagendar', color: 'bg-orange-50 text-orange-700 border-orange-200' };
    case 'cancelado':
      return { label: 'Cancelado', color: 'bg-rose-50 text-rose-700 border-rose-200' };
    case 'nao_realizado':
      return { label: 'Não Realizado', color: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
};

export const generateWhatsAppLink = (phone: string, text: string): string => {
  const cleanPhone = phone.replace(/\D/g, '');
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/55${cleanPhone}?text=${encodedText}`;
};
