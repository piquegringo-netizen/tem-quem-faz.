import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ImagePlus, Loader2, X } from 'lucide-react';
import { prepareAvatar } from '@/lib/avatarImage';

/** Compressed photo ready for upload. */
export interface PickedPhoto {
  blob: Blob;
  path: string;
}

interface PhotoPickerProps {
  label: string;
  photoUrl: string | null;
  fallbackName: string;
  onPhoto: (photo: PickedPhoto | null) => void;
  onRemove: () => void;
  disabled?: boolean;
}

/** Round photo picker with instant local preview; upload happens on submit. */
export default function PhotoPicker({ label, photoUrl, fallbackName, onPhoto, onRemove, disabled = false }: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(photoUrl);
  const [localError, setLocalError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    setPreview(photoUrl);
    setReady(false);
  }, [photoUrl]);

  function clearInput() {
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    clearInput();
    if (!file) return;

    setLocalError(null);
    setProcessing(true);
    try {
      const prepared = await prepareAvatar(file);
      const objectUrl = URL.createObjectURL(prepared.blob);
      setPreview((prev) => {
        if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
        return objectUrl;
      });
      setReady(true);
      onPhoto({ blob: prepared.blob, path: prepared.path });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Não foi possível usar esta foto.');
    } finally {
      setProcessing(false);
    }
  }

  function handleRemove() {
    setPreview((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return null;
    });
    setReady(false);
    setLocalError(null);
    onRemove();
  }

  const initials = fallbackName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || '?';

  return (
    <div className="space-y-2">
      <span className="block text-sm font-semibold text-ink/80">{label}</span>
      <div className="flex items-center gap-4 rounded-2xl bg-paper/70 p-4">
        <div className="relative h-20 w-20 shrink-0">
          {preview ? (
            <img
              src={preview}
              alt="Foto escolhida"
              className="h-20 w-20 rounded-full object-cover ring-4 ring-white shadow-soft"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-mustard to-mustard-dark font-display text-2xl text-ink ring-4 ring-white shadow-soft"
            >
              {initials}
            </div>
          )}
          {processing && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/40">
              <Loader2 className="h-6 w-6 animate-spin text-white" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || processing}
              className="flex items-center gap-2 rounded-xl border-2 border-petrol bg-white px-4 py-2 text-sm font-semibold text-petrol transition hover:bg-petrol/5 disabled:opacity-60"
            >
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
              {preview ? 'Trocar foto' : 'Enviar foto'}
            </button>
            {preview && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled || processing}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-rust-dark transition hover:bg-rust/5 disabled:opacity-60"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Remover
              </button>
            )}
          </div>
          {ready ? (
            <p className="flex items-center gap-1 text-xs font-semibold text-whatsapp">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Foto pronta!
            </p>
          ) : (
            <p className="text-xs text-ink/60">JPG, PNG ou WebP, até 10MB. Ajustamos o tamanho para você.</p>
          )}
          {localError && <p className="text-xs font-medium text-rust-dark">{localError}</p>}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
