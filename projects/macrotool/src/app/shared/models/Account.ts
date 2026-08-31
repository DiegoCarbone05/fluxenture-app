import { UserRole } from './UserDto';

export interface AccountAudit {
    createdAt?: string;
    createdBy?: string;
    updatedAt?: string;
    updatedBy?: string;
}

/** Entrada de la allow-list de Fluxenture (mail -> rol). Ver UserController en el backend. */
export class Account {
    id?: string;
    mail!: string;
    role!: UserRole;
    audit?: AccountAudit;

    constructor(init?: Partial<Account>) {
        Object.assign(this, init);
    }
}
