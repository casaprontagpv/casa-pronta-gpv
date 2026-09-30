import { supabase } from '../lib/supabase';
import { DataError } from './tickets';
import type { Enums } from '../lib/supabase';

/**
 * Fotos dos chamados.
 *
 * O protótipo guardava base64 dentro do `localStorage` e estourava a cota de
 * ~5 MB do navegador em poucas fotos. Agora vão para um bucket PRIVADO, e o
 * acesso segue exatamente a visibilidade do chamado: quem não enxerga o chamado
 * recebe 4xx do Storage, não a imagem.
 */

export type TipoAnexo = Enums<'attachment_kind'>;

/** Limites do lado do cliente. O bucket também recusa acima de 5 MB. */
export const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024;
export const MAXIMO_POR_ETAPA = 6;
const LADO_MAXIMO = 1600;
const QUALIDADE_JPEG = 0.8;

const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

/**
 * Reduz a imagem antes de subir.
 *
 * Uma foto de celular tem 3–8 MB e 4000 px de lado. Para mostrar um vazamento
 * numa tela, 1600 px bastam — e a diferença é entre 200 KB e 8 MB por foto, em
 * conexão de campo, muitas vezes 4G.
 *
 * O EXIF é descartado no processo, o que é desejável: fotos de celular carregam
 * a geolocalização de onde foram tiradas, e isso é o endereço de alguém.
 */
export const reduzirImagem = async (arquivo: File): Promise<Blob> => {
  const bitmap = await createImageBitmap(arquivo);

  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  const largura = Math.round(bitmap.width * escala);
  const altura = Math.round(bitmap.height * escala);

  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new DataError('Não foi possível processar a imagem neste navegador.');
  }

  ctx.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', QUALIDADE_JPEG)
  );
  if (!blob) throw new DataError('Não foi possível processar a imagem.');
  return blob;
};

export const validarArquivo = (arquivo: File): string | null => {
  if (!TIPOS_ACEITOS.includes(arquivo.type)) {
    return 'Formato não aceito. Envie JPEG, PNG ou WebP.';
  }
  if (arquivo.size > TAMANHO_MAXIMO_BYTES * 4) {
    // Antes da redução; depois dela o arquivo cabe com folga.
    return 'Imagem muito grande. Tente uma foto menor.';
  }
  return null;
};

export interface Anexo {
  id: string;
  ticketId: string;
  kind: TipoAnexo;
  storagePath: string;
  createdAt: string;
}

/**
 * Sobe a foto e registra o anexo.
 *
 * O caminho segue `tickets/<ticket_id>/<uuid>.jpg` porque é dele que as
 * políticas do Storage extraem o chamado para decidir quem pode ler.
 */
export const enviarFoto = async (
  ticketId: string,
  kind: TipoAnexo,
  arquivo: File
): Promise<Anexo> => {
  const problema = validarArquivo(arquivo);
  if (problema) throw new DataError(problema);

  const reduzida = await reduzirImagem(arquivo);
  const caminho = `tickets/${ticketId}/${crypto.randomUUID()}.jpg`;

  const { error: erroUpload } = await supabase.storage
    .from('ticket-photos')
    .upload(caminho, reduzida, { contentType: 'image/jpeg', upsert: false });

  if (erroUpload) {
    throw new DataError(
      erroUpload.message.toLowerCase().includes('row-level security') ||
        erroUpload.message.toLowerCase().includes('unauthorized')
        ? 'Você não tem permissão para anexar fotos a este chamado.'
        : 'Não foi possível enviar a foto. Tente novamente.'
    );
  }

  const { data, error } = await supabase
    .from('attachments')
    .insert({
      ticket_id: ticketId,
      kind,
      storage_path: caminho,
      uploaded_by: (await supabase.auth.getUser()).data.user?.id ?? null,
    })
    .select('id, ticket_id, kind, storage_path, created_at')
    .single();

  if (error || !data) {
    // O arquivo já subiu mas não ficou registrado: sem o registro ele é órfão e
    // ninguém o encontraria. Remover é mais limpo do que deixar lixo no bucket.
    await supabase.storage.from('ticket-photos').remove([caminho]);
    throw new DataError('Foto enviada mas não registrada. Tente de novo.');
  }

  return {
    id: data.id,
    ticketId: data.ticket_id,
    kind: data.kind,
    storagePath: data.storage_path,
    createdAt: data.created_at,
  };
};

export const listarAnexos = async (ticketId: string): Promise<Anexo[]> => {
  const { data, error } = await supabase
    .from('attachments')
    .select('id, ticket_id, kind, storage_path, created_at')
    .eq('ticket_id', ticketId)
    .order('created_at');

  if (error) throw new DataError('Não foi possível carregar as fotos.');

  return (data ?? []).map((a) => ({
    id: a.id,
    ticketId: a.ticket_id,
    kind: a.kind,
    storagePath: a.storage_path,
    createdAt: a.created_at,
  }));
};

/** Uma hora é bastante para ver a foto e curto o suficiente para o link não circular. */
const VALIDADE_SEGUNDOS = 3600;

/**
 * URLs assinadas para exibir as fotos.
 *
 * O bucket é privado: não existe URL pública. Cada exibição pede uma assinatura
 * temporária, e a política do Storage confere se quem pede enxerga o chamado.
 */
export const urlsAssinadas = async (caminhos: string[]): Promise<Record<string, string>> => {
  if (caminhos.length === 0) return {};

  const { data, error } = await supabase.storage
    .from('ticket-photos')
    .createSignedUrls(caminhos, VALIDADE_SEGUNDOS);

  if (error) throw new DataError('Não foi possível carregar as fotos.');

  const mapa: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.signedUrl && item.path) mapa[item.path] = item.signedUrl;
  }
  return mapa;
};

export const removerFoto = async (anexo: Anexo): Promise<void> => {
  const { error } = await supabase.from('attachments').delete().eq('id', anexo.id);
  if (error) throw new DataError('Não foi possível remover a foto.');
  await supabase.storage.from('ticket-photos').remove([anexo.storagePath]);
};
