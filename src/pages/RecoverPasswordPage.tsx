import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, Mail, Wrench } from 'lucide-react';
import { useAuth } from '../auth/useAuth';

/**
 * Pedido de recuperação de senha.
 *
 * A resposta é sempre a mesma, exista ou não conta com aquele e-mail. Confirmar
 * que um endereço está cadastrado entregaria uma lista de usuários válidos a
 * quem estivesse sondando.
 */
export const RecoverPasswordPage: React.FC = () => {
  const { requestPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!email.trim()) {
      setErro('Informe seu e-mail.');
      return;
    }

    setEnviando(true);
    const res = await requestPasswordReset(email);
    setEnviando(false);

    if (res.success) setEnviado(true);
    else setErro(res.error ?? 'Não foi possível enviar agora.');
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
          {enviado ? (
            <div className="px-6 sm:px-8 py-8 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h2 className="text-lg font-black text-slate-900">Verifique seu e-mail</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Se houver uma conta para <strong>{email.trim().toLowerCase()}</strong>, enviamos um
                link para definir uma nova senha. Ele vale por uma hora.
              </p>
              <p className="text-[11px] text-slate-500">
                Não chegou? Confira a caixa de spam antes de tentar de novo.
              </p>
            </div>
          ) : (
            <>
              <div className="px-6 sm:px-8 pt-7 pb-5 border-b border-slate-100">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Recuperar senha
                </h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Informe seu e-mail e enviaremos um link para você definir uma nova senha.
                </p>
              </div>

              <form onSubmit={enviar} className="px-6 sm:px-8 py-6 space-y-4">
                {erro && (
                  <div
                    role="alert"
                    className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700"
                  >
                    {erro}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="email-recuperacao"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="email-recuperacao"
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

                <button
                  type="submit"
                  disabled={enviando}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  {enviando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>ENVIANDO…</span>
                    </>
                  ) : (
                    <span>ENVIAR LINK DE RECUPERAÇÃO</span>
                  )}
                </button>
              </form>
            </>
          )}

          <div className="px-6 sm:px-8 py-4 bg-slate-50 border-t border-slate-100 text-center">
            <Link
              to="/login"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
