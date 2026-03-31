declare module '@base44/sdk/dist/utils/axios-client' {
  export function createAxiosClient(options: {
    baseURL?: string;
    headers?: Record<string, string>;
    token?: string | null;
    interceptResponses?: boolean;
  }): {
    get: (url: string) => Promise<unknown>;
    post: (url: string, data?: unknown) => Promise<unknown>;
    put: (url: string, data?: unknown) => Promise<unknown>;
    delete: (url: string) => Promise<unknown>;
  };
}
