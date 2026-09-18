/**
 * Colores por tipo de documento para FluxFileIcon — los mismos pares que ya existen en
 * docs.scss (.dtype-*), copiados 1:1 para no depender de clases CSS desde un componente.
 * Agregar o sacar un color es editar una linea de este mapa; cualquier tipo (viejo o creado
 * por el usuario) que no este aca cae en DEFAULT_DOC_TYPE_COLOR — nunca queda roto.
 */
export interface DocTypeColor {
  bg: string;
  fg: string;
}

export const DEFAULT_DOC_TYPE_COLOR: DocTypeColor = { bg: '#ebebeb', fg: '#828282' };

export const DOC_TYPE_COLORS: Record<string, DocTypeColor> = {
  MEDICAL_CERTIFICATE: { bg: '#ecf2fd', fg: '#3d7dc7' },
  CERTIFICATE: { bg: '#ecf2fd', fg: '#3d7dc7' },
  VACATIONS: { bg: '#d2f0e4', fg: '#0ead6d' },
  SUSPENSION: { bg: '#f3e597', fg: '#655814' },
  LICENSE: { bg: '#d2eff0', fg: '#0ea8ad' },
  DG: DEFAULT_DOC_TYPE_COLOR,
  PG: DEFAULT_DOC_TYPE_COLOR,
  OTHER: DEFAULT_DOC_TYPE_COLOR,
  CD: { bg: '#ffe4c4', fg: '#a35200' },
  EPP: { bg: '#d2ffc9', fg: '#1d5f0e' },
  TELEGRAMA: { bg: '#e8d5f0', fg: '#6b1d9e' },
  ALTA_AFIP: { bg: '#d0e8f0', fg: '#0e5e8a' },
  BAJA_AFIP: { bg: '#f0d2d2', fg: '#ad0e0e' },
  PREOCUPACIONAL: { bg: '#d2eff0', fg: '#0ea8ad' },
  APERCIBIMIENTO: { bg: '#f0d2d2', fg: '#ad0e0e' },
  ART: { bg: '#f0eee5', fg: '#877a31' },
  NOTIFICATION: { bg: '#e0e0f8', fg: '#3f3fd4' },
  RECEIPT: { bg: '#d2e8f0', fg: '#0e5e8a' },
  INCOME: { bg: '#d2ffc9', fg: '#1d5f0e' },
};

export function colorForType(typeId: string | undefined): DocTypeColor {
  if (!typeId) return DEFAULT_DOC_TYPE_COLOR;
  return DOC_TYPE_COLORS[typeId] ?? DEFAULT_DOC_TYPE_COLOR;
}

/**
 * Tipos que en FluxFileIcon se muestran igual que "sin tipo" — icono grande con la
 * extension (PDF, JPG...) en vez de la abreviatura del tipo, para dar a entender que es
 * simplemente un archivo genérico. Hoy solo el "Otro" heredado (id OTHER, ver
 * TipoDocumentoSeeder). Agregar/sacar un id de este set no requiere tocar el componente.
 */
export const GENERIC_FILE_TYPE_IDS = new Set<string>(['OTHER']);

export function isGenericFileType(typeId: string | undefined): boolean {
  return !!typeId && GENERIC_FILE_TYPE_IDS.has(typeId);
}
