"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.keyStoreSchema = exports.EXSAT_RPC_URLS = exports.API_SECRET = exports.API_URL = exports.MIN_BTC_AMOUNT = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.MIN_BTC_AMOUNT = 0.01;
exports.API_URL = process.env.ACCOUNT_INITIALIZER_API_BASE_URL || "";
exports.API_SECRET = process.env.ACCOUNT_INITIALIZER_API_SECRET || "";
exports.EXSAT_RPC_URLS = JSON.parse(process.env.EXSAT_RPC_URLS || '') || [];
exports.keyStoreSchema = {
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
