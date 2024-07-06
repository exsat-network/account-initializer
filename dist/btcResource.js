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
const utils_1 = require("./utils");
const constants_1 = require("./constants");
const qrcode_terminal_1 = __importDefault(require("qrcode-terminal"));
const fs_1 = require("fs");
const prompts_1 = require("@inquirer/prompts");
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
                const filePath = yield (0, prompts_1.input)({
                    message: "Enter the path to your keystore file: ",
                });
                encFile = filePath;
            }
        }
        else {
            const filePath = yield (0, prompts_1.input)({
                message: "Enter the path to your keystore file: ",
            });
            encFile = filePath;
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
            console.log(`Account not found for publicKey: ${keystoreInfo.address}`);
            return;
        }
        const amountInput = yield (0, prompts_1.input)({
            message: `Enter the amount of BTC to charge (more than ${constants_1.MIN_BTC_AMOUNT} BTC): `,
            validate: (input) => {
                const amount = parseFloat(input);
                if (isNaN(amount) || amount < constants_1.MIN_BTC_AMOUNT) {
                    return `Amount must be more than ${constants_1.MIN_BTC_AMOUNT} BTC. Please try again.`;
                }
                return true;
            },
        });
        const response = yield (0, utils_1.retryRequest)(() => utils_1.axiosInstance.post("/api/payments/create-payment", {
            username,
            amount: parseFloat(amountInput),
        }));
        if (response.data.status != "success") {
            console.log(response.data.message);
            return;
        }
        const { btcAddress, amount } = response.data.info;
        console.log(`Please send ${amount} BTC to the following address:`);
        qrcode_terminal_1.default.generate(btcAddress, { small: true });
        console.log(btcAddress);
        const txid = yield (0, prompts_1.input)({
            message: "Enter the transaction ID after sending BTC: ",
        });
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
