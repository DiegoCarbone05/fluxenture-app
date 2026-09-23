/**
 * "Congela" un formulario HTML para mandarlo a generar como PDF en el back.
 *
 * Los valores tipeados viven en las propiedades de los inputs, no en el HTML, asi que se
 * clona el arbol y cada control se reemplaza por un elemento estatico con su valor:
 *   - input de texto/fecha/numero -> <span class="field">valor</span>
 *   - textarea                    -> <div class="field field-area">valor</div>
 *   - checkbox / radio            -> <span class="cb [cb-on]">X</span>
 *   - select                      -> <span class="field">opcion elegida</span>
 * Las imagenes se embeben como data: (el back no descarga recursos remotos) y todo lo
 * marcado con [data-no-print] o que sea un boton se descarta. El estilo lo pone el back
 * segun la plantilla, asi que de aca solo importan la estructura y las clases.
 */
export async function snapshotForm(root: HTMLElement): Promise<string> {
  const clone = root.cloneNode(true) as HTMLElement;

  const originals = root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select');
  const copies = clone.querySelectorAll<HTMLElement>('input, textarea, select');
  originals.forEach((original, i) => copies[i].replaceWith(staticControl(original)));

  clone.querySelectorAll('button, script, [data-no-print]').forEach(el => el.remove());

  await Promise.all(Array.from(clone.querySelectorAll('img')).map(async img => {
    const dataUri = await toDataUri(img.src).catch(() => null);
    if (dataUri) img.setAttribute('src', dataUri);
    else img.remove();
  }));

  return clone.outerHTML;
}

function staticControl(control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): HTMLElement {
  if (control instanceof HTMLInputElement && (control.type === 'checkbox' || control.type === 'radio')) {
    const box = document.createElement('span');
    box.className = control.checked ? 'cb cb-on' : 'cb';
    box.textContent = control.checked ? 'X' : '';
    return box;
  }

  if (control instanceof HTMLTextAreaElement) {
    const area = document.createElement('div');
    area.className = 'field field-area';
    area.textContent = control.value;
    return area;
  }

  const field = document.createElement('span');
  field.className = 'field';
  if (control instanceof HTMLSelectElement) {
    field.textContent = control.selectedOptions[0]?.text ?? '';
  } else if (control.type === 'date' && control.value) {
    const [y, m, d] = control.value.split('-');
    field.textContent = `${d}/${m}/${y}`;
  } else {
    field.textContent = control.value;
  }
  return field;
}

async function toDataUri(src: string): Promise<string> {
  const blob = await fetch(src).then(r => {
    if (!r.ok) throw new Error(`No se pudo leer ${src}`);
    return r.blob();
  });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
