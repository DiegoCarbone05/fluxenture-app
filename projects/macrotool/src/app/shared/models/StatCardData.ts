// Forma comun de las 4 tarjetas de metrica del encabezado de pagina, en
// escritorio (flux-stat-card) y en movil (flux-m3-stat-card). Empleados y
// Ausencias arman este objeto en su computed `stats`.
export interface StatCardData {
    label: string;
    value: number | string;
    icon: string;
    iconBg: string;
    iconFg: string;
    noteIcon?: string;
    note: string;
    noteFg: string;
    noteText: string;
}
