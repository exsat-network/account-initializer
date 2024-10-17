export declare function checkUsernameWithBackend(username: any): Promise<any>;
export declare function importFromMnemonic(role: any): Promise<any>;
export declare function importFromPrivateKey(role: any): Promise<any>;
export declare function processAccount({ accountName, pubkey, status, btcAddress, amount }: {
    accountName: any;
    pubkey: any;
    status: any;
    btcAddress: any;
    amount: any;
}): Promise<any>;
export declare function changeEmail(username: any, email: any): Promise<boolean>;
export declare function initializeAccount(role: any): Promise<string | false | undefined>;
