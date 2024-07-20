export declare const checkUsernameWithBackend: (username: string) => Promise<boolean>;
export declare const checkUsernameRegisterOrder: (username: string) => Promise<boolean>;
export declare const importFromMnemonic: () => Promise<void>;
export declare const importFromPrivateKey: () => Promise<void>;
export declare const initializeAccount: (role?: any) => Promise<void>;
