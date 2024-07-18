export type InitializeAccountOptions = {
    role?: 'Synchronizer' | 'Validator';
};
export declare const showMenu: (options?: InitializeAccountOptions) => Promise<void>;
