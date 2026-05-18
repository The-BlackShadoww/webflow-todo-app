/// <reference types="@webflow/designer-extension-typings" />

declare global {
  interface Window {
    _myWebflow: typeof webflow;
  }
}

export {};
