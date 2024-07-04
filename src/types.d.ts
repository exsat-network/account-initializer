declare module "readline-sync";
declare module "dotenv" {
  export function config(options?: {
    path?: string;
    encoding?: string;
    debug?: boolean;
  }): { error?: Error; parsed?: { [key: string]: string } };

  export const parse: (
    src: string | Buffer,
    options?: { debug?: boolean }
  ) => { [key: string]: string };

  export const DotenvConfigOptions: {
    path: string;
    encoding: string;
    debug: boolean;
  };

  export const DotenvParseOptions: {
    debug: boolean;
  };
}

