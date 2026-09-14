import { AuditMetadata } from './AuditMetadata';

// "Registro Complementario": catch-all para documentacion general del legajo que no necesita
// procesamiento operativo propio (a diferencia del "Registro Analitico": Ausencia, Historial,
// Track & Trace). Todo Doc que no cuelgue de uno de esos tres modulos tiene que colgar de uno de
// estos - ver context-refactor-documentos.md.
export interface RegistroComplementario {
  id?: string;
  employeeId: string;
  tipoId: string;
  docId: string;
  fechaCarga?: string;
  observaciones?: string;
  audit?: AuditMetadata;
}
