"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decryptKeystore = exports.createKeystore = exports.parseAndValidatePrivateKey = exports.secp256k1 = void 0;
const antelope_1 = require("@wharfkit/antelope");
const aes_js_1 = require("ethereum-cryptography/aes.js");
const ethereumCryptography = __importStar(require("ethereum-cryptography/secp256k1.js"));
const wif_1 = __importDefault(require("wif"));
exports.secp256k1 = ethereumCryptography.secp256k1 ?? ethereumCryptography;
const pbkdf2_js_1 = require("ethereum-cryptography/pbkdf2.js");
const scrypt_js_1 = require("ethereum-cryptography/scrypt.js");
const web3_errors_1 = require("web3-errors");
const web3_utils_1 = require("web3-utils");
const web3_validator_1 = require("web3-validator");
const constants_1 = require("./constants");
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
const parseAndValidatePrivateKey = (data, ignoreLength) => {
    let privateKeyUint8Array;
    // To avoid the case of 1 character less in a hex string which is prefixed with '0' by using 'bytesToUint8Array'
    if (!ignoreLength &&
        typeof data === 'string' &&
        (0, web3_validator_1.isHexStrict)(data) &&
        data.length !== 66) {
        throw new web3_errors_1.PrivateKeyLengthError();
    }
    try {
        privateKeyUint8Array = (0, web3_utils_1.isUint8Array)(data) ? data : (0, web3_utils_1.bytesToUint8Array)(data);
    }
    catch {
        throw new web3_errors_1.InvalidPrivateKeyError();
    }
    if (!ignoreLength && privateKeyUint8Array.byteLength !== 32) {
        throw new web3_errors_1.PrivateKeyLengthError();
    }
    return privateKeyUint8Array;
};
exports.parseAndValidatePrivateKey = parseAndValidatePrivateKey;
const createKeystore = async (privateKey, password, username, options) => {
    const privateKeyUint8Array = (0, exports.parseAndValidatePrivateKey)(privateKey);
    const privekeyByte = (0, web3_utils_1.hexToBytes)(`${privateKey}`);
    // if given salt or iv is a string, convert it to a Uint8Array
    let salt;
    if (options?.salt) {
        salt =
            typeof options.salt === 'string'
                ? (0, web3_utils_1.hexToBytes)(options.salt)
                : options.salt;
    }
    else {
        salt = (0, web3_utils_1.randomBytes)(32);
    }
    if (!((0, web3_validator_1.isString)(password) || (0, web3_utils_1.isUint8Array)(password))) {
        throw new web3_errors_1.InvalidPasswordError();
    }
    const uint8ArrayPassword = typeof password === 'string' ? (0, web3_utils_1.hexToBytes)((0, web3_utils_1.utf8ToHex)(password)) : password;
    let initializationVector;
    if (options?.iv) {
        initializationVector =
            typeof options.iv === 'string' ? (0, web3_utils_1.hexToBytes)(options.iv) : options.iv;
        if (initializationVector.length !== 16) {
            throw new web3_errors_1.IVLengthError();
        }
    }
    else {
        initializationVector = (0, web3_utils_1.randomBytes)(16);
    }
    const kdf = options?.kdf ?? 'scrypt';
    let derivedKey;
    let kdfparams;
    // derive key from key derivation function
    if (kdf === 'pbkdf2') {
        kdfparams = {
            dklen: options?.dklen ?? 32,
            salt: (0, web3_utils_1.bytesToHex)(salt).replace('0x', ''),
            c: options?.c ?? 600000,
            prf: 'hmac-sha256',
        };
        if (kdfparams.c < 100000) {
            // error when c < 1000, pbkdf2 is less secure with less iterations
            throw new web3_errors_1.PBKDF2IterationsError();
        }
        derivedKey = (0, pbkdf2_js_1.pbkdf2Sync)(uint8ArrayPassword, salt, kdfparams.c, kdfparams.dklen, 'sha256');
    }
    else if (kdf === 'scrypt') {
        kdfparams = {
            n: options?.n ?? 8192,
            r: options?.r ?? 8,
            p: options?.p ?? 1,
            dklen: options?.dklen ?? 32,
            salt: (0, web3_utils_1.bytesToHex)(salt).replace('0x', ''),
        };
        derivedKey = (0, scrypt_js_1.scryptSync)(uint8ArrayPassword, salt, kdfparams.n, kdfparams.p, kdfparams.r, kdfparams.dklen);
    }
    else {
        throw new web3_errors_1.InvalidKdfError();
    }
    const cipher = await (0, aes_js_1.encrypt)(privateKeyUint8Array, derivedKey.slice(0, 16), initializationVector, 'aes-128-ctr');
    const ciphertext = (0, web3_utils_1.bytesToHex)(cipher).slice(2);
    const pvKeyFromWif = antelope_1.PrivateKey.from(wif_1.default.encode(128, Buffer.from(privekeyByte), false).toString());
    const publicKey = pvKeyFromWif.toPublic().toString();
    const mac = (0, web3_utils_1.sha3Raw)((0, web3_utils_1.uint8ArrayConcat)(derivedKey.slice(16, 32), cipher)).replace('0x', '');
    return {
        version: 3,
        id: (0, web3_utils_1.uuidV4)(),
        address: publicKey,
        username,
        crypto: {
            ciphertext,
            cipherparams: {
                iv: (0, web3_utils_1.bytesToHex)(initializationVector).replace('0x', ''),
            },
            cipher: 'aes-128-ctr',
            kdf,
            kdfparams,
            mac,
        },
    };
};
exports.createKeystore = createKeystore;
const decryptKeystore = async (keystore, password, nonStrict) => {
    const json = typeof keystore === 'object'
        ? keystore
        : JSON.parse(nonStrict ? keystore.toLowerCase() : keystore);
    web3_validator_1.validator.validateJSONSchema(constants_1.keyStoreSchema, json);
    if (json.version !== 3)
        throw new web3_errors_1.KeyStoreVersionError();
    const uint8ArrayPassword = typeof password === 'string' ? (0, web3_utils_1.hexToBytes)((0, web3_utils_1.utf8ToHex)(password)) : password;
    web3_validator_1.validator.validate(['bytes'], [uint8ArrayPassword]);
    let derivedKey;
    if (json.crypto.kdf === 'scrypt') {
        const kdfparams = json.crypto.kdfparams;
        const uint8ArraySalt = typeof kdfparams.salt === 'string'
            ? (0, web3_utils_1.hexToBytes)(kdfparams.salt)
            : kdfparams.salt;
        derivedKey = (0, scrypt_js_1.scryptSync)(uint8ArrayPassword, uint8ArraySalt, kdfparams.n, kdfparams.p, kdfparams.r, kdfparams.dklen);
    }
    else if (json.crypto.kdf === 'pbkdf2') {
        const kdfparams = json.crypto
            .kdfparams;
        const uint8ArraySalt = typeof kdfparams.salt === 'string'
            ? (0, web3_utils_1.hexToBytes)(kdfparams.salt)
            : kdfparams.salt;
        derivedKey = (0, pbkdf2_js_1.pbkdf2Sync)(uint8ArrayPassword, uint8ArraySalt, kdfparams.c, kdfparams.dklen, 'sha256');
    }
    else {
        throw new web3_errors_1.InvalidKdfError();
    }
    const ciphertext = (0, web3_utils_1.hexToBytes)(json.crypto.ciphertext);
    const mac = (0, web3_utils_1.sha3Raw)((0, web3_utils_1.uint8ArrayConcat)(derivedKey.slice(16, 32), ciphertext)).replace('0x', '');
    if (mac !== json.crypto.mac) {
        throw new web3_errors_1.KeyDerivationError();
    }
    const seed = await (0, aes_js_1.decrypt)((0, web3_utils_1.hexToBytes)(json.crypto.ciphertext), derivedKey.slice(0, 16), (0, web3_utils_1.hexToBytes)(json.crypto.cipherparams.iv));
    const pvKeyFromWif = antelope_1.PrivateKey.from(wif_1.default.encode(128, Buffer.from(seed), false).toString());
    return pvKeyFromWif.toString();
};
exports.decryptKeystore = decryptKeystore;
