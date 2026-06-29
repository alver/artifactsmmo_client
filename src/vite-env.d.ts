/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** ArtifactsMMO JWT, exposed from .env for dev convenience (see vite.config.ts). */
  readonly TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
