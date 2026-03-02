declare module "better-sqlite3" {
  interface Options {
    readonly?: boolean;
    fileMustExist?: boolean;
    timeout?: number;
    verbose?: (...params: any[]) => void;
  }

  type RunResult = { changes: number; lastInsertRowid: number };

  interface Statement<BindParams = any, Row = any> {
    run(...params: BindParams[]): RunResult;
    get(...params: BindParams[]): Row | undefined;
    all(...params: BindParams[]): Row[];
    iterate(...params: BindParams[]): IterableIterator<Row>;
  }

  class Database {
    constructor(path: string, options?: Options);
    prepare<BindParams = any, Row = any>(sql: string): Statement<BindParams, Row>;
    transaction<T extends (...params: any[]) => any>(fn: T): T;
    close(): void;
    exec(sql: string): this;
  }

  export default Database;
}
