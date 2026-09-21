import React, { useState } from 'react';
import { useApp } from '../context/useApp';
import { UserRole } from '../types';
import {
  Home,
  Building2,
  Wrench,
  UserCheck,
  Lock,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  Mail,
  KeyRound,
  Phone,
} from 'lucide-react';

interface LoginPortalProps {
  targetRole: UserRole;
  onSuccess?: () => void;
}

export const LoginPortal: React.FC<LoginPortalProps> = ({ targetRole, onSuccess }) => {
  const { login, registerUser, switchUser, allUsers } = useApp();

  // Mode: 'login' | 'register'
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login form states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register form states
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [regRole, setRegRole] = useState<UserRole>(targetRole);
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regUnit, setRegUnit] = useState('');
  const [regAgencyName, setRegAgencyName] = useState('');
  const [regCnpj, setRegCnpj] = useState('');

  // UI status
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Preset users filtered for current tab
  const rolePresets = allUsers.filter((u) => u.role === targetRole);

  // Handle Login submission
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMsg('Por favor, informe seu e-mail cadastrado ou código de acesso.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    setTimeout(() => {
      const res = login(identifier, password);
      setIsLoading(false);
      if (res.success) {
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(
          res.error || 'Credenciais não encontradas. Verifique a senha ou crie uma conta.'
        );
      }
    }, 250);
  };

  // Handle Registration submission
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!regName.trim()) {
      setErrorMsg('Por favor, digite seu nome completo.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setErrorMsg('Por favor, informe um endereço de e-mail válido.');
      return;
    }
    if (!regPassword || regPassword.length < 3) {
      setErrorMsg('A senha deve ter pelo menos 3 caracteres.');
      return;
    }
    if (regPassword !== regPasswordConfirm) {
      setErrorMsg('A confirmação de senha não coincide com a senha digitada.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const res = registerUser({
        name: regName,
        email: regEmail,
        password: regPassword,
        role: regRole,
        phone: regPhone || '(11) 98000-0000',
        propertyAddress: regAddress || undefined,
        propertyUnit: regUnit || undefined,
        agencyName: regAgencyName || undefined,
        cnpj: regCnpj || undefined,
      });

      setIsLoading(false);

      if (res.success) {
        setSuccessMsg('Cadastro criado com sucesso! Entrando...');
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 500);
      } else {
        setErrorMsg(res.error || 'Erro ao realizar cadastro.');
      }
    }, 300);
  };

  const handleQuickLogin = (userId: string) => {
    switchUser(userId);
    if (onSuccess) onSuccess();
  };

  const getRoleHeader = () => {
    switch (targetRole) {
      case 'inquilino':
        return {
          title: 'Área do Inquilino & Morador',
          subtitle:
            'Acesso exclusivo para abrir e acompanhar chamados de manutenção para a sua residência.',
          badge: 'Acesso do Morador',
          icon: Home,
          iconBg: 'bg-emerald-600',
          accentColor: 'text-emerald-700',
          borderColor: 'border-emerald-200',
          bgColor: 'bg-emerald-50/50',
          securityNote:
            'Isolamento de Dados: Você visualiza estritamente os chamados e informações do seu imóvel, garantindo total privacidade.',
        };
      case 'imobiliaria':
        return {
          title: 'Portal da Imobiliária',
          subtitle:
            'Acompanhamento, aprovação de orçamentos e vistorias dos imóveis sob administração da sua carteira.',
          badge: 'Imobiliária Credenciada',
          icon: Building2,
          iconBg: 'bg-purple-600',
          accentColor: 'text-purple-700',
          borderColor: 'border-purple-200',
          bgColor: 'bg-purple-50/50',
          securityNote:
            'Acesso Restrito: Sua imobiliária tem visualização restrita aos contratos e imóveis sob sua gestão.',
        };
      case 'empresa':
        return {
          title: 'Central Operacional Casa Pronta',
          subtitle:
            'Coordenação técnica de manutenções, faturamento de serviços, despacho de equipes e rotas.',
          badge: 'Administração & Faturamento',
          icon: Wrench,
          iconBg: 'bg-indigo-600',
          accentColor: 'text-indigo-700',
          borderColor: 'border-indigo-200',
          bgColor: 'bg-indigo-50/50',
          securityNote:
            'Área Restrita à Empresa Prestadora: Apenas operadores autorizados e administradores têm acesso a faturamentos globais.',
        };
      case 'prestador':
        return {
          title: 'Modo Técnico de Campo',
          subtitle:
            'Visão simplificada para execução de serviços, fotos de laudos, rotas GPS e finalização.',
          badge: 'Técnico Credenciado',
          icon: UserCheck,
          iconBg: 'bg-cyan-600',
          accentColor: 'text-cyan-700',
          borderColor: 'border-cyan-200',
          bgColor: 'bg-cyan-50/50',
          securityNote: 'Modo Campo: Apenas manutenções atribuídas à sua equipe técnica para hoje.',
        };
    }
  };

  const headerInfo = getRoleHeader();
  const Icon = headerInfo.icon;

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Top Header Card */}
        <div className={`p-6 sm:p-8 ${headerInfo.bgColor} border-b ${headerInfo.borderColor}`}>
          <div className="flex items-center gap-3 mb-3">
            <div
              className={`w-12 h-12 rounded-2xl ${headerInfo.iconBg} text-white flex items-center justify-center shadow-md shrink-0`}
            >
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <span
                className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white border ${headerInfo.borderColor} ${headerInfo.accentColor} inline-block mb-1`}
              >
                {headerInfo.badge}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {headerInfo.title}
              </h2>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{headerInfo.subtitle}</p>

          <div className="mt-4 p-3 bg-white/90 border border-slate-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-slate-600 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">{headerInfo.securityNote}</p>
          </div>
        </div>

        {/* Tab Selector: Entrar vs Criar Conta */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              authMode === 'login'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LogIn className="w-4 h-4 text-indigo-600" />
            <span>Entrar com Login</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setRegRole(targetRole);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              authMode === 'register'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-4 h-4 text-emerald-600" />
            <span>Criar Nova Conta</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Status Messages */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-700 font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* MODE 1: LOGIN */}
          {authMode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {targetRole === 'inquilino'
                    ? 'E-mail ou Código do Imóvel'
                    : targetRole === 'imobiliaria'
                      ? 'E-mail ou CNPJ da Imobiliária'
                      : 'E-mail de Operador ou Técnico'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={
                      targetRole === 'inquilino'
                        ? 'mariana.costa@email.com ou IMOV-402'
                        : targetRole === 'imobiliaria'
                          ? 'gestao@aliancaimoveis.com.br'
                          : 'admin@casapronta.com.br'
                    }
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-hidden transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Senha
                  </label>
                  <span className="text-[11px] text-slate-400">Padrão demo: 123</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-hidden transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 ${headerInfo.iconBg} hover:opacity-90 active:opacity-100 text-white rounded-xl text-xs font-black tracking-wide shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all`}
              >
                {isLoading ? (
                  <span>Autenticando...</span>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Entrar no Sistema</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setErrorMsg('');
                  }}
                  className="text-xs text-indigo-600 hover:underline font-bold cursor-pointer"
                >
                  Não tem uma conta? Crie seu login e senha agora
                </button>
              </div>
            </form>
          ) : (
            /* MODE 2: REGISTER NEW ACCOUNT */
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl text-xs text-indigo-900 space-y-1">
                <span className="font-bold block flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                  Criando nova conta de acesso
                </span>
                <p className="text-[11px] text-slate-600">
                  Cadastre seus dados para receber notificações, abrir solicitações e acompanhar
                  manutenções em tempo real.
                </p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo Silva"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  E-mail de Acesso *
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="carlos.silva@email.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Role Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tipo de Perfil *
                </label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="inquilino">👤 Inquilino / Morador</option>
                  <option value="imobiliaria">🏢 Imobiliária Parceira</option>
                  <option value="empresa">🛠️ Empresa Prestadora (Casa Pronta)</option>
                  <option value="prestador">🧰 Técnico de Campo</option>
                </select>
              </div>

              {/* Conditional fields based on role */}
              {regRole === 'inquilino' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Endereço do Imóvel
                    </label>
                    <input
                      type="text"
                      value={regAddress}
                      onChange={(e) => setRegAddress(e.target.value)}
                      placeholder="Ex: Rua das Flores, 120"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Unidade / Apartamento
                    </label>
                    <input
                      type="text"
                      value={regUnit}
                      onChange={(e) => setRegUnit(e.target.value)}
                      placeholder="Ex: Apto 302"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                </div>
              )}

              {regRole === 'imobiliaria' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Nome da Imobiliária
                    </label>
                    <input
                      type="text"
                      value={regAgencyName}
                      onChange={(e) => setRegAgencyName(e.target.value)}
                      placeholder="Ex: Imobiliária Horizonte"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">CNPJ</label>
                    <input
                      type="text"
                      value={regCnpj}
                      onChange={(e) => setRegCnpj(e.target.value)}
                      placeholder="00.000.000/0001-00"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Password & Confirm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Criar Senha *
                  </label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Mínimo 3 dígitos"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Confirmar Senha *
                  </label>
                  <input
                    type="password"
                    required
                    value={regPasswordConfirm}
                    onChange={(e) => setRegPasswordConfirm(e.target.value)}
                    placeholder="Repita a senha"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Telefone / WhatsApp (Opcional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-black tracking-wide shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {isLoading ? (
                  <span>Criando conta...</span>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Cadastrar Minha Conta e Entrar</span>
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMsg('');
                  }}
                  className="text-xs text-indigo-600 hover:underline font-bold cursor-pointer"
                >
                  Já tem uma conta cadastrada? Fazer login
                </button>
              </div>
            </form>
          )}

          {/* Quick Demo Access Buttons (1-Click) */}
          <div className="pt-5 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Usuários de Teste Rápidos (1 Clique)
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Contas pré-carregadas</span>
            </div>

            <div className="space-y-2">
              {rolePresets.slice(0, 3).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleQuickLogin(preset.id)}
                  className="w-full text-left p-3 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                        {preset.name}
                      </span>
                      {preset.propertyUnit && (
                        <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold shrink-0">
                          {preset.propertyUnit}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{preset.email}</p>
                  </div>

                  <span className="px-3 py-1.5 bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white rounded-xl text-[11px] font-bold text-slate-700 transition-all shrink-0">
                    Acessar
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
