import React, { useRef, useState } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { MAXIMO_POR_ETAPA, validarArquivo } from '../../data/photos';

export interface FotoSelecionada {
  arquivo: File;
  /** URL de objeto local, só para a pré-visualização. */
  preview: string;
}

interface PhotoUploaderProps {
  fotos: FotoSelecionada[];
  onChange: (fotos: FotoSelecionada[]) => void;
  label?: string;
  hint?: string;
  desabilitado?: boolean;
}

/**
 * Seleção de fotos, antes do envio.
 *
 * As fotos só sobem quando o formulário é enviado — no caso de um chamado novo,
 * o arquivo precisa do `ticket_id` no caminho, e ele só existe depois que o
 * chamado é criado.
 *
 * `capture="environment"` abre a câmera traseira direto no celular, que é como
 * o técnico usa em campo.
 */
export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  fotos,
  onChange,
  label = 'Fotos',
  hint,
  desabilitado = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);

  const selecionar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivos = Array.from(e.target.files ?? []);
    e.target.value = ''; // permite escolher o mesmo arquivo de novo
    if (arquivos.length === 0) return;

    setErro(null);
    setProcessando(true);

    const espaco = MAXIMO_POR_ETAPA - fotos.length;
    if (espaco <= 0) {
      setErro(`Máximo de ${MAXIMO_POR_ETAPA} fotos.`);
      setProcessando(false);
      return;
    }

    const aceitas: FotoSelecionada[] = [];
    for (const arquivo of arquivos.slice(0, espaco)) {
      const problema = validarArquivo(arquivo);
      if (problema) {
        setErro(problema);
        continue;
      }
      aceitas.push({ arquivo, preview: URL.createObjectURL(arquivo) });
    }

    if (arquivos.length > espaco) {
      setErro(`Só cabem mais ${espaco} foto(s) nesta etapa.`);
    }

    onChange([...fotos, ...aceitas]);
    setProcessando(false);
  };

  const remover = (indice: number) => {
    const alvo = fotos[indice];
    if (alvo) URL.revokeObjectURL(alvo.preview);
    onChange(fotos.filter((_, i) => i !== indice));
  };

  return (
    <div>
      <span className="block text-xs font-bold text-slate-700 mb-1.5">
        {label}
        {fotos.length > 0 && (
          <span className="ml-1 font-normal text-slate-400">
            ({fotos.length}/{MAXIMO_POR_ETAPA})
          </span>
        )}
      </span>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {fotos.map((f, i) => (
          <div
            key={f.preview}
            className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group"
          >
            <img src={f.preview} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => remover(i)}
              aria-label="Remover foto"
              className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/70 text-white hover:bg-rose-600 transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {fotos.length < MAXIMO_POR_ETAPA && (
          <button
            type="button"
            disabled={desabilitado || processando}
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-lg border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/40 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processando ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Camera className="w-5 h-5" />
                <span className="text-[10px] font-bold">Adicionar</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        multiple
        onChange={selecionar}
        className="hidden"
      />

      {hint && !erro && <p className="mt-1.5 text-[11px] text-slate-500">{hint}</p>}
      {erro && (
        <p role="alert" className="mt-1.5 text-[11px] font-semibold text-amber-700">
          {erro}
        </p>
      )}
    </div>
  );
};

/** Libera as URLs de pré-visualização — elas seguram o arquivo em memória. */
export const descartarPreviews = (fotos: FotoSelecionada[]): void => {
  for (const f of fotos) URL.revokeObjectURL(f.preview);
};
