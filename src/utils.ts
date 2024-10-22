import axios from 'axios';
import { API_URL, API_SECRET } from './constants';
import fs from 'fs-extra';
import path from 'path';
import { select, input, confirm } from '@inquirer/prompts';
import * as dotenv from 'dotenv';
import { promisify } from 'node:util';
import * as os from 'node:os';

export function keystoreExist(role?: string) {
  if (role) {
    const keystoreFileKey = role.toUpperCase() + '_KEYSTORE_FILE';
    if (process.env[keystoreFileKey] && fs.existsSync(process.env[keystoreFileKey] ?? '')) {
      return process.env[keystoreFileKey];
    }
  }
  const dir = path.resolve(__dirname, '..');
  const files = fs.readdirSync(dir);
  for (let i = 0; i < files.length; i++) {
    if (files[i].endsWith('_keystore.json')) return files[i];
  }
  return false;
}

const tempFilePath = path.join(__dirname, 'keystore_path.tmp');

export const saveSelectedPath = (selectedPath: string) => {
  fs.writeFileSync(tempFilePath, selectedPath);
};

export const readSelectedPath = (): string | null => {
  if (fs.existsSync(tempFilePath)) {
    return fs.readFileSync(tempFilePath, 'utf8');
  }
  return null;
};

export const deleteTempFile = () => {
  if (fs.existsSync(tempFilePath)) {
    fs.unlinkSync(tempFilePath);
  }
};

export const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000, // 10 seconds timeout
  headers: {
    'x-api-key': API_SECRET,
    'Content-Type': 'application/json',
  },
});

export const retryRequest = async (fn: () => Promise<any>, retries = 3): Promise<any> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`Retrying... (${i + 1}/${retries})`);
    }
  }
};

export function clearLines(numLines: number) {
  for (let i = 0; i < numLines; i++) {
    process.stdout.write('\x1B[2K'); // Clear current line
    process.stdout.write('\x1B[1A'); // Move cursor up one line
  }
  process.stdout.write('\x1B[2K'); // Clear current line
}

export function updateEnvFile(values) {
  let envFilePath;
  if (isExsatDocker()) {
    envFilePath = path.join(process.cwd(), '.exsat', '.env');
  } else {
    envFilePath = path.join(process.cwd(), '.env');
  }
  if (!fs.existsSync(envFilePath)) {
    fs.writeFileSync(envFilePath, '');
  }
  const envConfig = dotenv.parse(fs.readFileSync(envFilePath));
  Object.keys(values).forEach((key) => {
    envConfig[key] = values[key];
  });
  // Read original .env file contents
  const originalEnvContent = fs.readFileSync(envFilePath, 'utf-8');

  // Parse original .env file contents
  const parsedEnv = dotenv.parse(originalEnvContent);

  // Build updated .env file contents, preserving comments and structure
  const updatedLines = originalEnvContent.split('\n').map((line) => {
    const [key] = line.split('=');
    if (key && envConfig.hasOwnProperty(key)) {
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
  fs.writeFileSync(envFilePath, updatedEnvContent);

  return true;
}

export async function inputWithCancel(
  message: string,
  validatefn?: (value: string) => boolean | string | Promise<string | boolean>,
) {
  const value = await input({
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

export function isExsatDocker(): boolean {
  try {
    // Check for /.dockerenv file
    if (fs.existsSync('/exsat.lock')) {
      return true;
    }
  } catch (err) {
    console.error('Error checking if running in Docker: ', err);
  }

  return false;
}

export const listDirectories = async (currentPath: string) => {
  const files = await fs.readdir(currentPath);
  const directories = files.filter((file) => fs.statSync(path.join(currentPath, file)).isDirectory());
  directories.unshift('..'); // Add parent directory option
  directories.unshift('.'); // Add current directory option
  return directories;
};

const validatePath = (inputPath: string): boolean => {
  return fs.existsSync(inputPath) && fs.statSync(inputPath).isDirectory();
};
const access = promisify(fs.access);
const mkdir = promisify(fs.mkdir);

async function checkAndCreatePath(directoryPath: string): Promise<void> {
  const parentDir = path.dirname(directoryPath);

  if (fs.existsSync(directoryPath)) {
    return; // Directory already exists
  }
  if (directoryPath === parentDir) {
    // Reached the root directory, stop recursion
    throw new Error('Cannot create directory at the root level.');
  }
  if (!fs.existsSync(parentDir)) {
    // Recursively check and create the parent directory
    await checkAndCreatePath(parentDir);
  }

  // Check if we have permission to create the directory
  await access(parentDir, fs.constants.W_OK);

  // Create the directory
  await mkdir(directoryPath);
}

export const selectDirPrompt = async () => {
  let rootPath;
  let choices;
  if (!isExsatDocker()) {
    rootPath = path.resolve(os.homedir() + '/.exsat');
    choices = [
      { name: `Home Path(path: ${rootPath})`, value: '2' },
      { name: 'Navigate To Select', value: '1' },
      { name: 'Manually Enter a Directory Path', value: '3' },
    ];
  } else {
    rootPath = path.resolve('/app/.exsat');
    choices = [
      { name: `Root Path(path: ${rootPath})`, value: '2' },
      { name: 'Manually Enter a Directory Path', value: '3' },
    ];
  }
  const initialChoice = await select({
    message: '\nChoose a directory to save the keystore: ',
    choices: choices,
  });

  if (initialChoice === '3') {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const manualPath = await input({
          message: 'Please enter the directory path: ',
        });

        await checkAndCreatePath(manualPath);
        return manualPath;
      } catch (error) {
        attempts++;
        if (attempts < maxAttempts) {
          console.log('Invalid directory path or insufficient permissions. Please try again.');
        } else {
          console.log('Maximum retry attempts reached. Exiting.');
          throw error;
        }
      }
    }
  } else if (initialChoice === '2') {
    await checkAndCreatePath(rootPath);
    return rootPath;
  } else if (initialChoice === '1') {
    let currentPath = '.';
    let selectedPath = '';
    let finalSelection = false;

    while (!finalSelection) {
      const directories = await listDirectories(currentPath);

      const index = await select({
        message: `\nCurrent directory: ${currentPath}\nSelect a directory:`,
        choices: directories.map((dir, idx) => ({
          name: dir,
          value: idx,
        })),
      });

      const directory = directories[index];

      if (directory === '..') {
        currentPath = path.resolve(currentPath, '..');
      } else if (directory === '.') {
        currentPath = path.resolve(currentPath);
      } else {
        currentPath = path.resolve(currentPath, directory);
      }

      const finalize = await confirm({
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

/**
 * Check if transaction id is 64 digit hexadecimal
 * @param txid
 */
export function isValidTxid(txid: string): boolean {
  // Check if the length is 64
  if (txid.length !== 64) {
    return false;
  }
  // Check if it is hexadecimal
  const hexRegex = /^[0-9a-fA-F]+$/;
  return hexRegex.test(txid);
}
export function capitalizeFirstLetter(str: string): string {
  if (!str) return str;
  const [first, ...rest] = str;
  return `${first.toUpperCase()}${rest.join('')}`;
}

export const cmdGreenFont = (msg: string) => {
  return `\x1b[32m${msg}\x1b[0m`;
};
export const cmdRedFont = (msg: string) => {
  return `\x1b[31m${msg}\x1b[0m`;
};
export const cmdYellowFont = (msg: string) => {
  return `\x1b[33m${msg}\x1b[0m`;
};
