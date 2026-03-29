export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } };

export interface IpcContract {
  // Add specific IPC channels here as the application grows
  app: {
    getVersion: () => Promise<Result<string>>;
  };
}
