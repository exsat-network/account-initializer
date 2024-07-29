"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cmdYellowFont = exports.cmdRedFont = exports.cmdGreenFont = exports.selectDirPrompt = exports.listDirectories = exports.inputWithCancel = exports.updateEnvFile = exports.clearLines = exports.retryRequest = exports.axiosInstance = exports.deleteTempFile = exports.readSelectedPath = exports.saveSelectedPath = exports.keystoreExist = void 0;
const axios_1 = __importDefault(require("axios"));
const constants_1 = require("./constants");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const prompts_1 = require("@inquirer/prompts");
const dotenv = __importStar(require("dotenv"));
const node_util_1 = require("node:util");
const os = __importStar(require("node:os"));
function keystoreExist() {
    if (process.env.KEYSTORE_FILE && fs_extra_1.default.existsSync(process.env.KEYSTORE_FILE)) {
        return process.env.KEYSTORE_FILE;
    }
    const dir = path_1.default.resolve(__dirname, '..');
    const files = fs_extra_1.default.readdirSync(dir);
    for (let i = 0; i < files.length; i++) {
        if (files[i].endsWith('_keystore.json'))
            return files[i];
    }
    return false;
}
exports.keystoreExist = keystoreExist;
const tempFilePath = path_1.default.join(__dirname, 'keystore_path.tmp');
const saveSelectedPath = (selectedPath) => {
    fs_extra_1.default.writeFileSync(tempFilePath, selectedPath);
};
exports.saveSelectedPath = saveSelectedPath;
const readSelectedPath = () => {
    if (fs_extra_1.default.existsSync(tempFilePath)) {
        return fs_extra_1.default.readFileSync(tempFilePath, 'utf8');
    }
    return null;
};
exports.readSelectedPath = readSelectedPath;
const deleteTempFile = () => {
    if (fs_extra_1.default.existsSync(tempFilePath)) {
        fs_extra_1.default.unlinkSync(tempFilePath);
    }
};
exports.deleteTempFile = deleteTempFile;
exports.axiosInstance = axios_1.default.create({
    baseURL: constants_1.API_URL,
    timeout: 10000,
    headers: {
        'x-api-key': constants_1.API_SECRET,
        'Content-Type': 'application/json',
    },
});
const retryRequest = async (fn, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        }
        catch (error) {
            if (i === retries - 1)
                throw error;
            console.log(`Retrying... (${i + 1}/${retries})`);
        }
    }
};
exports.retryRequest = retryRequest;
function clearLines(numLines) {
    for (let i = 0; i < numLines; i++) {
        process.stdout.write('\x1B[2K'); // Clear current line
        process.stdout.write('\x1B[1A'); // Move cursor up one line
    }
    process.stdout.write('\x1B[2K'); // Clear current line
}
exports.clearLines = clearLines;
function updateEnvFile(values) {
    const envFilePath = '.env';
    if (!fs_extra_1.default.existsSync(envFilePath)) {
        fs_extra_1.default.writeFileSync(envFilePath, '');
    }
    const envConfig = dotenv.parse(fs_extra_1.default.readFileSync(envFilePath));
    Object.keys(values).forEach((key) => {
        envConfig[key] = values[key];
    });
    // Read original .env file contents
    const originalEnvContent = fs_extra_1.default.readFileSync(envFilePath, 'utf-8');
    // Parse original .env file contents
    const parsedEnv = dotenv.parse(originalEnvContent);
    // Build updated .env file contents, preserving comments and structure
    const updatedLines = originalEnvContent.split('\n').map((line) => {
        const [key] = line.split('=');
        if (key && envConfig[key.trim()]) {
            return `${key}=${envConfig[key.trim()]}`;
        }
        return line;
    });
    // Check if any new key-value pairs need to be added to the end of the file
    Object.keys(envConfig).forEach((key) => {
        if (!parsedEnv.hasOwnProperty(key)) {
            updatedLines.push(`${key}=${envConfig[key]}`);
        }
    });
    // Concatenate updated content into string
    const updatedEnvContent = updatedLines.join('\n');
    // Write back the updated .env file contents
    fs_extra_1.default.writeFileSync(envFilePath, updatedEnvContent);
    return true;
}
exports.updateEnvFile = updateEnvFile;
async function inputWithCancel(message, validatefn) {
    const value = await (0, prompts_1.input)({
        message: message,
        validate: (input) => {
            if (input.toLowerCase() === 'q') {
                return true;
            }
            if (typeof validatefn === 'function') {
                return validatefn(input);
            }
            return true;
        },
    });
    if (value.toLowerCase() === 'q') {
        return false;
    }
    return value;
}
exports.inputWithCancel = inputWithCancel;
const listDirectories = async (currentPath) => {
    const files = await fs_extra_1.default.readdir(currentPath);
    const directories = files.filter((file) => fs_extra_1.default.statSync(path_1.default.join(currentPath, file)).isDirectory());
    directories.unshift('..'); // Add parent directory option
    directories.unshift('.'); // Add current directory option
    return directories;
};
exports.listDirectories = listDirectories;
const validatePath = (inputPath) => {
    return fs_extra_1.default.existsSync(inputPath) && fs_extra_1.default.statSync(inputPath).isDirectory();
};
const access = (0, node_util_1.promisify)(fs_extra_1.default.access);
const mkdir = (0, node_util_1.promisify)(fs_extra_1.default.mkdir);
async function checkAndCreatePath(directoryPath) {
    const parentDir = path_1.default.dirname(directoryPath);
    if (fs_extra_1.default.existsSync(directoryPath)) {
        return; // Directory already exists
    }
    if (directoryPath === parentDir) {
        // Reached the root directory, stop recursion
        throw new Error('Cannot create directory at the root level.');
    }
    if (!fs_extra_1.default.existsSync(parentDir)) {
        // Recursively check and create the parent directory
        await checkAndCreatePath(parentDir);
    }
    // Check if we have permission to create the directory
    await access(parentDir, fs_extra_1.default.constants.W_OK);
    // Create the directory
    await mkdir(directoryPath);
}
const selectDirPrompt = async () => {
    const rootPath = path_1.default.resolve(os.homedir() + '/.exsat');
    const initialChoice = await (0, prompts_1.select)({
        message: '\nChoose a directory to save the keystore:',
        choices: [
            { name: 'Navigate To Select', value: '1' },
            { name: `Client Root Directory(path:${rootPath})`, value: '2' },
            { name: 'Manually Enter a Directory Path', value: '3' },
        ],
    });
    if (initialChoice === '3') {
        let attempts = 0;
        const maxAttempts = 3;
        while (attempts < maxAttempts) {
            try {
                const manualPath = await (0, prompts_1.input)({
                    message: 'Please enter the directory path: ',
                });
                await checkAndCreatePath(manualPath);
                return manualPath;
            }
            catch (error) {
                attempts++;
                if (attempts < maxAttempts) {
                    console.log('Invalid directory path or insufficient permissions. Please try again.');
                }
                else {
                    console.log('Maximum retry attempts reached. Exiting.');
                    throw error;
                }
            }
        }
    }
    else if (initialChoice === '2') {
        await checkAndCreatePath(rootPath);
        return rootPath;
    }
    else if (initialChoice === '1') {
        let currentPath = '.';
        let selectedPath = '';
        let finalSelection = false;
        while (!finalSelection) {
            const directories = await (0, exports.listDirectories)(currentPath);
            const index = await (0, prompts_1.select)({
                message: `\nCurrent directory: ${currentPath}\nSelect a directory:`,
                choices: directories.map((dir, idx) => ({
                    name: dir,
                    value: idx,
                })),
            });
            const directory = directories[index];
            if (directory === '..') {
                currentPath = path_1.default.resolve(currentPath, '..');
            }
            else if (directory === '.') {
                currentPath = path_1.default.resolve(currentPath);
            }
            else {
                currentPath = path_1.default.resolve(currentPath, directory);
            }
            const finalize = await (0, prompts_1.confirm)({
                message: 'Do you want to finalize this directory selection? (Y/N): ',
            });
            if (finalize) {
                finalSelection = true;
                selectedPath = currentPath;
            }
        }
        return selectedPath;
    }
};
exports.selectDirPrompt = selectDirPrompt;
const cmdGreenFont = (msg) => {
    return `\x1b[32m${msg}\x1b[0m`;
};
exports.cmdGreenFont = cmdGreenFont;
const cmdRedFont = (msg) => {
    return `\x1b[31m${msg}\x1b[0m`;
};
exports.cmdRedFont = cmdRedFont;
const cmdYellowFont = (msg) => {
    return `\x1b[33m${msg}\x1b[0m`;
};
exports.cmdYellowFont = cmdYellowFont;
