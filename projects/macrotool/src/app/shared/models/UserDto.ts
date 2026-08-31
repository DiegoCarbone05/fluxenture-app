export type UserRole = 'ADMIN' | 'USER' | 'GUEST';

export class UserDto {
    id?: string;
    mail?: string;
    username?: string;
    role?: UserRole;
    name?: UserRole;
    surname?: UserRole;

    constructor(init?: Partial<UserDto>) {
        Object.assign(this, init);
    }
}