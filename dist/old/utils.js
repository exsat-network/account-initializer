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
exports.cmdYellowFont = exports.cmdRedFont = exports.cmdGreenFont = exports.selectDirPrompt = exports.listDirectories = exports.retryRequest = exports.axiosInstance = exports.deleteTempFile = exports.readSelectedPath = exports.saveSelectedPath = void 0;
const axios_1 = __importDefault(require("axios"));
const constants_1 = require("../constants");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const readline_sync_1 = __importDefault(require("readline-sync"));
const tempFilePath = path_1.default.join(__dirname, "keystore_path.tmp");
const saveSelectedPath = (selectedPath) => {
    fs_extra_1.default.writeFileSync(tempFilePath, selectedPath);
};
exports.saveSelectedPath = saveSelectedPath;
const readSelectedPath = () => {
    if (fs_extra_1.default.existsSync(tempFilePath)) {
        return fs_extra_1.default.readFileSync(tempFilePath, "utf8");
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
        "x-api-key": constants_1.API_SECRET,
        "Content-Type": "application/json",
    },
});
const retryRequest = (fn, retries = 3) => __awaiter(void 0, void 0, void 0, function* () {
    for (let i = 0; i < retries; i++) {
        try {
            return yield fn();
        }
        catch (error) {
            if (i === retries - 1)
                throw error;
            console.log(`Retrying... (${i + 1}/${retries})`);
        }
    }
});
exports.retryRequest = retryRequest;
const listDirectories = (currentPath) => __awaiter(void 0, void 0, void 0, function* () {
    const files = yield fs_extra_1.default.readdir(currentPath);
    const directories = files.filter((file) => fs_extra_1.default.statSync(path_1.default.join(currentPath, file)).isDirectory());
    directories.unshift(".."); // Add parent directory option
    directories.unshift("."); // Add current directory option
    return directories;
});
exports.listDirectories = listDirectories;
const validatePath = (inputPath) => {
    return fs_extra_1.default.existsSync(inputPath) && fs_extra_1.default.statSync(inputPath).isDirectory();
};
const selectDirPrompt = () => __awaiter(void 0, void 0, void 0, function* () {
    const initialChoice = readline_sync_1.default.question("\n[1]Navigate To Select \n[2]Manually Enter a directory path\nChoose a directory to save the keystore:");
    if (initialChoice === "2") {
        while (true) {
            const manualPath = readline_sync_1.default.question("Please enter the directory path: ");
            if (validatePath(manualPath)) {
                (0, exports.saveSelectedPath)(manualPath);
                return manualPath;
            }
            else {
                console.log("Invalid directory path. Please try again.");
            }
        }
    }
    else if (initialChoice === "1") {
        let currentPath = ".";
        let selectedPath = "";
        let finalSelection = false;
        while (!finalSelection) {
            const directories = yield (0, exports.listDirectories)(currentPath);
            console.log(`\nCurrent directory: ${currentPath}`);
            directories.forEach((dir, index) => {
                console.log(`[${index}] ${dir}`);
            });
            const index = readline_sync_1.default.questionInt(`Select a directory (0-${directories.length - 1}): `);
            if (index < 0 || index >= directories.length) {
                console.log("Invalid selection. Please try again.");
                continue;
            }
            const directory = directories[index];
            if (directory === "..") {
                currentPath = path_1.default.resolve(currentPath, "..");
            }
            else if (directory === ".") {
                currentPath = path_1.default.resolve(currentPath);
            }
            else {
                currentPath = path_1.default.resolve(currentPath, directory);
            }
            const finalize = readline_sync_1.default.keyInYNStrict("Do you want to finalize this directory selection? (Y/N): ");
            if (finalize) {
                finalSelection = true;
                selectedPath = currentPath;
            }
        }
        (0, exports.saveSelectedPath)(selectedPath);
        return selectedPath;
    }
    else {
        console.log('Invalid choice. Please restart and enter "1" or "2".');
        process.exit(1);
    }
});
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
