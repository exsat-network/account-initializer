"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showMenu = void 0;
const accountInitializer_1 = require("./accountInitializer");
const query_1 = require("./query");
const btcResource_1 = require("./btcResource"); // Import the new function
const prompts_1 = require("@inquirer/prompts");
const utils_1 = require("./utils");
const fs_1 = require("fs");
const showMenu = async (options) => {
    const keystoreFile = (0, utils_1.keystoreExist)();
    let choices;
    if (keystoreFile) {
        choices = [
            { name: 'Process Account', value: '6' },
            { name: 'Query Account', value: '2' },
            { name: 'Exit', value: '99' },
        ];
    }
    else {
        choices = [
            { name: 'Initialize Account', value: '1' },
            { name: 'Query Account', value: '2' },
            { name: 'Charging BTC for Resource', value: '3' },
            { name: 'Generate Keystore From Mnemonic', value: '4' },
            { name: 'Generate Keystore From PrivateKey', value: '5' },
            { name: 'change email', value: '7' },
            { name: 'Exit', value: '99' },
        ];
    }
    const choice = await (0, prompts_1.select)({
        message: 'Select an option: ',
        choices: choices.map((choice) => ({
            name: choice.name,
            value: choice.value,
        })),
    });
    switch (choice) {
        case '1':
            await (0, accountInitializer_1.initializeAccount)(options?.role);
            break;
        case '2':
            await (0, query_1.queryAccount)();
            break;
        case '3':
            await (0, btcResource_1.chargeBtcForResource)(process.env.VALIDATOR_KEYSTORE_FILE); // Call the new function
            break;
        case '4':
        case '5':
            const role = await (0, prompts_1.select)({
                message: 'Select a role: ',
                choices: [
                    { name: 'Sycnhronizer', value: 'Synchronizer' },
                    { name: 'Validator', value: 'Validator' },
                ],
            });
            if (choice === '4') {
                await (0, accountInitializer_1.importFromMnemonic)(role);
            }
            else {
                await (0, accountInitializer_1.importFromPrivateKey)(role);
            }
            break;
        case '6':
            if (!keystoreFile)
                return;
            const keystore = (0, fs_1.readFileSync)(keystoreFile, 'utf-8');
            const accountInfo = JSON.parse(keystore);
            const response = await (0, accountInitializer_1.checkUsernameWithBackend)(accountInfo.username);
            if (accountInfo.address !== response.pubkey) {
                return;
            }
            if (['initial', 'charging'])
                await (0, accountInitializer_1.processAccount)({
                    ...response,
                    accountName: accountInfo.username,
                });
            break;
        case '7':
            const username = await (0, prompts_1.input)({
                message: 'Input your username: ',
            });
            const email = await (0, prompts_1.input)({
                message: 'Input your email: ',
            });
            await (0, accountInitializer_1.changeEmail)(username, email);
            break;
        case '99':
            console.log('Exiting...');
            process.exit(0);
        default:
            console.log('Invalid choice. Please try again.');
            await (0, exports.showMenu)();
            break;
    }
};
exports.showMenu = showMenu;
