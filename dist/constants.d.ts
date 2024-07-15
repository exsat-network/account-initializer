export declare const MIN_BTC_AMOUNT = 0.01;
export declare const API_URL: string;
export declare const API_SECRET: string;
export declare const EOS_RPC_URL: string;
export type HexString = string;
export type Cipher = "aes-128-ctr" | "aes-128-cbc" | "aes-256-cbc";
export type CipherOptions = {
    salt?: Uint8Array | string;
    iv?: Uint8Array | string;
    kdf?: "scrypt" | "pbkdf2";
    dklen?: number;
    c?: number;
    n?: number;
    r?: number;
    p?: number;
};
export type UserInfo = {
    website?: string;
    logo?: string;
    name?: string;
    profile?: string;
    email?: string;
};
export type ScryptParams = {
    dklen: number;
    n: number;
    p: number;
    r: number;
    salt: Uint8Array | string;
};
export type PBKDF2SHA256Params = {
    c: number;
    dklen: number;
    prf: "hmac-sha256";
    salt: Uint8Array | string;
};
export type KeyStore = {
    crypto: {
        cipher: Cipher;
        ciphertext: string;
        cipherparams: {
            iv: string;
        };
        kdf: "pbkdf2" | "scrypt";
        kdfparams: ScryptParams | PBKDF2SHA256Params;
        mac: HexString;
    };
    id: string;
    version: 3;
    address: string;
    username?: string;
};
export declare const keyStoreSchema: {
    type: string;
    required: string[];
    properties: {
        crypto: {
            type: string;
            required: string[];
            properties: {
                cipher: {
                    type: string;
                };
                ciphertext: {
                    type: string;
                };
                cipherparams: {
                    type: string;
                };
                kdf: {
                    type: string;
                };
                kdfparams: {
                    type: string;
                };
                salt: {
                    type: string;
                };
                mac: {
                    type: string;
                };
            };
        };
        id: {
            type: string;
        };
        version: {
            type: string;
        };
        address: {
            type: string;
        };
        username: {
            type: string;
        };
    };
};
