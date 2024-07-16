"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryAccount = void 0;
const readline_sync_1 = __importDefault(require("readline-sync"));
const utils_1 = require("./utils");
const fs_1 = require("fs");
const web3_1 = require("../web3");
const queryAccount = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let encFile = "";
        const selectedPath = (0, utils_1.readSelectedPath)();
        if (selectedPath) {
            const files = (0, fs_1.readdirSync)(selectedPath).filter((file) => file.endsWith("_keystore.json"));
            if (files.length > 0) {
                encFile = files[0];
            }
            else {
                encFile = readline_sync_1.default.question("Enter the path to your keystore file: ");
            }
        }
        else {
            encFile = readline_sync_1.default.question("Enter the path to your keystore file: ");
        }
        const keystore = (0, fs_1.readFileSync)(encFile, "utf-8");
        const keystoreInfo = JSON.parse(keystore);
        console.log(`\nQuerying account for publicKey: ${keystoreInfo.address}\n`);
        const response = yield (0, utils_1.retryRequest)(() => utils_1.axiosInstance.post("/api/users/my", { publicKey: keystoreInfo.address }));
        const accountInfo = response.data;
        if (accountInfo.status === "success") {
            console.log(`Username: ${accountInfo.info.username}`);
            console.log(`Role: ${accountInfo.info.role}`);
            console.log(`Public Key: ${accountInfo.info.publicKey}`);
            console.log(`Status: ${accountInfo.info.status}`);
        }
        else {
            console.log(`Account not found for for publicKey: ${keystoreInfo.address}`);
            return;
        }
        const needPrivateKey = readline_sync_1.default.keyInYN("\nDo you need to access the private key? ");
        if (needPrivateKey) {
            const password = readline_sync_1.default.question("Enter the password to decrypt your private key: ", {
                hideEchoBack: true,
            });
            const data = yield (0, web3_1.decryptKeystore)(keystore, password);
            console.log(`\nPrivate Key: ${(0, utils_1.cmdGreenFont)(data)}`);
        }
    }
    catch (error) {
        if (error instanceof Error) {
            console.error("Error querying account:", error.message);
        }
    }
});
exports.queryAccount = queryAccount;
