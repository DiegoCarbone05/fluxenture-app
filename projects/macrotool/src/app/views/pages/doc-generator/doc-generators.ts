import { Type } from '@angular/core';

/**
 * Documento que se puede generar desde el hub "Generador de documentos".
 * Para sumar uno nuevo (ej. EPP): crear su formulario envuelto en <flux-doc-form-shell>,
 * agregarlo aca con available: true y registrar la plantilla en el back
 * (DocTemplate + resources/doc-templates/<id>.css). La ruta se arma sola en pages.routes.
 */
export interface DocGeneratorDef {
  /** Identificador compartido con el back: POST /doc-generator/{id}/pdf. */
  id: string;
  /** Nombre corto en mayusculas que se muestra en la tarjeta ("SGI", "EPP"). */
  name: string;
  /** Nombre largo del documento, usado de subtitulo en el formulario. */
  description: string;
  /** Material Symbol de la tarjeta. */
  icon: string;
  available: boolean;
  loadComponent?: () => Promise<Type<unknown>>;
}

export const DOC_GENERATORS: DocGeneratorDef[] = [
  {
    id: 'sgi',
    name: 'SGI',
    description: 'Planilla de análisis de incidentes',
    icon: 'falling',
    available: true,
    loadComponent: () => import('./sgi/sgi').then(c => c.Sgi),
  },
  {
    id: 'epp',
    name: 'EPP',
    description: 'Constancia de entrega de EPP',
    icon: 'sanitizer',
    available: false,
  },
  {
    id: 'facturas',
    name: 'Facturas',
    description: 'Facturas de la empresa',
    icon: 'barcode',
    available: false,
  },
];

export function docGeneratorById(id: string): DocGeneratorDef | undefined {
  return DOC_GENERATORS.find(g => g.id === id);
}
