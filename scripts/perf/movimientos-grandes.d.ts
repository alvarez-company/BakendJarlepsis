type LoginResponse = {
    access_token?: string;
    data?: {
        access_token?: string;
    };
};
declare const BASE_URL: string;
declare const EMAIL: string;
declare const PASSWORD: string;
declare const INVENTARIO_ID: number;
declare function must(value: string, name: string): string;
declare function http<T>(path: string, opts?: RequestInit & {
    token?: string;
}): Promise<T>;
declare function unwrapData<T>(resp: any): T;
declare function chunk<T>(arr: T[], size: number): T[][];
declare function main(): Promise<void>;
