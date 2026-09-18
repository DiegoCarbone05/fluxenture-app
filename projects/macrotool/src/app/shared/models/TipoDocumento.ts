// Catalogo de tipos de Documento. Reemplaza al viejo enum EDocType: el equipo tiene que poder
// dar de alta un tipo nuevo (Firma Digital, actas SGI, Facturas...) sin requerir un deploy. No
// hay tipos "reservados" - todos, incluidos los migrados del viejo enum, son iguales y editables.
export interface TipoDocumento {
  id?: string;
  nombre: string;
  activo: boolean;
}
