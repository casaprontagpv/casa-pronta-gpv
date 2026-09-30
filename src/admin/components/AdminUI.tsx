import React from 'react';
import { AlertCircle, CheckCircle2, Copy, Loader2 } from 'lucide-react';

/** Peças compartilhadas pelas abas do painel, para o formulário não ser reescrito quatro vezes. */

export const Campo: React.FC<{
  label: string;
  htmlFor: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}> = ({ label, htmlFor, hint, required, children }) => (
  <div>
    <label
      htmlFor={htmlFor}
      className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
    >
      {label}
      {required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
    {children}
    {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
  </div>
);

export const entradaClasses =
  'w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-hidden disabled:opacity-60';

export const Erro: React.FC<{ mensagem: string | null }> = ({ mensagem }) =>
  mensagem ? (
    <div
      role="alert"
      className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs font-semibold text-rose-700"
    >
      <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
      <span>{mensagem}</span>
    </div>
  ) : null;

export const Sucesso: React.FC<{ mensagem: string | null }> = ({ mensagem }) =>
  mensagem ? (
    <div
      role="status"
      className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-xs font-semibold text-emerald-800"
    >
      <CheckCircle2 className="w-4 h-4 shrink-0 mt-px" />
      <span>{mensagem}</span>
    </div>
  ) : null;

export const BotaoSalvar: React.FC<{ salvando: boolean; children: React.ReactNode }> = ({
  salvando,
  children,
}) => (
  <button
    type="submit"
    disabled={salvando}
    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
  >
    {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
    <span>{salvando ? 'SALVANDO…' : children}</span>
  </button>
);

export const Painel: React.FC<{
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}> = ({ titulo, descricao, children }) => (
  <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
    <header className="px-5 py-4 border-b border-slate-100">
      <h3 className="text-sm font-black text-slate-900">{titulo}</h3>
      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{descricao}</p>
    </header>
    <div className="p-5">{children}</div>
  </section>
);

export const Vazio: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="py-8 text-center text-xs text-slate-400">{children}</p>
);

/**
 * Credencial recém-criada.
 *
 * A senha aparece UMA vez e não fica guardada em lugar nenhum — o banco só tem
 * o hash. Se o admin fechar sem copiar, o caminho é a recuperação por e-mail.
 */
export const CredencialCriada: React.FC<{
  email: string;
  senha?: string;
  convidado?: boolean;
  onFechar: () => void;
}> = ({ email, senha, convidado, onFechar }) => {
  const [copiado, setCopiado] = React.useState(false);

  const copiar = async () => {
    if (!senha) return;
    await navigator.clipboard.writeText(`E-mail: ${email}\nSenha temporária: ${senha}`);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
      <div className="flex items-start gap-2">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-px" />
        <div className="min-w-0">
          <p className="text-xs font-black text-emerald-900">Conta criada</p>
          <p className="text-[11px] text-emerald-800 mt-0.5 break-all">{email}</p>
        </div>
      </div>

      {convidado ? (
        <p className="text-[11px] text-emerald-800 leading-relaxed">
          Um convite foi enviado por e-mail. A pessoa define a própria senha pelo link.
        </p>
      ) : (
        <>
          <div className="p-3 bg-white border border-emerald-200 rounded-xl">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Senha temporária
            </span>
            <code className="text-sm font-mono font-bold text-slate-900 break-all">{senha}</code>
          </div>

          <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5 leading-relaxed">
            <strong>Anote agora.</strong> Esta senha não é recuperável — o sistema guarda apenas o
            hash. Se perder, a pessoa terá de usar &quot;Esqueci minha senha&quot;.
          </p>

          <button
            onClick={() => void copiar()}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            {copiado ? 'Copiado!' : 'Copiar e-mail e senha'}
          </button>
        </>
      )}

      <button
        onClick={onFechar}
        className="w-full py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 rounded-xl cursor-pointer transition-colors"
      >
        Fechar
      </button>
    </div>
  );
};
