import type { ReactNode } from 'react';

declare module 'react-dom' {
  export function render(
    element: ReactNode,
    container: Element | DocumentFragment | null,
    callback?: (() => void) | null
  ): void;

  const ReactDOM: {
    render(
      element: ReactNode,
      container: Element | DocumentFragment | null,
      callback?: (() => void) | null
    ): void;
  };

  export default ReactDOM;
}

export {};
