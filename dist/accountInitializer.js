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
exports.initializeAccount = exports.importFromPrivateKey = exports.importFromMnemonic = void 0;
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
const validateUrl = (value) => {
    try {
        new URL(value);
        return true;
    }
    catch (_) {
        return false;
    }
};
const validateUserInfo = (data) => {
    return (
    // typeof data.website === "string" &&
    // validateUrl(data.website) &&
    typeof data.logo === "string" &&
        validateUrl(data.logo) &&
        typeof data.name === "string" &&
        typeof data.profile === "string");
};
const validateUsername = (username) => {
    const regex = /^[a-z1-5]{1,7}$/;
    return regex.test(username);
};
const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};
const checkUsernameWithBackend = (username) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield utils_1.axiosInstance.post("/api/users/check-username", {
            username,
        });
        return response.data.valid;
    }
    catch (error) {
        if (error instanceof Error) {
            console.error("Error checking username with backend:", error.message);
        }
        return false;
    }
});
const checkUsernameRegisterOrder = (username) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield (0, utils_1.retryRequest)(() => utils_1.axiosInstance.post("/api/users/my", { username }));
        const accountInfo = response.data;
        if (accountInfo.status === "success") {
            return true;
        }
        else {
            return false;
        }
    }
    catch (error) {
        if (error instanceof Error) {
            console.error("Error checking username with backend:", error.message);
        }
        return false;
    }
});
function saveKeystore(privateKey, username) {
    return __awaiter(this, void 0, void 0, function* () {
        const passwordInput = yield (0, prompts_1.password)({
            message: "Enter a password to encrypt your private key(>= 6 digits): ",
            mask: '*',
            validate: (input) => input.length >= 6 || "Password must be at least 6 characters long."
        });
        const keystore = yield (0, web3_1.createKeystore)(`${(0, web3_utils_1.bytesToHex)(wif_1.default.decode(privateKey.toWif(), 128).privateKey)}`, passwordInput, username);
        console.log(`\nKeystore created successfully.\n`);
        // console.log(keystore);
        // const decryptedPrivateKey = await decryptKeystore(keystore, passwordInput);
        // console.log(`\ndecryptedPrivateKey.${decryptedPrivateKey}\n`);
        const selectedPath = yield (0, utils_1.selectDirPrompt)();
        (0, fs_1.writeFileSync)(`${selectedPath}/${username}_keystore.json`, JSON.stringify(keystore));
        console.log(`\n${(0, utils_1.cmdRedFont)("!!!Remember to backup this file!!!")}\n`);
        console.log(`\n${(0, utils_1.cmdGreenFont)(`Saved Successed: ${selectedPath}/${username}_keystore.json`)}\n`);
    });
}
function generateKeystore(username) {
    return __awaiter(this, void 0, void 0, function* () {
        const mnemonic = (0, bip39_1.generateMnemonic)(english_1.wordlist);
        console.log(`Your mnemonic phrase: \n`);
        console.log(`${(0, utils_1.cmdGreenFont)(mnemonic)}\n`);
        yield (0, prompts_1.input)({
            message: "Press [Enter] button after you have saved your mnemonic phrase.",
        });
        const seed = (0, bip39_1.mnemonicToSeedSync)(mnemonic);
        const master = hdkey_1.default.fromMasterSeed(Buffer.from(seed));
        const node = master.derive("m/44'/194'/0'/0/0");
        const privateKey = antelope_1.PrivateKey.from(wif_1.default.encode(128, node.privateKey, false).toString());
        const publicKey = privateKey.toPublic().toString();
        console.log(`\nPrivate Key: ${(0, utils_1.cmdGreenFont)(privateKey.toString())}`);
        console.log(`Public Key: ${(0, utils_1.cmdGreenFont)(publicKey)}\n`);
        console.log("Key pair generation successful.\n");
        yield saveKeystore(privateKey, username);
        return { privateKey, publicKey, username };
    });
}
function getAccountName(privateKey) {
    return __awaiter(this, void 0, void 0, function* () {
        const apiUrl = `${constants_1.EOS_RPC_URL}/v1/chain/get_account`;
        return yield (0, utils_1.retryRequest)(() => __awaiter(this, void 0, void 0, function* () {
            const accountName = yield (0, prompts_1.input)({
                message: "Enter your account name (1-7 characters):"
            });
            const fullAccountName = accountName.endsWith('.xsat') ? accountName : `${accountName}.xsat`;
            const response = yield utils_1.axiosInstance.post(apiUrl, {
                account_name: fullAccountName,
            });
            const publicKey = response.data.permissions[0].required_auth.keys[0].key;
            if (privateKey.toPublic().toLegacyString() === publicKey) {
                return accountName;
            }
            throw new Error("Account name is not matched.");
        }), 3);
    });
}
const importFromMnemonic = () => __awaiter(void 0, void 0, void 0, function* () {
    const mnemonic = yield (0, prompts_1.input)({
        message: "Enter your mnemonic phrase (12 words):"
    });
    const seed = (0, bip39_1.mnemonicToSeedSync)(mnemonic.trim());
    const master = hdkey_1.default.fromMasterSeed(Buffer.from(seed));
    const node = master.derive("m/44'/194'/0'/0/0");
    const privateKey = antelope_1.PrivateKey.from(wif_1.default.encode(128, node.privateKey, false).toString());
    const publicKey = privateKey.toPublic().toString();
    console.log(`\nPrivate Key: ${(0, utils_1.cmdGreenFont)(privateKey.toString())}`);
    console.log(`Public Key: ${(0, utils_1.cmdGreenFont)(publicKey)}\n`);
    console.log("Key pair generation successful.\n");
    const username = yield getAccountName(privateKey);
    yield saveKeystore(privateKey, username);
});
exports.importFromMnemonic = importFromMnemonic;
const importFromPrivateKey = () => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, utils_1.retryRequest)(() => __awaiter(void 0, void 0, void 0, function* () {
        const privateKeyInput = yield (0, prompts_1.input)({
            message: "Enter your private key (64 characters):"
        });
        const privateKey = antelope_1.PrivateKey.from(privateKeyInput);
        const username = yield getAccountName(privateKey);
        yield saveKeystore(privateKey, username);
    }), 3);
});
exports.importFromPrivateKey = importFromPrivateKey;
const initializeAccount = () => __awaiter(void 0, void 0, void 0, function* () {
    const savedPath = (0, utils_1.readSelectedPath)();
    if (savedPath &&
        (0, fs_1.readdirSync)(savedPath).some((file) => file.endsWith("_keystore.json"))) {
        console.log(`\nAn account has already been created in ${savedPath}.`);
        return;
    }
    let username = yield (0, prompts_1.input)({
        message: "\nEnter a username (1-7 characters, a-z): ",
    });
    if (yield checkUsernameRegisterOrder(username)) {
        console.log("Username is registering . Please wait for the email or change other username.");
        return;
    }
    while (!validateUsername(username) ||
        !(yield checkUsernameWithBackend(username))) {
        console.log("Invalid or already taken username. Please enter a username that is 1-7 characters long, contains only a-z and 1-5, and is not already taken.");
        username = yield (0, prompts_1.input)({
            message: "Enter a username (1-7 characters, a-z, 1-5): ",
        });
    }
    let email = yield (0, prompts_1.input)({
        message: "\nEnter your email address(for emergency notify): ",
    });
    let confirmEmail = yield (0, prompts_1.input)({
        message: "Confirm your email address: ",
    });
    while (email !== confirmEmail || !validateEmail(email)) {
        console.log("Email addresses do not match or are invalid. Please enter your email address again.");
        email = yield (0, prompts_1.input)({
            message: "Enter your email address(for emergency notify): ",
        });
        confirmEmail = yield (0, prompts_1.input)({
            message: "Confirm your email address: ",
        });
    }
    const addInfo = yield (0, prompts_1.confirm)({
        message: "Do you want to add more information for promotion? : ",
    });
    let infoJson;
    if (addInfo) {
        const inputMethod = yield (0, prompts_1.confirm)({
            message: "\n* Manually enter the information [y]\n* Import it from a JSON file from profile.html [n]:\n ",
        });
        if (inputMethod) {
            // let website = await input({ message: "Enter your website URL: " });
            // while (!validateUrl(website)) {
            //   console.log("Invalid URL. Please enter a valid website URL.");
            //   website = await input({ message: "Enter your website URL: " });
            // }
            const name = yield (0, prompts_1.input)({ message: "Enter your group or company name: " });
            const profile = yield (0, prompts_1.input)({
                message: "Enter your profile (supports markdown): ",
            });
            let logo = yield (0, prompts_1.input)({
                message: "Enter your logo link URL(256x256px or 1024x1024px): ",
            });
            while (!validateUrl(logo)) {
                console.log("Invalid URL. Please enter a valid logo link URL.");
                logo = yield (0, prompts_1.input)({
                    message: "Enter your logo link URL(256x256px or 1024x1024px): ",
                });
            }
            // const pub_email = await input({ message: "Enter your public Email: " });
            infoJson = JSON.stringify({
                // website,
                logo,
                name,
                profile,
                // email: pub_email,
            });
        }
        else {
            const filePath = yield (0, prompts_1.input)({
                message: "Enter the path to your JSON file: ",
            });
            try {
                const data = JSON.parse((0, fs_1.readFileSync)(filePath, "utf-8"));
                console.log(data);
                if (validateUserInfo(data)) {
                    infoJson = JSON.stringify(data);
                }
                else {
                    console.log("Invalid JSON format. Please check the file and try again.");
                    return;
                }
            }
            catch (error) {
                if (error instanceof Error) {
                    console.error("Error reading JSON file:", error.message);
                }
                return;
            }
        }
    }
    const roleOptions = [
        { name: "Pool (Synchronizer)", value: "Pool" },
        { name: "Validator", value: "Validator" },
        { name: "Custodian SP", value: "Custodian SP" },
    ];
    const role = yield (0, prompts_1.select)({
        message: "Select a role:",
        choices: roleOptions,
    });
    const { publicKey } = yield generateKeystore(username);
    try {
        const response = yield (0, utils_1.retryRequest)(() => utils_1.axiosInstance.post("/api/users/create-user", {
            username,
            role,
            publicKey,
            email,
            info: infoJson,
        }));
        const { btcAddress, amount } = response.data.info;
        console.log(`Please send ${amount} BTC to the following address:`);
        qrcode_terminal_1.default.generate(btcAddress, { small: true });
        console.log(btcAddress);
        const txid = yield (0, prompts_1.input)({
            message: "Enter the transaction ID after sending BTC: ",
        });
        const response2 = yield (0, utils_1.retryRequest)(() => utils_1.axiosInstance.post("/api/users/submit-payment", {
            txid,
            amount,
            username,
        }));
        if (response2.data.status === "success") {
            console.log(response2.data.message);
        }
        else {
            console.log("Payment not confirmed.");
            return;
        }
    }
    catch (error) {
        if (error instanceof Error) {
            console.error("Error creating account:", error.message);
        }
    }
});
exports.initializeAccount = initializeAccount;
