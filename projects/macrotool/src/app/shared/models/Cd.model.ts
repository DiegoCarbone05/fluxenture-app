import { AuditMetadata } from "./AuditMetadata";
import { Tnt } from "./Tnt.model";

/**
 * Prefijo de producto de Correo Argentino. Es el campo "producto" del formulario de
 * seguimiento: si no se manda el correcto, el sitio no encuentra la pieza.
 * CD = carta documento en papel; MD = el mismo tramite pero 100% digital.
 * Para sumar otro prefijo alcanza con agregarlo aca.
 */
export const TRACKING_PRODUCTS = [
    { value: 'CD', label: 'CD', desc: 'Carta documento' },
    { value: 'MD', label: 'MD', desc: 'Carta documento digital' },
] as const;

/** Lo que se asume para toda pieza cargada antes de que existiera el campo. */
export const DEFAULT_TRACKING_PRODUCT = 'CD';

export function trackingProductOf(cd: Pick<Cd, 'product'> | null | undefined): string {
    return (cd?.product || DEFAULT_TRACKING_PRODUCT).toUpperCase();
}

/** Codigo completo tal como se busca en Correo Argentino, ej: "CD123456789". */
export function trackingCodeOf(cd: Pick<Cd, 'product' | 'trackingNumber'> | null | undefined): string {
    if (!cd) return '';
    return `${trackingProductOf(cd)}${cd.trackingNumber}`;
}

/** Separa un codigo tipeado o pegado ("CD 123", "md123", "123") en prefijo + numero. */
export function parseTrackingCode(raw: string | null | undefined): { product: string; trackingNumber: number } {
    const text = String(raw ?? '');
    const letters = text.replace(/[^A-Za-z]/g, '').toUpperCase();
    const digits = text.replace(/\D/g, '');
    return {
        product: letters || DEFAULT_TRACKING_PRODUCT,
        trackingNumber: Number(digits),
    };
}

export class Cd {
    id!: string;
    trackingNumber: number;
    /** Prefijo de producto (ver TRACKING_PRODUCTS). Ausente en las CDs viejas: se asume 'CD'. */
    product?: string;
    emissionDate: string;
    employeeId: string;
    fileId: string;
    originalFileId?: string;
    /** Id del Doc (FluxDocs) que representa la carta original. Fuente de verdad para el merge de tracking. */
    docId?: string;
    public tnt!: Tnt[];
    obs: string;
    trackingCompleted: boolean;
    audit?: AuditMetadata;

    constructor(
        trackingNumber: number,
        emissionDate: string,
        employeeId: string,
        fileId: string,
        obs: string,
        trackingCompleted: boolean,
        product: string = DEFAULT_TRACKING_PRODUCT
    ) {
        this.trackingNumber = trackingNumber;
        this.emissionDate = emissionDate;
        this.employeeId = employeeId;
        this.fileId = fileId;
        this.obs = obs;
        this.trackingCompleted = trackingCompleted;
        this.product = product;
    }

}
