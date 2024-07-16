import dotenv from "dotenv";
dotenv.config();

export const MIN_BTC_AMOUNT = 0.01;
export const API_URL = process.env.ACCOUNT_INITIALIZER_API_BASE_URL || "";
export const API_SECRET = process.env.ACCOUNT_INITIALIZER_API_SECRET || "";
export const EXSAT_RPC_URLS = JSON.parse(process.env.EXSAT_RPC_URLS||'') || [];

export type HexString = string;
export type Cipher = "aes-128-ctr" | "aes-128-cbc" | "aes-256-cbc";

export type CipherOptions = {
  salt?: Uint8Array | string;
  iv?: Uint8Array | string;
  kdf?: "scrypt" | "pbkdf2";
  dklen?: number;
  c?: number; // iterrations
  n?: number; // cpu/memory cost
  r?: number; // block size
  p?: number; // parallelization cost
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
  c: number; // iterations
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

export const keyStoreSchema = {
  type: "object",
  required: ["crypto", "id", "version", "address"],
  properties: {
    crypto: {
      type: "object",
      required: [
        "cipher",
        "ciphertext",
        "cipherparams",
        "kdf",
        "kdfparams",
        "mac",
      ],
      properties: {
        cipher: { type: "string" },
        ciphertext: { type: "string" },
        cipherparams: { type: "object" },
        kdf: { type: "string" },
        kdfparams: { type: "object" },
        salt: { type: "string" },
        mac: { type: "string" },
      },
    },
    id: { type: "string" },
    version: { type: "number" },
    address: { type: "string" },
    username: { type: "string" },
  },
};