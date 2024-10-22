"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chargeForRegistry = exports.chargeBtcForResource = void 0;
const utils_1 = require("./utils");
const constants_1 = require("./constants");
const qrcode_terminal_1 = __importDefault(require("qrcode-terminal"));
const fs_1 = require("fs");
const prompts_1 = require("@inquirer/prompts");
const font_1 = require("./font");
const getKeystore = async (encFile) => {
    if (!encFile) {
        encFile = (0, utils_1.keystoreExist)();
        if (!encFile) {
            const filePath = await (0, prompts_1.input)({
                message: 'Enter the path to your keystore file: ',
            });
            encFile = filePath;
        }
    }
    const keystore = (0, fs_1.readFileSync)(encFile, 'utf-8');
    return JSON.parse(keystore);
};
const getAccountInfo = async (publicKey) => {
    const account = await (0, utils_1.retryRequest)(() => utils_1.axiosInstance.post('/api/users/my', { publicKey }));
    if (account.data.status === 'success') {
        console.log(`\n${font_1.Font.fgCyan}${font_1.Font.bright}Account: ${font_1.Font.reset}${font_1.Font.bright} ${account.data.info.username}${font_1.Font.reset}\n`);
        return account.data.info.username;
    }
    else {
        console.log(`${font_1.Font.fgYellow}${font_1.Font.bright}Account not found for publicKey: ${publicKey}${font_1.Font.reset}`);
        return null;
    }
};
const getBtcAmount = async () => {
    return await (0, utils_1.inputWithCancel)(`Enter the amount of BTC to bridge (at least ${constants_1.MIN_BTC_AMOUNT} BTC, Input "q" to return.): `, (input) => {
        const amount = parseFloat(input);
        if (isNaN(amount) || amount < constants_1.MIN_BTC_AMOUNT) {
            return `Amount must be at least ${constants_1.MIN_BTC_AMOUNT} BTC. Please try again.`;
        }
        return true;
    });
};
const createPayment = async (username, amount) => {
    const response = await (0, utils_1.retryRequest)(() => utils_1.axiosInstance.post('/api/payments/create-payment', {
        username,
        amount: parseFloat(amount),
    }));
    if (response.data.status !== 'success') {
        console.log(response.data.message);
        return null;
    }
    return response.data.info;
};
const submitPayment = async (txid, username) => {
    const response2 = await (0, utils_1.retryRequest)(() => utils_1.axiosInstance.post('/api/payments/submit-payment', {
        txid,
        username,
    }));
    if (response2.data.status === 'success') {
        console.log(response2.data.message);
    }
    else {
        console.log(response2.data.message);
    }
};
const displayQrCode = (btcAddress, network) => {
    console.log(`${font_1.Font.fgCyan}${font_1.Font.bright}-----------------------------------------------\nPlease send BTC to the following address: ${font_1.Font.reset}`);
    qrcode_terminal_1.default.generate(btcAddress, { small: true });
    console.log(`${font_1.Font.bright}${font_1.Font.fgCyan}BTC Address: ${font_1.Font.reset}${font_1.Font.bright}${btcAddress}\n` +
        `${font_1.Font.fgCyan}Network: ${font_1.Font.reset}${font_1.Font.bright}${network}\n` +
        `${font_1.Font.fgCyan}-----------------------------------------------${font_1.Font.reset}`);
};
const chargeBtcForResource = async (encFile) => {
    try {
        const keystoreInfo = await getKeystore(encFile);
        const username = await getAccountInfo(keystoreInfo.address);
        if (!username)
            return;
        const amountInput = await getBtcAmount();
        if (!amountInput)
            return false;
        const paymentInfo = await createPayment(username, amountInput);
        if (!paymentInfo)
            return false;
        const { btcAddress, amount } = paymentInfo;
        const networkResponse = await (0, utils_1.retryRequest)(() => utils_1.axiosInstance.get('/api/config/exsat_config'));
        displayQrCode(btcAddress, networkResponse.data.info.btc_network);
        const txid = await (0, prompts_1.input)({
            message: 'Enter the transaction ID after sending BTC: ',
        });
        await submitPayment(txid, username);
        return true;
    }
    catch (error) {
        console.error('Error processing the request: ', error.message);
        return false;
    }
};
exports.chargeBtcForResource = chargeBtcForResource;
async function chargeForRegistry(username, btcAddress, amount) {
    console.log(`${font_1.Font.fgCyan}${font_1.Font.bright}-----------------------------------------------\n` +
        `· Please send 0.01 BTC to the following BTC address and send the Transaction ID to the system. \n` +
        `· Once the system receives this BTC, your exSat account (${font_1.Font.reset}${font_1.Font.bright} ${username.endsWith('.sat') ? username : `${username}.sat`} ${font_1.Font.fgCyan}) will be officially created on the exSat network. \n` +
        `· The BTC you send will be cross-chained to your exSat account and used for subsequent on-chain operations as Gas Fee.\n` +
        `-----------------------------------------------${font_1.Font.reset}`);
    qrcode_terminal_1.default.generate(btcAddress, { small: true });
    const networkResponse = await (0, utils_1.retryRequest)(() => utils_1.axiosInstance.get('/api/config/exsat_config'));
    console.log(`${font_1.Font.fgCyan}${font_1.Font.bright}BTC Address: ${font_1.Font.reset}${font_1.Font.bright}${btcAddress}\n` +
        `${font_1.Font.fgCyan}Network: ${font_1.Font.reset}${font_1.Font.bright}${networkResponse.data.info.btc_network}\n` +
        `${font_1.Font.fgCyan}-----------------------------------------------${font_1.Font.reset}`);
    let response;
    const txid = await (0, prompts_1.input)({
        message: `Enter the transaction ID after sending BTC: `,
        validate: async (input) => {
            if (!(0, utils_1.isValidTxid)(input)) {
                return 'Invalid transaction ID.';
            }
            try {
                response = await utils_1.axiosInstance.post('/api/users/submit-payment', {
                    txid: input,
                    amount,
                    username,
                });
                if (response.data.status === 'success') {
                    return true;
                }
                return response.data.message;
            }
            catch (error) {
                if (error.response && error.response.status === 409) {
                    return 'Transaction already submitted.';
                }
                return error.message;
            }
        },
    });
    return username;
}
exports.chargeForRegistry = chargeForRegistry;
