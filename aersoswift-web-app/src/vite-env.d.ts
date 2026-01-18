/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SOLACE_URL: string;
  readonly VITE_SOLACE_VPN: string;
  readonly VITE_SOLACE_USERNAME: string;
  readonly VITE_SOLACE_PASSWORD: string;
  readonly VITE_VIDEO_TOPIC: string;
  readonly VITE_ANALYTICS_TOPIC: string;
  readonly VITE_DEMO_MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
