// Borrador de empleado: valores crudos del form del dialog Agregar Empleado,
// sin validar y sin mapear a Employee, persistido solo en este navegador
// hasta que se complete y se guarde de verdad contra el backend.
export interface EmployeeDraft {
  id: string;
  updatedAt: string;
  formValue: Record<string, any>;
}
