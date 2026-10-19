/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Spring Boot API, e.g. http://localhost:8080
   *  Leave unset to use local mock data (fallback mode). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
