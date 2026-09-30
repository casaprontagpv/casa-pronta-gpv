import React, { useEffect, useState } from 'react';
import { ImageOff, Loader2 } from 'lucide-react';
import { urlsAssinadas } from '../../data/photos';

interface PhotoGalleryProps {
  /** Caminhos no bucket, não URLs. A assinatura é resolvida aqui. */
  caminhos: string[];
  vazio?: string;
}

/**
 * Exibe fotos de um chamado.
 *
 * Recebe CAMINHOS do Storage e pede a URL assinada na hora de mostrar. O bucket
 * é privado: não existe link permanente, e a assinatura vale uma hora — tempo
 * de ver a foto, curto o bastante para o link não circular por aí.
 */
export const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  caminhos,
  vazio = 'Nenhuma foto anexada.',
}) => {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(false);
  const [ampliada, setAmpliada] = useState<string | null>(null);

  useEffect(() => {
    if (caminhos.length === 0) {
      setUrls({});
      return;
    }
    let ativo = true;
    setCarregando(true);
    setErro(false);

    urlsAssinadas(caminhos)
      .then((mapa) => ativo && setUrls(mapa))
      .catch(() => ativo && setErro(true))
      .finally(() => ativo && setCarregando(false));

    return () => {
      ativo = false;
    };
    // `caminhos` é recriado a cada render pelo mapeador; a chave estável é o conteúdo.
  }, [caminhos.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  if (caminhos.length === 0) {
    return <p className="text-[11px] text-slate-400 italic">{vazio}</p>;
  }

  if (carregando) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-slate-500 py-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Carregando fotos…
      </div>
    );
  }

  if (erro) {
    return (
      <p className="text-[11px] text-amber-700 flex items-center gap-1.5">
        <ImageOff className="w-3.5 h-3.5" />
        Não foi possível carregar as fotos.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {caminhos.map((caminho) => {
          const url = urls[caminho];
          if (!url) return null;
          return (
            <button
              key={caminho}
              type="button"
              onClick={() => setAmpliada(url)}
              className="aspect-square rounded-lg overflow-hidden border border-slate-200 hover:border-indigo-400 transition-colors cursor-pointer"
            >
              <img
                src={url}
                alt="Foto do chamado"
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </button>
          );
        })}
      </div>

      {ampliada && (
        <div
          role="dialog"
          aria-label="Foto ampliada"
          onClick={() => setAmpliada(null)}
          className="fixed inset-0 z-[60] bg-slate-900/85 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img
            src={ampliada}
            alt="Foto do chamado ampliada"
            className="max-w-full max-h-full rounded-xl shadow-2xl"
          />
        </div>
      )}
    </>
  );
};
