import { handleCreateUser } from '../_lib/createUser';

/**
 * POST /api/admin/users — cria uma conta.
 *
 * Roda no servidor porque usa a `service_role`, que ignora a RLS. A lógica vive
 * em `_lib/createUser.ts` para ser a mesma no servidor de desenvolvimento.
 */
export const config = { runtime: 'edge' };

export default async function handler(request: Request): Promise<Response> {
  return handleCreateUser(request);
}
