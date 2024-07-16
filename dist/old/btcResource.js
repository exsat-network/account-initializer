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
exports.chargeBtcForResource = void 0;
const readline_sync_1 = __importDefault(require("readline-sync"));
const utils_1 = require("./utils");
const constants_1 = require("../constants");
const qrcode_terminal_1 = __importDefault(require("qrcode-terminal"));
const fs_1 = require("fs");
const chargeBtcForResource = () => __awaiter(void 0, void 0, void 0, function* () {
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
        let username = "";
        const account = yield (0, utils_1.retryRequest)(() => utils_1.axiosInstance.post("/api/users/my", { publicKey: keystoreInfo.address }));
        const accountInfo = account.data;
        console.log(`\nusername: ${accountInfo.info.username}\n`);
        if (accountInfo.status === "success") {
            username = accountInfo.info.username;
        }
        else {
            console.log(`Account not found for for publicKey: ${keystoreInfo.address}`);
            return;
        }
        let amountInput = parseFloat(readline_sync_1.default.question("Enter the amount of BTC to charge (more than 0.01 BTC): "));
        while (isNaN(amountInput) || amountInput < constants_1.MIN_BTC_AMOUNT) {
            console.log(`Amount must be more than ${constants_1.MIN_BTC_AMOUNT} BTC. Please try again.`);
            amountInput = parseFloat(readline_sync_1.default.question("Enter the amount of BTC to charge (more than 0.01 BTC): "));
        }
        const response = yield (0, utils_1.retryRequest)(() => utils_1.axiosInstance.post("/api/payments/create-payment", {
            username,
            amount: amountInput,
        }));
        if (response.data.status != "success") {
            console.log(response.data.message);
            return;
        }
        const { btcAddress, amount } = response.data.info;
        console.log(`Please send ${amount} BTC to the following address:`);
        qrcode_terminal_1.default.generate(btcAddress, { small: true });
        console.log(btcAddress);
        const txid = readline_sync_1.default.question("Enter the transaction ID after sending BTC: ");
        const response2 = yield (0, utils_1.retryRequest)(() => utils_1.axiosInstance.post("/api/payments/submit-payment", {
            txid,
            username,
        }));
        if (response2.data.status === "success") {
            console.log(response2.data.message);
        }
        else {
            console.log(response2.data.message);
            return;
        }
    }
    catch (error) {
        if (error instanceof Error) {
            console.error("Error processing the request:", error.message);
        }
    }
});
exports.chargeBtcForResource = chargeBtcForResource;
