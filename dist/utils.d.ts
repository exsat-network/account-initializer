export declare function keystoreExist(role?: string): string | false | undefined;
export declare const saveSelectedPath: (selectedPath: string) => void;
export declare const readSelectedPath: () => string | null;
export declare const deleteTempFile: () => void;
export declare const axiosInstance: import("axios").AxiosInstance;
export declare const retryRequest: (fn: () => Promise<any>, retries?: number) => Promise<any>;
export declare function clearLines(numLines: number): void;
export declare function updateEnvFile(values: any): boolean;
export declare function inputWithCancel(message: string, validatefn?: (value: string) => boolean | string | Promise<string | boolean>): Promise<string | false>;
export declare function isExsatDocker(): boolean;
export declare const listDirectories: (currentPath: string) => Promise<string[]>;
export declare const selectDirPrompt: () => Promise<any>;
/**
 * Check if transaction id is 64 digit hexadecimal
 * @param txid
 */
export declare function isValidTxid(txid: string): boolean;
/**
 * Process and update string
 * @param input
 * @param filePath
 */
export declare function processAndUpdateString(input: string): string;
/**
 * Capitalize the first letter of a string
 * @param str
 */
export declare function capitalizeFirstLetter(str: string): string;
export declare const cmdGreenFont: (msg: string) => string;
export declare const cmdRedFont: (msg: string) => string;
export declare const cmdYellowFont: (msg: string) => string;
