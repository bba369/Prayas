/// <reference types="vite/client" />

interface PromiseConstructor {
  try<T>(fn: () => T | PromiseLike<T>): Promise<T>;
}

declare module '*?url' {
  const content: string;
  export default content;
}
