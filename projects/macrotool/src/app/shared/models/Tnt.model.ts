export class Tnt {
    date: string;
    plant: string;
    history: string;
    status: string;

    constructor(date: string, plant: string, history: string, status: string) {
        this.date = date;
        this.plant = plant;
        this.history = history;
        this.status = status;
    }
}

export enum ETrackingStatus {

    //---------------------------------------------SUCCESS_STATUS
    ENTREGADO = "ENTREGADO",
    ENTREGA_EN_SUCURSAL = "ENTREGA EN SUCURSAL",

    //---------------------------------------------WARNING_STATUS
    EN_ESPERA_EN_SUCURSAL = "EN ESPERA EN SUCURSAL",

    //---------------------------------------------ERROR_STATUS
    DOMICILIO_CERRADO_1 = "DOMICILIO CERRADO/1 VISITA",
    DOMICILIO_CERRADO_2 = "DOMICILIO CERRADO/2 VISITA",
    DEVUELTO_AL_REMITENTE = "DEVUELTO AL REMITENTE",
    PLAZO_VENCIDO_NO_RECLAMADO = "PLAZO VENCIDO NO RECLAMADO",
}