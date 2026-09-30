import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, KeyRound, Loader2, Wrench } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { homePathForRole } from '../auth/portalRoutes';
import { LoadingScreen } from '../components/LoadingScreen';

/** Comprimento mínimo. Igual ao configurado no Supabase Auth. */
const MIN_SENHA = 8;

/**
 * Definição de nova senha.
 *
 * Alcançada por duas portas: o link de recuperação enviado por e-mail (o
 * Supabase troca o token do hash por uma sessão automaticamente, por isso
 * `detectSessionInUrl`) e o menu do usuário já autenticado.
 */
export const NewPasswordPage: React.FC = () => {
  const { user, loading, updatePassword } = useAuth();
  const navigate = useNavigate();

  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  if (loading) return <LoadingScreen label="Validando o link…" />;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (senha.length < MIN_SENHA) {
      setErro(`A senha precisa ter ao menos ${MIN_SENHA} caracteres.`);
      return;
    }
    if (senha !== confirmacao) {
      setErro('A confirmação não coincide com a senha digitada.');
      return;
    }

    setSalvando(true);
    const res = await updatePassword(senha);
    setSalvando(false);

    if (!res.success) {
      setErro(res.error ?? 'Não foi possível alterar a senha.');
      return;
    }

    navigate(user ? homePathForRole(user.role) : '/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
            <Wrench className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none">
              Casa Pronta
            </h1>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Gestão de Manutenções</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="px-6 sm:px-8 pt-7 pb-5 border-b border-slate-100">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Definir nova senha</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Escolha uma senha de pelo menos {MIN_SENHA} caracteres que você não use em outro
              serviço.
            </p>
          </div>

          {!user ? (
            <div className="px-6 sm:px-8 py-8 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">Link inválido ou expirado</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                O link de recuperação vale por uma hora e só pode ser usado uma vez. Peça um novo em
                &quot;Esqueci minha senha&quot;.
              </p>
              <button
                onClick={() => navigate('/recuperar-senha')}
                className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Pedir novo link
              </button>
            </div>
          ) : (
            <form onSubmit={enviar} className="px-6 sm:px-8 py-6 space-y-4">
              {erro && (
                <div
                  role="alert"
                  className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs font-semibold text-rose-700"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
                  <span>{erro}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="nova-senha"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Nova senha
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="nova-senha"
                    type={mostrar ? 'text' : 'password'}
                    autoComplete="new-password"
                    autoFocus
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrar((v) => !v)}
                    aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {mostrar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmar-senha"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Confirmar nova senha
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="confirmar-senha"
                    type={mostrar ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmacao}
                    onChange={(e) => setConfirmacao(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={salvando}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                {salvando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>SALVANDO…</span>
                  </>
                ) : (
                  <span>SALVAR NOVA SENHA</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
