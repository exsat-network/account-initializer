"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeAccount = exports.importFromPrivateKey = exports.importFromMnemonic = exports.checkUsernameRegisterOrder = exports.checkUsernameWithBackend = void 0;
const bip39_1 = require("@scure/bip39");
const english_1 = require("@scure/bip39/wordlists/english");
const hdkey_1 = __importDefault(require("hdkey"));
const antelope_1 = require("@wharfkit/antelope");
const fs_1 = require("fs");
const qrcode_terminal_1 = __importDefault(require("qrcode-terminal"));
const utils_1 = require("./utils");
const web3_1 = require("./web3");
const wif_1 = __importDefault(require("wif"));
const web3_utils_1 = require("web3-utils");
const constants_1 = require("./constants");
const prompts_1 = require("@inquirer/prompts");
const validateUsername = (username) => {
    const regex = /^[a-z1-5]{1,8}$/;
    return regex.test(username);
};
const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};
const checkUsernameWithBackend = async (username) => {
    try {
        const response = await utils_1.axiosInstance.post('/api/users/check-username', {
            username,
        });
        return response.data.valid;
    }
    catch (error) {
        if (error instanceof Error) {
            console.error('Error checking username with backend:', error.message);
        }
        return false;
    }
};
exports.checkUsernameWithBackend = checkUsernameWithBackend;
const checkUsernameRegisterOrder = async (username) => {
    try {
        const response = await (0, utils_1.retryRequest)(() => utils_1.axiosInstance.post('/api/users/my', { username }));
        const accountInfo = response.data;
        if (accountInfo.status === 'success') {
            return true;
        }
        else {
            return false;
        }
    }
    catch (error) {
        if (error instanceof Error) {
            console.error('Error checking username with backend:', error.message);
        }
        return false;
    }
};
exports.checkUsernameRegisterOrder = checkUsernameRegisterOrder;
async function saveKeystore(privateKey, username) {
    let passwordInput = await (0, prompts_1.password)({
        message: 'Account imported successfully. Set a password to encrypt the private key (at least 6 characters): ',
        mask: '*',
        validate: (input) => input.length >= 6 || 'Password must be at least 6 characters.',
    });
    let passwordConfirmInput = await (0, prompts_1.password)({
        message: 'Confirm your password: ',
        mask: '*',
    });
    while (passwordInput !== passwordConfirmInput) {
        console.log(`\n${(0, utils_1.cmdRedFont)('Password not match, please try again.')}\n`);
        passwordInput = await (0, prompts_1.password)({
            message: 'Enter a password to encrypt your private key(>= 6 digits): ',
            mask: '*',
            validate: (input) => input.length >= 6 || 'Password must be at least 6 characters long.',
        });
        passwordConfirmInput = await (0, prompts_1.password)({
            message: 'Confirm your password: ',
            mask: '*',
        });
    }
    const keystore = await (0, web3_1.createKeystore)(`${(0, web3_utils_1.bytesToHex)(wif_1.default.decode(privateKey.toWif(), 128).privateKey)}`, passwordInput, username);
    console.log(`\nKeystore created successfully.\n`);
    // console.log(keystore);
    // const decryptedPrivateKey = await decryptKeystore(keystore, passwordInput);
    // console.log(`\ndecryptedPrivateKey.${decryptedPrivateKey}\n`);
    const selectedPath = await (0, utils_1.selectDirPrompt)();
    (0, fs_1.writeFileSync)(`${selectedPath}/${username}_keystore.json`, JSON.stringify(keystore));
    (0, utils_1.updateEnvFile)({ KEYSTORE_FILE: `${selectedPath}/${username}_keystore.json` });
    console.log(`\n${(0, utils_1.cmdRedFont)('!!!Remember to backup this file!!!')}\n`);
    console.log(`\n${(0, utils_1.cmdGreenFont)(`Saved Successed: ${selectedPath}/${username}_keystore.json`)}\n`);
}
async function generateKeystore(username) {
    const mnemonic = (0, bip39_1.generateMnemonic)(english_1.wordlist);
    console.log(`Your Seed Phrase: \n`);
    console.log(`${(0, utils_1.cmdGreenFont)(mnemonic)}\n`);
    await (0, prompts_1.input)({
        message: "Please confirm that you have backed up and saved the seed phrase (input 'Yes' after you have saved the seed phrase):",
        validate: (input) => {
            if (input.toLowerCase() === 'yes')
                return true;
            else {
                return 'Please input “yes” to continue.';
            }
        },
    });
    (0, utils_1.clearLines)(5);
    const seed = (0, bip39_1.mnemonicToSeedSync)(mnemonic);
    const master = hdkey_1.default.fromMasterSeed(Buffer.from(seed));
    const node = master.derive("m/44'/194'/0'/0/0");
    const privateKey = antelope_1.PrivateKey.from(wif_1.default.encode(128, node.privateKey, false).toString());
    const publicKey = privateKey.toPublic().toString();
    console.log('Key pair generation successful.\n');
    await saveKeystore(privateKey, username);
    return { privateKey, publicKey, username };
}
async function getAccountName(privateKey) {
    let baseUrl;
    if (constants_1.EXSAT_RPC_URLS && constants_1.EXSAT_RPC_URLS.length > 0) {
        baseUrl = constants_1.EXSAT_RPC_URLS[0];
    }
    else {
        const response = await utils_1.axiosInstance.get('/api/config/exsat_config');
        if (response.data.status == 'success') {
            baseUrl = response.data.info.exsat_rpc[0];
        }
    }
    const apiUrl = baseUrl + `/v1/chain/get_account`;
    return await (0, utils_1.retryRequest)(async () => {
        const accountName = await (0, prompts_1.input)({
            message: 'Enter your account name (1-8 characters):',
        });
        const fullAccountName = accountName.endsWith('.sat')
            ? accountName
            : `${accountName}.sat`;
        const response = await utils_1.axiosInstance.post(apiUrl, {
            account_name: fullAccountName,
        });
        const publicKey = response.data.permissions[0].required_auth.keys[0].key;
        if (privateKey.toPublic().toLegacyString() === publicKey) {
            return accountName;
        }
        throw new Error('Account name is not matched.');
    }, 3);
}
const importFromMnemonic = async () => {
    try {
        await (0, utils_1.retryRequest)(async () => {
            const mnemonic = await (0, utils_1.inputWithCancel)('Enter Your Seed Phrase (12 words,Input "q" to return):');
            if (!mnemonic)
                return false;
            const seed = (0, bip39_1.mnemonicToSeedSync)(mnemonic.trim());
            const master = hdkey_1.default.fromMasterSeed(Buffer.from(seed));
            const node = master.derive("m/44'/194'/0'/0/0");
            const privateKey = antelope_1.PrivateKey.from(wif_1.default.encode(128, node.privateKey, false).toString());
            (0, utils_1.clearLines)(2);
            console.log('keystore generation successful.\n');
            const username = await getAccountName(privateKey);
            await saveKeystore(privateKey, username);
        }, 3);
    }
    catch (error) {
        console.log('Seed Phrase not available');
    }
};
exports.importFromMnemonic = importFromMnemonic;
const importFromPrivateKey = async () => {
    try {
        await (0, utils_1.retryRequest)(async () => {
            const privateKeyInput = await (0, utils_1.inputWithCancel)('Enter your private key (64 characters,Input "q" to return):');
            if (!privateKeyInput)
                return false;
            const privateKey = antelope_1.PrivateKey.from(privateKeyInput);
            console.log('keystore generation successful.\n');
            const username = await getAccountName(privateKey);
            await saveKeystore(privateKey, username);
        }, 3);
    }
    catch (e) {
        console.log('Private key not available');
    }
};
exports.importFromPrivateKey = importFromPrivateKey;
const initializeAccount = async (role) => {
    const savedPath = (0, utils_1.readSelectedPath)();
    if (savedPath &&
        (0, fs_1.readdirSync)(savedPath).some((file) => file.endsWith('_keystore.json'))) {
        console.log(`\nAn account has already been created in ${savedPath}.`);
        return;
    }
    let username = await (0, prompts_1.input)({
        message: '\nEnter a username (1-8 characters, a-z): ',
    });
    if (await (0, exports.checkUsernameRegisterOrder)(username)) {
        console.log('Username is registering . Please wait for the email or change other username.');
        return;
    }
    while (!validateUsername(username) ||
        !(await (0, exports.checkUsernameWithBackend)(username))) {
        console.log('Invalid or already taken username. Please enter a username that is 1-8 characters long, contains only a-z and 1-5, and is not already taken.');
        username = await (0, prompts_1.input)({
            message: 'Enter a username (1-8 characters, a-z, 1-5): ',
        });
    }
    let email = await (0, prompts_1.input)({
        message: '\nEnter your email address(for emergency notify): ',
    });
    let confirmEmail = await (0, prompts_1.input)({
        message: 'Confirm your email address: ',
    });
    while (email !== confirmEmail || !validateEmail(email)) {
        console.log('Email addresses do not match or are invalid. Please enter your email address again.');
        email = await (0, prompts_1.input)({
            message: 'Enter your email address(for emergency notify): ',
        });
        confirmEmail = await (0, prompts_1.input)({
            message: 'Confirm your email address: ',
        });
    }
    const roleOptions = [
        { name: 'Synchronizer', value: 'Synchronizer' },
        { name: 'Validator', value: 'Validator' },
    ];
    if (!role) {
        role = await (0, prompts_1.select)({
            message: 'Select a role:',
            choices: roleOptions,
        });
    }
    let rewardAddress = '';
    let commissionRate = '';
    if (role === 'Validator') {
        commissionRate = await (0, prompts_1.input)({
            message: 'Enter commission rate (0-10000)',
            validate: (input) => {
                const number = Number(input);
                if (!Number.isInteger(number) || number < 0 || number > 10000) {
                    return 'Please enter a valid integer between 0 and 10000.';
                }
                return true;
            },
        });
        rewardAddress = await (0, prompts_1.input)({
            message: 'Enter Reward Address',
            validate: (input) => {
                if (!/^0x[a-fA-F0-9]{40}$/.test(input)) {
                    return 'Please enter a valid account name.';
                }
                return true;
            },
        });
    }
    const { publicKey } = await generateKeystore(username);
    const infoJson = '{}';
    //infoJson = await addMoreInformation();
    try {
        const response = await (0, utils_1.retryRequest)(() => utils_1.axiosInstance.post('/api/users/create-user', {
            username,
            role,
            publicKey,
            email,
            info: infoJson,
            rewardAddress,
            commissionRate: commissionRate ? Number(commissionRate) : 0,
        }));
        const { btcAddress, amount } = response.data.info;
        console.log(`Please send ${amount} BTC to the following address:`);
        qrcode_terminal_1.default.generate(btcAddress, { small: true });
        console.log(btcAddress);
        const response3 = await (0, utils_1.retryRequest)(() => utils_1.axiosInstance.get('/api/config/exsat_config'));
        console.log(`\nNetwork:${response3.data.info.btc_network}`);
        const txid = await (0, prompts_1.input)({
            message: `Enter the transaction ID after sending BTC: `,
            validate: (input) => {
                if (input.length > 64) {
                    return 'Invalid transaction ID.';
                }
                return true;
            },
        });
        const response2 = await (0, utils_1.retryRequest)(() => utils_1.axiosInstance.post('/api/users/submit-payment', {
            txid,
            amount,
            username,
        }));
        if (response2.data.status === 'success') {
            console.log(response2.data.message);
        }
        else {
            console.log('Payment not confirmed.');
            return;
        }
    }
    catch (error) {
        if (error instanceof Error) {
            console.error('Error creating account:', error.message);
        }
    }
};
exports.initializeAccount = initializeAccount;
