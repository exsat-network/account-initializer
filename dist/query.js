"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryAccount = void 0;
const utils_1 = require("./utils");
const fs_1 = require("fs");
const web3_1 = require("./web3");
const prompts_1 = require("@inquirer/prompts");
const queryAccount = async () => {
    try {
        let encFile = '';
        const selectedPath = (0, utils_1.readSelectedPath)();
        if (selectedPath) {
            const files = (0, fs_1.readdirSync)(selectedPath).filter((file) => file.endsWith('_keystore.json'));
            if (files.length > 0) {
                encFile = files[0];
            }
            else {
                const filePath = await (0, prompts_1.input)({
                    message: 'Enter the path to your keystore file: ',
                });
                encFile = filePath;
            }
        }
        else {
            const filePath = await (0, prompts_1.input)({
                message: 'Enter the path to your keystore file: ',
            });
            encFile = filePath;
        }
        const keystore = (0, fs_1.readFileSync)(encFile, 'utf-8');
        const keystoreInfo = JSON.parse(keystore);
        console.log(`\nQuerying account for publicKey: ${keystoreInfo.address}\n`);
        const response = await (0, utils_1.retryRequest)(() => utils_1.axiosInstance.post('/api/users/my', { publicKey: keystoreInfo.address }));
        const accountInfo = response.data;
        if (accountInfo.status === 'success') {
            console.log(`Username: ${accountInfo.info.username}`);
            console.log(`Role: ${accountInfo.info.role}`);
            console.log(`Public Key: ${accountInfo.info.publicKey}`);
            console.log(`Status: ${accountInfo.info.status}`);
        }
        else {
            console.log(`Account not found for publicKey: ${keystoreInfo.address}`);
            return;
        }
        const needPrivateKey = await (0, prompts_1.confirm)({
            message: '\nDo you need to access the private key?',
        });
        if (needPrivateKey) {
            const passwordInput = await (0, prompts_1.password)({
                message: 'Enter the password to decrypt your private key: ',
                mask: '*',
            });
            const data = await (0, web3_1.decryptKeystore)(keystore, passwordInput);
            console.log(`\nPrivate Key: ${(0, utils_1.cmdGreenFont)(data)}`);
        }
    }
    catch (error) {
        if (error instanceof Error) {
            console.error('Error querying account:', error.message);
        }
    }
};
exports.queryAccount = queryAccount;
