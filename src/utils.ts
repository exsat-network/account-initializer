import axios from 'axios';
import { API_URL, API_SECRET } from './constants';
import fs from 'fs-extra';
import path from 'path';
import { select, input, confirm } from '@inquirer/prompts';

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

export const retryRequest = async (
  fn: () => Promise<any>,
  retries = 3,
): Promise<any> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`Retrying... (${i + 1}/${retries})`);
    }
  }
};

export const listDirectories = async (currentPath: string) => {
  const files = await fs.readdir(currentPath);
  const directories = files.filter((file) =>
    fs.statSync(path.join(currentPath, file)).isDirectory(),
  );
  directories.unshift('..'); // Add parent directory option
  directories.unshift('.'); // Add current directory option
  return directories;
};

const validatePath = (inputPath: string): boolean => {
  return fs.existsSync(inputPath) && fs.statSync(inputPath).isDirectory();
};

export const selectDirPrompt = async () => {
  const rootPath = path.resolve('.');
  const initialChoice = await select({
    message: '\nChoose a directory to save the keystore:',
    choices: [
      { name: 'Navigate To Select', value: '1' },
      { name: `Client Root Directory(path:${rootPath})`, value: '2' },
      { name: 'Manually Enter a Directory Path', value: '3' },
    ],
  });

  if (initialChoice === '3') {
    while (true) {
      const manualPath = await input({
        message: 'Please enter the directory path: ',
        validate: (input) => {
          if (validatePath(input)) {
            return true;
          }
          return 'Invalid directory path. Please try again.';
        },
      });
      saveSelectedPath(manualPath);
      return manualPath;
    }
  } else if (initialChoice === '2') {
    saveSelectedPath(rootPath);
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

    saveSelectedPath(selectedPath);
    return selectedPath;
  }
};

export const cmdGreenFont = (msg: string) => {
  return `\x1b[32m${msg}\x1b[0m`;
};
export const cmdRedFont = (msg: string) => {
  return `\x1b[31m${msg}\x1b[0m`;
};
export const cmdYellowFont = (msg: string) => {
  return `\x1b[33m${msg}\x1b[0m`;
};
