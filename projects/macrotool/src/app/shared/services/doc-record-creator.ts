import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { Doc } from '../models/Doc';

// "Crear un registro a partir de este documento" (Ausencia, CD, y lo que se sume despues:
// Factura, SGI, EPP...). Cada modulo implementa esto y se registra como multi-provider en
// main.ts - Documentos no conoce a ninguno en particular, solo los recorre y filtra por isCompatible.
export interface DocRecordCreator {
    id: string;
    label: string;
    icon: string;
    isCompatible(doc: Doc): boolean;
    /** Abre el dialog de alta correspondiente. Emite el registro creado (o undefined si se cancelo) al cerrarse. */
    create(doc: Doc): Observable<any>;
}

export const DOC_RECORD_CREATORS = new InjectionToken<DocRecordCreator[]>('DOC_RECORD_CREATORS');
