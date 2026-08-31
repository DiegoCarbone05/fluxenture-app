/** Una pestaña de flux-tab-strip / flux-m3-tab-strip. */
export interface TabOption {
    key: string;
    label: string;
    /** Etiqueta abreviada para movil; si falta, se usa `label`. */
    mobileLabel?: string;
    badge?: number;
}
