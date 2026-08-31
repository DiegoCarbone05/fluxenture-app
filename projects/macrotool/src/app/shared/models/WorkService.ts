import { AuditMetadata } from './AuditMetadata';

/**
 * Servicio (u objetivo) al que se asigna un empleado: el cliente para el que trabaja.
 * El empleado guarda el NOMBRE, no el id, asi que renombrar es una operacion del
 * backend que arrastra a todos los empleados (ver WorkServicesService.rename).
 */
export interface WorkService {
  id: string;
  name: string;
  active: boolean;
  audit?: AuditMetadata;
}
