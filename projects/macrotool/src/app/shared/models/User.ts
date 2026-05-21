import { AuditMetadata } from "./AuditMetadata";

export class User {
    id?: string;
    mail: string = '';
    username: string = '';
    password: string = '';
    audit?: AuditMetadata;

    constructor(init?: Partial<User>) {
        Object.assign(this, init);
    }
}