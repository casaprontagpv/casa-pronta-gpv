import React, { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogIn,
  Mail,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { homePathForRole } from '../auth/portalRoutes';
import { LoadingScreen } from '../components/LoadingScreen';

/**
 * Entrada única do sistema.
 *
 * O protótipo tinha uma tela de login POR PAPEL, e o usuário escolhia em qual
 * entrar. Agora o papel vem da conta: quem autentica cai no próprio portal, sem
 * escolher nada. Também some o "criar conta" — não há auto-cadastro, quem cria
 * usuário é a administração da Casa Pronta.
 */
export const LoginPage: React.FC = () => {
  const { user, loading, error: authError, signIn } = useAuth();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (loading) return <LoadingScreen label="Verificando sua sessão…" />;

  if (user) {
    const destino = (location.state as { from?: string } | null)?.from;
    return <Navigate to={destino ?? homePathForRole(user.role)} replace />;
  }

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!email.trim() || !senha) {
      setErro('Informe e-mail e senha.');
      return;
    }

    setEnviando(true);
    const res = await signIn(email, senha);
    setEnviando(false);

    if (!res.success) setErro(res.error ?? 'Não foi possível entrar.');
    // Em caso de sucesso o redirecionamento acontece sozinho: `user` deixa de
    // ser nulo e o <Navigate> acima assume.
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
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Entrar</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Use o e-mail cadastrado pela administração. Você será levado ao portal do seu perfil.
            </p>
          </div>

          <form onSubmit={enviar} className="px-6 sm:px-8 py-6 space-y-4">
            {(erro || authError) && (
              <div
                role="alert"
                className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs font-semibold text-rose-700"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
                <span>{erro ?? authError}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@exemplo.com.br"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="senha"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Senha
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={enviando}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              {enviando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>ENTRANDO…</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>ENTRAR</span>
                </>
              )}
            </button>

            <div className="text-center">
              <Link
                to="/recuperar-senha"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                Esqueci minha senha
              </Link>
            </div>
          </form>

          <div className="px-6 sm:px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-px" />
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Não há cadastro aberto. Contas são criadas pela administração da Casa Pronta — fale
              com ela para obter acesso.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
