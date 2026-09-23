/**
 * Novedades de cada version publicada, la mas nueva primero.
 *
 * Para anunciar algo en un deploy: subir "version" en package.json, agregar arriba de todo una
 * entrada con esa misma version y `announce: true`. Cada usuario ve el dialogo una sola vez
 * por anuncio (se recuerda en su navegador). Una entrada con `announce: false` queda solo como
 * historial y no muestra nada.
 */
export interface ReleaseHighlight {
  /** Material Symbol. */
  icon: string;
  title: string;
  text: string;
}

export interface ReleaseNote {
  version: string;
  /** dd/mm/aaaa, solo para mostrar. */
  date: string;
  title: string;
  summary: string;
  /** Material Symbol decorativo de la cabecera (por defecto auto_awesome). */
  icon?: string;
  highlights: ReleaseHighlight[];
  /** Boton principal opcional para ir directo a la novedad. */
  cta?: { label: string; route: string };
  announce: boolean;
}

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: '1.1.0',
    date: '23/09/2026',
    title: 'Nuevo: Generador de documentos',
    summary: 'Ahora podés completar formularios desde Fluxenture y obtener el PDF listo, sin salir de la app.',
    icon: 'post_add',
    highlights: [
      {
        icon: 'post_add',
        title: 'Generador de Docs en el menú',
        text: 'La sección SGI ahora es el Generador de documentos: elegí qué documento crear desde un solo lugar.',
      },
      {
        icon: 'falling',
        title: 'Generador SGI',
        text: 'Completá la planilla de análisis de incidentes y descargala en PDF con formato oficial.',
      },
      {
        icon: 'drive_folder_upload',
        title: 'Guardado directo en Documentos',
        text: 'Con un clic el PDF queda guardado en Documentos. El empleado y el tipo se pueden asignar después.',
      },
      {
        icon: 'schedule',
        title: 'Próximamente',
        text: 'Se vienen más documentos generables, como la constancia de entrega de EPP.',
      },
    ],
    cta: { label: 'Probar el Generador', route: '/main/app-pages/doc-generator' },
    announce: true,
  },
];

/** El anuncio vigente: la entrada mas nueva marcada para anunciar. */
export function currentAnnouncement(): ReleaseNote | undefined {
  return RELEASE_NOTES.find(n => n.announce);
}
