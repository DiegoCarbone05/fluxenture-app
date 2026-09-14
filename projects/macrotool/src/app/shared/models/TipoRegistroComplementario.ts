// Catalogo editable de tipos de RegistroComplementario (Suspension, Dia gremial, Contrato,
// Entrega de EPP, ...). A proposito no es un enum hardcodeado: RRHH tiene que poder dar de alta
// un tipo nuevo sin requerir un deploy (ver context-refactor-documentos.md).
export interface TipoRegistroComplementario {
  id?: string;
  nombre: string;
  activo: boolean;
}
