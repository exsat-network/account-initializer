"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cmdYellowFont = exports.cmdRedFont = exports.cmdGreenFont = exports.selectDirPrompt = exports.listDirectories = exports.retryRequest = exports.axiosInstance = exports.deleteTempFile = exports.readSelectedPath = exports.saveSelectedPath = void 0;
const axios_1 = __importDefault(require("axios"));
const constants_1 = require("./constants");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const prompts_1 = require("@inquirer/prompts");
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
const listDirectories = async (currentPath) => {
    const files = await fs_extra_1.default.readdir(currentPath);
    const directories = files.filter((file) => fs_extra_1.default.statSync(path_1.default.join(currentPath, file)).isDirectory());
    directories.unshift(".."); // Add parent directory option
    directories.unshift("."); // Add current directory option
    return directories;
};
exports.listDirectories = listDirectories;
const validatePath = (inputPath) => {
    return fs_extra_1.default.existsSync(inputPath) && fs_extra_1.default.statSync(inputPath).isDirectory();
};
const selectDirPrompt = async () => {
    const initialChoice = await (0, prompts_1.select)({
        message: "\nChoose a directory to save the keystore:",
        choices: [
            { name: "Navigate To Select", value: "1" },
            { name: "Manually Enter a directory path", value: "2" },
        ],
    });
    if (initialChoice === "2") {
        while (true) {
            const manualPath = await (0, prompts_1.input)({
                message: "Please enter the directory path: ",
                validate: (input) => {
                    if (validatePath(input)) {
                        return true;
                    }
                    return "Invalid directory path. Please try again.";
                },
            });
            (0, exports.saveSelectedPath)(manualPath);
            return manualPath;
        }
    }
    else if (initialChoice === "1") {
        let currentPath = ".";
        let selectedPath = "";
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
            if (directory === "..") {
                currentPath = path_1.default.resolve(currentPath, "..");
            }
            else if (directory === ".") {
                currentPath = path_1.default.resolve(currentPath);
            }
            else {
                currentPath = path_1.default.resolve(currentPath, directory);
            }
            const finalize = await (0, prompts_1.confirm)({
                message: "Do you want to finalize this directory selection? (Y/N): ",
            });
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
