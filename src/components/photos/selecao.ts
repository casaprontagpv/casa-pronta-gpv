/**
 * Fotos escolhidas mas ainda não enviadas.
 *
 * Arquivo próprio, e não dentro de `PhotoUploader.tsx`, por causa do Fast
 * Refresh: um módulo que exporta componente E função perde a atualização a
 * quente durante o desenvolvimento. É a mesma razão de `context/useApp.ts`.
 */

export interface FotoSelecionada {
  arquivo: File;
  /** URL de objeto local, só para a pré-visualização. */
  preview: string;
}

/** Libera as URLs de pré-visualização — elas seguram o arquivo em memória. */
export const descartarPreviews = (fotos: FotoSelecionada[]): void => {
  for (const f of fotos) URL.revokeObjectURL(f.preview);
};
