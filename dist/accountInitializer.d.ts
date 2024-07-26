export declare const checkUsernameWithBackend: (username: string) => Promise<any>;
export declare const checkUsernameRegisterOrder: (username: string) => Promise<boolean>;
export declare const importFromMnemonic: () => Promise<void>;
export declare const importFromPrivateKey: () => Promise<void>;
export declare function processAccount({ accountName, pubkey, status, btcAddress, amount, }: {
    accountName: any;
    pubkey: any;
    status: any;
    btcAddress: any;
    amount: any;
}): Promise<void>;
export declare const initializeAccount: (role?: any) => Promise<false | undefined>;
