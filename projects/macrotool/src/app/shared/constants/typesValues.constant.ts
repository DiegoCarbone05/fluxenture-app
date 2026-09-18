import { AbsentType } from '../models/Absent.model';
import { ESector } from '../models/Employee';
import { EEmployeeHistoryType } from '../models/EmployeeHistory.model';

export const ABSENT_TYPES = [
  { value: AbsentType.VACATIONS, label: 'Vacaciones' },
  { value: AbsentType.MEDICAL_CERTIFICATE, label: 'Médico' },
  { value: AbsentType.CERTIFICATE, label: 'Certificado' },
  { value: AbsentType.LICENSE, label: 'Licencia' },
  { value: AbsentType.SUSPENSION, label: 'Suspensión' },
  { value: AbsentType.FT, label: 'Feriado Trabajado' },
  { value: AbsentType.DT, label: 'Domingo Trabajado' },
  { value: AbsentType.DG, label: 'Dia Gremial' },
  { value: AbsentType.PG, label: 'Permiso Gremial' },
  { value: AbsentType.DESPIDO, label: 'Despido' },
  { value: AbsentType.RENUNCIA, label: 'Renuncia' },
  { value: AbsentType.FERIADO, label: 'Feriado' },
  { value: AbsentType.ART, label: 'ART' },
  { value: AbsentType.OTHER, label: 'Otro' },
];

// DOC_TYPES ya no existe: los tipos de documento son un catalogo dinamico (ver
// TipoDocumentoService), no una lista fija. Los componentes que antes importaban DOC_TYPES ahora
// leen tipoDocumentoService.activeTipos().

export const EMPLOYEE_HISTORY_TYPES = [
  { value: EEmployeeHistoryType.ONBOARDING, label: 'Alta' },
  { value: EEmployeeHistoryType.OFFBOARDING, label: 'Baja' },
  { value: EEmployeeHistoryType.RESIGNATION, label: 'Renuncia' },
  { value: EEmployeeHistoryType.DISMISSAL, label: 'Despido' },
  { value: EEmployeeHistoryType.SERVICE_CHANGE, label: 'Cambio de Servicio' },
  { value: EEmployeeHistoryType.SHIFT_CHANGE, label: 'Cambio de Turno' },
  { value: EEmployeeHistoryType.OTHER, label: 'Otro' },
];

export const EMPLOYEE_SECTOR = [
  { value: ESector.ADMINISTRATION, label: 'Administracion' },
  { value: ESector.CLEANING_OPERATOR, label: 'Limpieza' },
  { value: ESector.DESMALEZADO, label: 'Desmalezado' },
];

// Nombre legible para cada modulo que puede aparecer en DocUsages.byModule (ver backend DocUsageChecker).
// Sumar un modulo nuevo (Factura, SGI, EPP...) es agregar una entrada aca, nada mas.
export const DOC_USAGE_MODULE_LABELS: Record<string, string> = {
  absent: 'Ausencia',
  employeeHistory: 'Legajo',
  cd: 'CD (TNT)',
  novedad: 'Novedad',
};
