declare module "sql.js" {
  interface SqlJsStatic {
    Database: typeof Database;
  }

  class Database {
    constructor(data?: ArrayLike<number> | Buffer | null);
    run(sql: string, params?: any[]): Database;
    exec(sql: string, params?: any[]): QueryExecResult[];
    export(): Uint8Array;
    close(): void;
    prepare(sql: string): Statement;
  }

  class Statement {
    bind(params?: any[]): boolean;
    step(): boolean;
    get(params?: any): any[];
    getAsObject(params?: any): Record<string, any>;
    run(params?: any[]): void;
    reset(): void;
    free(): boolean;
    freemem(): void;
    getColumnNames(): string[];
    getSQL(): string;
    getNormalizedSQL(): string;
  }

  interface QueryExecResult {
    columns: string[];
    values: any[][];
  }

  interface InitSqlJsOptions {
    locateFile?: (file: string) => string;
  }

  function initSqlJs(options?: InitSqlJsOptions): Promise<SqlJsStatic>;

  export default initSqlJs;
  export { Database, QueryExecResult, Statement, SqlJsStatic, InitSqlJsOptions };
}
