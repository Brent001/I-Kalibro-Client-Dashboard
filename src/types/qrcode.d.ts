declare module 'qrcode' {
    export function toString(
        value: string,
        options?: { type?: 'svg'; margin?: number; width?: number }
    ): Promise<string>;
}
