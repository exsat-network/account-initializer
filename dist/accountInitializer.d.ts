export declare const checkUsernameWithBackend: (username: any) => Promise<any>;
export declare const importFromMnemonic: (role?: any) => Promise<false | void>;
export declare const importFromPrivateKey: (role?: any) => Promise<false | void>;
export declare const processAccount: ({ accountName, pubkey, status, btcAddress, amount, }: {
    accountName: any;
    pubkey: any;
    status: any;
    btcAddress: any;
    amount: any;
}) => Promise<void>;
export declare const initializeAccount: (role: any) => Promise<false | undefined>;
