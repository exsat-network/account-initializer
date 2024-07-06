import axios from "axios";
import { API_URL, API_SECRET } from "../constants";
import fs from "fs-extra";
import path from "path";
import readlineSync from "readline-sync";

const tempFilePath = path.join(__dirname, "keystore_path.tmp");

export const saveSelectedPath = (selectedPath: string) => {
  fs.writeFileSync(tempFilePath, selectedPath);
};

export const readSelectedPath = (): string | null => {
  if (fs.existsSync(tempFilePath)) {
    return fs.readFileSync(tempFilePath, "utf8");
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
    "x-api-key": API_SECRET,
    "Content-Type": "application/json",
  },
});

export const retryRequest = async (
  fn: () => Promise<any>,
  retries = 3
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
    fs.statSync(path.join(currentPath, file)).isDirectory()
  );
  directories.unshift(".."); // Add parent directory option
  directories.unshift("."); // Add current directory option
  return directories;
};

const validatePath = (inputPath: string): boolean => {
  return fs.existsSync(inputPath) && fs.statSync(inputPath).isDirectory();
};

export const selectDirPrompt = async () => {
  const initialChoice = readlineSync.question(
    "\n[1]Navigate To Select \n[2]Manually Enter a directory path\nChoose a directory to save the keystore:"
  );

  if (initialChoice === "2") {
    while (true) {
      const manualPath = readlineSync.question(
        "Please enter the directory path: "
      );
      if (validatePath(manualPath)) {
        saveSelectedPath(manualPath);
        return manualPath;
      } else {
        console.log("Invalid directory path. Please try again.");
      }
    }
  } else if (initialChoice === "1") {
    let currentPath = ".";
    let selectedPath = "";
    let finalSelection = false;

    while (!finalSelection) {
      const directories = await listDirectories(currentPath);

      console.log(`\nCurrent directory: ${currentPath}`);
      directories.forEach((dir, index) => {
        console.log(`[${index}] ${dir}`);
      });

      const index = readlineSync.questionInt(
        `Select a directory (0-${directories.length - 1}): `
      );

      if (index < 0 || index >= directories.length) {
        console.log("Invalid selection. Please try again.");
        continue;
      }

      const directory = directories[index];

      if (directory === "..") {
        currentPath = path.resolve(currentPath, "..");
      } else if (directory === ".") {
        currentPath = path.resolve(currentPath);
      } else {
        currentPath = path.resolve(currentPath, directory);
      }

      const finalize = readlineSync.keyInYNStrict(
        "Do you want to finalize this directory selection? (Y/N): "
      );

      if (finalize) {
        finalSelection = true;
        selectedPath = currentPath;
      }
    }

    saveSelectedPath(selectedPath);
    return selectedPath;
  } else {
    console.log(
      'Invalid choice. Please restart and enter "1" or "2".'
    );
    process.exit(1);
  }
};


export const cmdGreenFont = (msg: string) => {
  return `\x1b[32m${msg}\x1b[0m`;
}
export const cmdRedFont = (msg: string) => {
  return `\x1b[31m${msg}\x1b[0m`;
}
export const cmdYellowFont = (msg: string) => {
  return `\x1b[33m${msg}\x1b[0m`;
}