import { adminClient, erroParaResposta, exigirEmpresa, json } from './adminAuth';

/**
 * Criação de usuário — o único caminho de entrada de gente no sistema.
 *
 * Não há auto-cadastro (`enable_signup = false` no config.toml). Toda conta
 * nasce aqui, criada pela central, com o papel definido por ela.
 */

const PAPEIS = ['inquilino', 'imobiliaria', 'empresa', 'prestador'] as const;
type Papel = (typeof PAPEIS)[number];

export interface NovoUsuario {
  name: string;
  email: string;
  role: Papel;
  phone?: string;
  /** `true` envia convite por e-mail; `false` devolve uma senha temporária. */
  sendInvite?: boolean;
}

/**
 * Senha temporária legível ao telefone — o admin costuma passar por WhatsApp.
 *
 * Sem caracteres ambíguos (O/0, l/1/I) para não gerar erro de digitação.
 * `crypto.getRandomValues` e não `Math.random`: senha previsível não é senha.
 */
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789abcdefghijkmnpqrstuvwxyz';

export const gerarSenhaTemporaria = (tamanho = 14): string => {
  const bytes = new Uint32Array(tamanho);
  crypto.getRandomValues(bytes);
  // O módulo enviesa levemente as primeiras letras do alfabeto. Para uma senha
  // temporária de 14 caracteres desse conjunto o efeito é desprezível ante os
  // ~80 bits de entropia; ela ainda é trocada no primeiro acesso.
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('');
};

const ehEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

export const validarNovoUsuario = (
  body: unknown
): { ok: true; dados: NovoUsuario } | { ok: false; erro: string } => {
  if (typeof body !== 'object' || body === null) return { ok: false, erro: 'Corpo inválido.' };

  const b = body as Record<string, unknown>;
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
  const role = b.role;
  const phone = typeof b.phone === 'string' ? b.phone.trim() : undefined;

  if (name.length < 2) return { ok: false, erro: 'Informe o nome completo.' };
  if (!ehEmail(email)) return { ok: false, erro: 'Informe um e-mail válido.' };
  if (typeof role !== 'string' || !PAPEIS.includes(role as Papel)) {
    return { ok: false, erro: 'Papel inválido.' };
  }

  return {
    ok: true,
    dados: {
      name,
      email,
      role: role as Papel,
      phone: phone || undefined,
      sendInvite: b.sendInvite === true,
    },
  };
};

/**
 * Handler agnóstico de framework.
 *
 * Fica separado do arquivo que a Vercel expõe para poder ser montado também no
 * servidor de desenvolvimento do Vite — assim o mesmo código é exercitado nos
 * dois ambientes, em vez de existir uma versão "de mentira" para o local.
 */
export const handleCreateUser = async (request: Request): Promise<Response> => {
  try {
    if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

    const chamador = await exigirEmpresa(request.headers.get('authorization'));

    const validacao = validarNovoUsuario(await request.json().catch(() => null));
    if (!validacao.ok) return json({ error: validacao.erro }, 400);

    const { name, email, role, phone, sendInvite } = validacao.dados;
    const admin = adminClient();

    // O trigger `on_auth_user_created` cria o profile a partir destes metadados.
    const metadata = { name, role, ...(phone ? { phone } : {}) };

    if (sendInvite) {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        data: metadata,
      });
      if (error) {
        return json({ error: traduzirErro(error.message) }, 400);
      }
      console.info(`[admin] ${chamador.email} convidou ${email} como ${role}`);
      return json({ userId: data.user?.id, email, invited: true }, 201);
    }

    const senhaTemporaria = gerarSenhaTemporaria();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: senhaTemporaria,
      // Sem confirmação por e-mail: quem cria a conta é a central, que já sabe
      // quem é a pessoa. O acesso chega pelo canal que ela escolher.
      email_confirm: true,
      user_metadata: metadata,
    });

    if (error) return json({ error: traduzirErro(error.message) }, 400);

    console.info(`[admin] ${chamador.email} criou ${email} como ${role}`);

    // A senha é devolvida UMA vez, para o admin copiar. Não fica armazenada em
    // lugar nenhum: o que o banco guarda é o hash.
    return json({ userId: data.user?.id, email, temporaryPassword: senhaTemporaria }, 201);
  } catch (err) {
    return erroParaResposta(err);
  }
};

const traduzirErro = (message: string): string => {
  const m = message.toLowerCase();
  if (m.includes('already been registered') || m.includes('already exists')) {
    return 'Já existe uma conta com este e-mail.';
  }
  if (m.includes('invalid email')) return 'E-mail inválido.';
  if (m.includes('rate limit')) return 'Muitas criações seguidas. Aguarde um minuto.';
  return 'Não foi possível criar a conta. Verifique os dados e tente novamente.';
};
