import { setUploadFunc } from 'openpolotno/config';

let configured = false;

/** One-time OpenPolotno config (local uploads, no Polotno cloud key). */
export function ensurePolotnoConfigured() {
  if (configured) return;
  configured = true;

  setUploadFunc(async (file: File) => {
    return URL.createObjectURL(file);
  });
}
