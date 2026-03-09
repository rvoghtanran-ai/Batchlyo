declare module '*.svg' {
  import * as React from 'react';
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement> & { title?: string }>;
  const src: string;
  export default src;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}

declare module '*.bmp' {
  const content: string;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_PAYPAL_CLIENT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Augment NodeJS namespace if @types/node is present
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY?: string;
    VITE_PAYPAL_CLIENT_ID?: string;
    [key: string]: string | undefined;
  }
}
