"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeAccount = exports.processAccount = exports.importFromPrivateKey = exports.importFromMnemonic = exports.checkUsernameRegisterOrder = exports.checkUsernameWithBackend = void 0;
const bip39_1 = require("@scure/bip39");
const english_1 = require("@scure/bip39/wordlists/english");
const hdkey_1 = __importDefault(require("hdkey"));
const antelope_1 = require("@wharfkit/antelope");
const fs_1 = require("fs");
const utils_1 = require("./utils");
const web3_1 = require("./web3");
const wif_1 = __importDefault(require("wif"));
const web3_utils_1 = require("web3-utils");
const prompts_1 = require("@inquirer/prompts");
const btcResource_1 = require("./btcResource");
const validateUsername = (username) => {
    const regex = /^[a-z1-5]{1,8}$/;
    return regex.test(username);
};
const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};
const checkUsernameWithBackend = async (username) => {
    const response = await utils_1.axiosInstance.post('/api/users/check-username', {
        username,
    });
    return response.data;
};
exports.checkUsernameWithBackend = checkUsernameWithBackend;
const getInputRole = async () => {
    const role = await (0, prompts_1.select)({
        message: 'Select a role',
        choices: [
            { name: 'Synchronizer', value: 'Synchronizer' },
            { name: 'Validator', value: 'Validator' },
        ],
    });
    return role;
};
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
async function saveKeystore(privateKey, username, role) {
    let passwordInput = await (0, prompts_1.password)({
        message: 'Set a password to encrypt the private key (at least 6 characters): ',
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
    let selectedPath;
    let pathConfirm = 'yes';
    do {
        selectedPath = await (0, utils_1.selectDirPrompt)();
        if ((0, utils_1.isExsatDocker)()) {
            pathConfirm = await (0, prompts_1.input)({
                message: `Please ensure that the save path you set ( ${selectedPath} ) matches the Docker mapping path. Otherwise, your keystore file may be lost. ( Enter "yes" to continue, or "no" to go back to the previous step ):`,
                validate: (input) => {
                    if (['yes', 'no'].includes(input.toLowerCase()))
                        return true;
                    else
                        return 'Please input "yes" or "no".';
                },
            });
        }
    } while (pathConfirm.toLowerCase() === 'no');
    (0, fs_1.writeFileSync)(`${selectedPath}/${username}_keystore.json`, JSON.stringify(keystore));
    const keystoreFileKey = role.toUpperCase() + '_KEYSTORE_FILE';
    (0, utils_1.updateEnvFile)({
        [keystoreFileKey]: `${selectedPath}/${username}_keystore.json`,
    });
    console.log(`\n${(0, utils_1.cmdRedFont)('!!!Remember to backup this file!!!')}`);
    console.log(`${(0, utils_1.cmdGreenFont)(`Saved Successed: ${selectedPath}/${username}_keystore.json`)}\n`);
    return `${selectedPath}/${username}_keystore.json`;
}
async function generateKeystore(username, role) {
    const mnemonic = (0, bip39_1.generateMnemonic)(english_1.wordlist);
    console.log(`${(0, utils_1.cmdYellowFont)(`\nYour Seed Phrase: \n${mnemonic}`)}\n`);
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
    await saveKeystore(privateKey, username, role);
    return { privateKey, publicKey, username };
}
async function importAccountAndSaveKeystore(privateKey) {
    return await (0, utils_1.retryRequest)(async () => {
        const accountName = await (0, prompts_1.input)({
            message: 'Enter your account name (1-8 characters):',
        });
        const fullAccountName = accountName.endsWith('.sat')
            ? accountName
            : `${accountName}.sat`;
        const accountInfo = await (0, exports.checkUsernameWithBackend)(fullAccountName);
        if (privateKey.toPublic().toString() === accountInfo.pubkey) {
            return { accountName, ...accountInfo };
        }
        throw new Error('Account name is not matched.');
    }, 3);
}
const importFromMnemonic = async (role) => {
    if (!role) {
        role = await getInputRole();
    }
    let accountInfo;
    let privateKey;
    try {
        privateKey = await inputMnemonic();
        if (!privateKey)
            return false;
        console.log('keystore generation successful.\n');
        accountInfo = await importAccountAndSaveKeystore(privateKey);
    }
    catch (error) {
        console.log('Seed Phrase not available');
        return false;
    }
    await saveKeystore(privateKey, accountInfo.accountName, role);
    return await processAccount(accountInfo);
};
exports.importFromMnemonic = importFromMnemonic;
async function inputMnemonic() {
    const mnemonic = await (0, utils_1.inputWithCancel)('Enter Your Seed Phrase (12 words,Input "q" to return):');
    if (!mnemonic)
        return false;
    const seed = (0, bip39_1.mnemonicToSeedSync)(mnemonic.trim());
    const master = hdkey_1.default.fromMasterSeed(Buffer.from(seed));
    const node = master.derive("m/44'/194'/0'/0/0");
    const privateKey = antelope_1.PrivateKey.from(wif_1.default.encode(128, node.privateKey, false).toString());
    (0, utils_1.clearLines)(2);
    return privateKey;
}
const importFromPrivateKey = async (role) => {
    if (!role) {
        role = await getInputRole();
    }
    let account;
    let privateKey;
    try {
        const success = await (0, utils_1.retryRequest)(async () => {
            const privateKeyInput = await (0, utils_1.inputWithCancel)('Enter your private key (64 characters,Input "q" to return):');
            if (!privateKeyInput)
                return false;
            privateKey = antelope_1.PrivateKey.from(privateKeyInput);
            console.log('keystore generation successful.\n');
            account = await importAccountAndSaveKeystore(privateKey);
            return true;
        }, 3);
        if (!success)
            return false;
    }
    catch (e) {
        console.log('Private key not available');
        return;
    }
    await saveKeystore(privateKey, account.accountName, role);
    return await processAccount(account);
};
exports.importFromPrivateKey = importFromPrivateKey;
async function processAccount({ accountName, pubkey, status, btcAddress, amount, }) {
    const manageMessage = `-----------------------------------------------
   Account: ${accountName}
   Public Key: ${pubkey}
   Account Registration Status: ${status === 'initial' ? 'Unregistered. Please recharge Gas Fee (BTC) to register.' : status === 'charging' ? 'Registering, this may take a moment. Please be patient.' : status === 'completed' ? 'Registered' : status}
  -----------------------------------------------`;
    const menus = [
        {
            name: 'Return',
            value: '99',
            description: 'Return',
        },
    ];
    if (status === 'initial') {
        menus.unshift({
            name: 'Recharge BTC',
            value: 'recharge_btc',
            description: 'Recharge BTC',
        });
    }
    const actions = {
        recharge_btc: async () => await (0, btcResource_1.chargeForRegistry)(accountName, btcAddress, amount),
    };
    let action;
    do {
        action = await (0, prompts_1.select)({
            message: manageMessage,
            choices: menus,
        });
        if (action !== '99') {
            await (actions[action] || (() => { }))();
        }
    } while (action !== '99');
}
exports.processAccount = processAccount;
const initializeAccount = async (role) => {
    const keystoreFile = (0, utils_1.keystoreExist)(role);
    if (keystoreFile) {
        console.log(`\nAn account has already been created in ${keystoreFile}.`);
        return;
    }
    let registryStatus;
    const username = await (0, prompts_1.input)({
        message: 'Enter an Account Name (1-8 characters, a-z, 1-5. Input "q" to return): ',
        validate: async (input) => {
            if (input === 'q')
                return true;
            if (!validateUsername(input)) {
                return 'Please enter an Account Name that is 1-8 characters long, contains only a-z and 1-5.';
            }
            try {
                const response = await (0, exports.checkUsernameWithBackend)(input);
                registryStatus = response.status;
                switch (registryStatus) {
                    case 'valid':
                        return true;
                    case 'chain_off':
                        return 'The network query failed. Please try again later or contact the administrator.';
                    default:
                        return 'This username is already registered. Please enter another one.';
                }
            }
            catch (e) {
                return `Request Error:${e.message}`;
            }
        },
    });
    if (username === 'q')
        return false;
    console.log((0, utils_1.cmdGreenFont)(`  Your Account : ${username}.sat`));
    let email = await (0, prompts_1.input)({
        message: 'Enter your email address(for emergency notify): ',
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
    if (!role) {
        role = await getInputRole();
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
    const { publicKey } = await generateKeystore(username, role);
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
        await (0, btcResource_1.chargeForRegistry)(username, btcAddress, amount);
    }
    catch (error) {
        if (error instanceof Error) {
            console.error('Error creating account:', error.message);
        }
    }
};
exports.initializeAccount = initializeAccount;
