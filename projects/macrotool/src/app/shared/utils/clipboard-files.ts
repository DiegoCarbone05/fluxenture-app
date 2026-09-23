/**
 * Archivos que trae un evento paste (Ctrl+V): capturas de pantalla / imagenes copiadas y
 * archivos copiados desde el explorador de Windows. Devuelve [] si lo pegado es solo texto,
 * asi el caller puede dejar pasar el paste normal a los inputs.
 */
export function filesFromClipboard(event: ClipboardEvent): File[] {
  const data = event.clipboardData;
  if (!data) return [];

  let files = Array.from(data.files ?? []);
  if (files.length === 0) {
    files = Array.from(data.items ?? [])
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file): file is File => !!file);
  }
  return files.map(renamePastedImage);
}

/**
 * El navegador nombra "image.png" a toda imagen pegada desde el portapapeles (capturas,
 * recortes): se le pone fecha y hora para que la descripcion por defecto (baseNameOf) no
 * quede "image" en todos los documentos.
 */
function renamePastedImage(file: File): File {
  if (!/^image\.\w+$/i.test(file.name)) return file;
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const extension = file.name.split('.').pop();
  return new File([file], `Captura ${stamp}.${extension}`, { type: file.type, lastModified: file.lastModified });
}
