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
exports.initializeAccount = void 0;
const bip39_1 = require("@scure/bip39");
const english_1 = require("@scure/bip39/wordlists/english");
const hdkey_1 = __importDefault(require("hdkey"));
const antelope_1 = require("@wharfkit/antelope");
const readline_sync_1 = __importDefault(require("readline-sync"));
const fs_1 = require("fs");
const qrcode_terminal_1 = __importDefault(require("qrcode-terminal"));
const utils_1 = require("./utils");
const web3_1 = require("./web3");
const wif_1 = __importDefault(require("wif"));
const web3_utils_1 = require("web3-utils");
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
const initializeAccount = () => __awaiter(void 0, void 0, void 0, function* () {
    const savedPath = (0, utils_1.readSelectedPath)();
    if (savedPath &&
        (0, fs_1.readdirSync)(savedPath).some((file) => file.endsWith("_keystore.json"))) {
        console.log(`\nAn account has already been created in ${savedPath}.`);
        return;
    }
    let username = readline_sync_1.default.question("\nEnter a username (1-7 characters, a-z): ");
    if (yield checkUsernameRegisterOrder(username)) {
        console.log("Username is registering . Please wait for the email or change other username.");
        return;
    }
    while (!validateUsername(username) ||
        !(yield checkUsernameWithBackend(username))) {
        console.log("Invalid or already taken username. Please enter a username that is 1-7 characters long, contains only a-z and 1-5, and is not already taken.");
        username = readline_sync_1.default.question("Enter a username (1-7 characters, a-z, 1-5): ");
    }
    let email = readline_sync_1.default.question("\nEnter your email address(for emergency notify): ");
    let confirmEmail = readline_sync_1.default.question("Confirm your email address: ");
    while (email !== confirmEmail || !validateEmail(email)) {
        console.log("Email addresses do not match or are invalid. Please enter your email address again.");
        email = readline_sync_1.default.question("Enter your email address(for emergency notify): ");
        confirmEmail = readline_sync_1.default.question("Confirm your email address: ");
    }
    const addInfo = readline_sync_1.default.keyInYNStrict("Do you want to add more information for promotion? : ");
    let infoJson;
    if (addInfo) {
        const inputMethod = readline_sync_1.default.keyInYNStrict("\n* Manually enter the information [y]\n* Import it from a JSON file from profile.html [n]:\n ");
        if (inputMethod) {
            // let website = readlineSync.question("Enter your website URL: ");
            // while (!validateUrl(website)) {
            //   console.log("Invalid URL. Please enter a valid website URL.");
            //   website = readlineSync.question("Enter your website URL: ");
            // }
            const name = readline_sync_1.default.question("Enter your group or company name: ");
            const profile = readline_sync_1.default.question("Enter your profile (supports markdown): ");
            let logo = readline_sync_1.default.question("Enter your logo link URL(256x256px or 1024x1024px): ");
            while (!validateUrl(logo)) {
                console.log("Invalid URL. Please enter a valid logo link URL.");
                logo = readline_sync_1.default.question("Enter your logo link URL(256x256px or 1024x1024px): ");
            }
            // const pub_email = readlineSync.question("Enter your public Email: ");
            infoJson = JSON.stringify({
                // website,
                logo,
                name,
                profile,
                // email: pub_email,
            });
        }
        else {
            const filePath = readline_sync_1.default.question("Enter the path to your JSON file: ");
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
        "\n1. Pool (Synchronizer)",
        "2. Validator",
        "3. Custodian SP",
    ];
    console.log("Select a role:");
    roleOptions.forEach((option) => console.log(option));
    let role = readline_sync_1.default.question("Enter the number of your role choice: ");
    while (!["1", "2", "3"].includes(role)) {
        console.log("Invalid choice. Please select a valid role number.");
        role = readline_sync_1.default.question("Enter the number of your role choice: ");
    }
    role = roleOptions[parseInt(role) - 1].split(" ")[1].replace(/[()]/g, "");
    const mnemonic = (0, bip39_1.generateMnemonic)(english_1.wordlist);
    console.log(`Your mnemonic phrase: \n`);
    console.log(`${(0, utils_1.cmdGreenFont)(mnemonic)}\n`);
    readline_sync_1.default.question("Press [Enter] button after you have saved your mnemonic phrase.");
    const seed = (0, bip39_1.mnemonicToSeedSync)(mnemonic);
    const master = hdkey_1.default.fromMasterSeed(Buffer.from(seed));
    const node = master.derive("m/44'/194'/0'/0/0");
    const privateKey = antelope_1.PrivateKey.from(wif_1.default.encode(128, node.privateKey, false).toString());
    const publicKey = privateKey.toPublic().toString();
    console.log(`\nPrivate Key: ${(0, utils_1.cmdGreenFont)(privateKey.toString())}`);
    console.log(`Public Key: ${(0, utils_1.cmdGreenFont)(publicKey)}\n`);
    console.log("Key pair generation successful.\n");
    const password = readline_sync_1.default.questionNewPassword("Enter a password to encrypt your private key(>= 6 digits): ", { min: 6 });
    const keystore = yield (0, web3_1.createKeystore)(`${(0, web3_utils_1.bytesToHex)(node.privateKey)}`, password, username);
    console.log(`\nKeystore created successfully.\n`);
    // console.log(keystore);
    // const decryptedPrivateKey = await decryptKeystore(keystore, password);
    // console.log(`\ndecryptedPrivateKey.${decryptedPrivateKey}\n`);
    const selectedPath = yield (0, utils_1.selectDirPrompt)();
    (0, fs_1.writeFileSync)(`${selectedPath}/${username}_keystore.json`, JSON.stringify(keystore));
    console.log(`\n${(0, utils_1.cmdRedFont)("!!!Remember to backup this file!!!")}\n`);
    console.log(`\n${(0, utils_1.cmdGreenFont)(`Saved Successed: ${selectedPath}/${username}_keystore.json`)}\n`);
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
        const txid = readline_sync_1.default.question("Enter the transaction ID after sending BTC: ");
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
