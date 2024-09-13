export declare const checkUsernameWithBackend: (username: any) => Promise<any>;
export declare const importFromMnemonic: (role?: any) => Promise<any>;
export declare const importFromPrivateKey: (role?: any) => Promise<any>;
export declare const processAccount: ({ accountName, pubkey, status, btcAddress, amount, }: {
    accountName: any;
    pubkey: any;
    status: any;
    btcAddress: any;
    amount: any;
}) => Promise<any>;
export declare const initializeAccount: (role: any) => Promise<string | false | undefined>;
