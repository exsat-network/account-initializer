export declare const secp256k1: Readonly<{
    create: (hash: import("@noble/curves/abstract/utils").CHash) => import("@noble/curves/abstract/weierstrass").CurveFn;
    CURVE: Readonly<{
        readonly nBitLength: number;
        readonly nByteLength: number;
        readonly Fp: import("@noble/curves/abstract/modular").IField<bigint>;
        readonly n: bigint;
        readonly h: bigint;
        readonly hEff?: bigint | undefined;
        readonly Gx: bigint;
        readonly Gy: bigint;
        readonly allowInfinityPoint?: boolean | undefined;
        readonly a: bigint;
        readonly b: bigint;
        readonly allowedPrivateKeyLengths?: readonly number[] | undefined;
        readonly wrapPrivateKey?: boolean | undefined;
        readonly endo?: {
            beta: bigint;
            splitScalar: (k: bigint) => {
                k1neg: boolean;
                k1: bigint;
                k2neg: boolean;
                k2: bigint;
            };
        } | undefined;
        readonly isTorsionFree?: ((c: import("@noble/curves/abstract/weierstrass").ProjConstructor<bigint>, point: import("@noble/curves/abstract/weierstrass").ProjPointType<bigint>) => boolean) | undefined;
        readonly clearCofactor?: ((c: import("@noble/curves/abstract/weierstrass").ProjConstructor<bigint>, point: import("@noble/curves/abstract/weierstrass").ProjPointType<bigint>) => import("@noble/curves/abstract/weierstrass").ProjPointType<bigint>) | undefined;
        readonly hash: import("@noble/curves/abstract/utils").CHash;
        readonly hmac: (key: Uint8Array, ...messages: Uint8Array[]) => Uint8Array;
        readonly randomBytes: (bytesLength?: number | undefined) => Uint8Array;
        lowS: boolean;
        readonly bits2int?: ((bytes: Uint8Array) => bigint) | undefined;
        readonly bits2int_modN?: ((bytes: Uint8Array) => bigint) | undefined;
        readonly p: bigint;
    }>;
    getPublicKey: (privateKey: import("@noble/curves/abstract/utils").PrivKey, isCompressed?: boolean | undefined) => Uint8Array;
    getSharedSecret: (privateA: import("@noble/curves/abstract/utils").PrivKey, publicB: import("@noble/curves/abstract/utils").Hex, isCompressed?: boolean | undefined) => Uint8Array;
    sign: (msgHash: import("@noble/curves/abstract/utils").Hex, privKey: import("@noble/curves/abstract/utils").PrivKey, opts?: import("@noble/curves/abstract/weierstrass").SignOpts | undefined) => import("@noble/curves/abstract/weierstrass").RecoveredSignatureType;
    verify: (signature: import("@noble/curves/abstract/utils").Hex | {
        r: bigint;
        s: bigint;
    }, msgHash: import("@noble/curves/abstract/utils").Hex, publicKey: import("@noble/curves/abstract/utils").Hex, opts?: import("@noble/curves/abstract/weierstrass").VerOpts | undefined) => boolean;
    ProjectivePoint: import("@noble/curves/abstract/weierstrass").ProjConstructor<bigint>;
    Signature: import("@noble/curves/abstract/weierstrass").SignatureConstructor;
    utils: {
        normPrivateKeyToScalar: (key: import("@noble/curves/abstract/utils").PrivKey) => bigint;
        isValidPrivateKey(privateKey: import("@noble/curves/abstract/utils").PrivKey): boolean;
        randomPrivateKey: () => Uint8Array;
        precompute: (windowSize?: number | undefined, point?: import("@noble/curves/abstract/weierstrass").ProjPointType<bigint> | undefined) => import("@noble/curves/abstract/weierstrass").ProjPointType<bigint>;
    };
}>;
import { Bytes, CipherOptions, KeyStore } from 'web3-types';
/**
 * Get the private key Uint8Array after the validation.
 * Note: This function is not exported through main web3 package, so for using it directly import from accounts package.
 * @param data - Private key
 * @param ignoreLength - Optional, ignore length check during validation
 * @returns The Uint8Array private key
 *
 * ```ts
 * parseAndValidatePrivateKey("0x08c673022000ece7964ea4db2d9369c50442b2869cbd8fc21baaca59e18f642c")
 *
 * > Uint8Array(32) [
 * 186,  26, 143, 168, 235, 179,  90,  75,
 * 101,  63,  84, 221, 152, 150,  30, 203,
 *   8, 113,  94, 226,  53, 213, 216,   5,
 * 194, 159,  17,  53, 219,  97, 121, 248
 * ]
 *
 * ```
 */
export declare const parseAndValidatePrivateKey: (data: Bytes, ignoreLength?: boolean) => Uint8Array;
export declare const createKeystore: (privateKey: Bytes, password: string, username?: string, options?: CipherOptions) => Promise<any>;
export declare const decryptKeystore: (keystore: KeyStore | string, password: string | Uint8Array, nonStrict?: boolean) => Promise<string>;
