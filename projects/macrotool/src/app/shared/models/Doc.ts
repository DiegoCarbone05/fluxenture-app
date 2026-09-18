import { AuditMetadata } from "./AuditMetadata";

export class Doc {
    id?: string;
    // Dueño del documento. Hoy siempre un empleado; empresaId queda reservado para cuando
    // WorkService (el "cliente" del empleado) se convierta en una entidad Empresa propia y los
    // documentos de facturacion puedan colgar de ahi en vez de un empleado.
    employeeId?: string;
    empresaId?: string;
    // Id de un TipoDocumento (catalogo dinamico, ver TipoDocumentoService — ya no es un enum, no
    // hay tipos reservados). El enum EDocType se mantiene mas abajo solo como set de constantes
    // para las comparaciones que el codigo todavia hace por valor exacto (EDocType.CD, etc.).
    // Opcional: un documento puede subirse sin tipo asignado (explorador de archivos).
    type?: string;
    driveFileId: string;
    uploadDate: Date;
    description?: string;
    // Extension del archivo original (pdf, jpg, docx, ...), sin el punto, en minusculas. Se
    // calcula del nombre del archivo al momento de subirlo (ver AddDocDialog#onSave). Los Doc
    // cargados antes de este campo no lo tienen.
    extension?: string;
    audit?: AuditMetadata;

    constructor(employeeId: string | undefined, type: string | undefined, driveFileId: string, uploadDate: Date, id?: string, description?: string, extension?: string) {
        this.id = id;
        this.employeeId = employeeId;
        this.type = type;
        this.driveFileId = driveFileId;
        this.uploadDate = uploadDate;
        this.description = description;
        this.extension = extension;
    }
}

/** Extension (sin punto, minusculas) a partir del nombre de archivo, o undefined si no tiene. */
export function extensionOf(fileName: string | undefined | null): string | undefined {
    if (!fileName) return undefined;
    const parts = fileName.split('.');
    if (parts.length < 2) return undefined;
    return parts.pop()!.toLowerCase();
}

/** Nombre de archivo sin extension, para usar como descripcion/titulo por defecto al subir. */
export function baseNameOf(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
}

// Set de constantes para los valores que el codigo todavia compara puntualmente (T&T,
// sugerencias de Ausencia/Historial). El catalogo real y editable — sin distincion de tipos
// reservados — vive en TipoDocumentoService; esto NO es la lista completa de tipos posibles,
// solo los que el codigo necesita nombrar.
export enum EDocType {
    MEDICAL_CERTIFICATE = 'MEDICAL_CERTIFICATE',
    VACATIONS = 'VACATIONS',
    CERTIFICATE = 'CERTIFICATE',
    SUSPENSION = 'SUSPENSION',
    LICENSE = 'LICENSE',
    OTHER = 'OTHER',
    DG = 'DG',
    PG = 'PG',
    CD = 'CD',
    EPP = 'EPP',
    TELEGRAMA = 'TELEGRAMA',
    ALTA_AFIP = 'ALTA_AFIP',
    PREOCUPACIONAL = 'PREOCUPACIONAL',
    APERCIBIMIENTO = 'APERCIBIMIENTO',
    ART = 'ART',
    NOTIFICATION = 'NOTIFICATION',
    RECEIPT = 'RECEIPT',
    INCOME = 'INCOME',
    BAJA_AFIP = 'BAJA_AFIP',
    CONTRATO = 'CONTRATO',
}
