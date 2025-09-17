declare global {
  interface Window {
    [key: string]: any;
  }
}

interface LoadRemoteModuleOptions {
  remoteEntry: string;
  remoteName: string;
  exposedModule: string;
}

export async function loadRemoteModule({
  remoteEntry,
  remoteName,
  exposedModule,
}: LoadRemoteModuleOptions): Promise<any> {
  // Check if remote is already loaded
  if (window[remoteName]) {
    return loadModule(remoteName, exposedModule);
  }

  // Load remote entry script
  await loadScript(remoteEntry);

  // Initialize the remote container
  if (!window[remoteName]) {
    throw new Error(
      `Remote ${remoteName} not found after loading ${remoteEntry}`
    );
  }

  return loadModule(remoteName, exposedModule);
}

async function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if script already exists
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.type = 'text/javascript';
    script.async = true;

    script.onload = () => {
      console.log(`Loaded script: ${src}`);
      resolve();
    };

    script.onerror = () => {
      reject(new Error(`Failed to load script: ${src}`));
    };

    document.head.appendChild(script);
  });
}

async function loadModule(scope: string, module: string): Promise<any> {
  // Ensure __webpack_init_sharing__ is available
  await __webpack_init_sharing__('default');

  const container = window[scope];

  // Initialize the container
  await container.init(__webpack_share_scopes__.default);

  // Get the module factory
  const factory = await container.get(module);

  // Execute the factory to get the module
  const Module = factory();

  return Module;
}

// Webpack specific globals
declare const __webpack_init_sharing__: (scope: string) => Promise<void>;
declare const __webpack_share_scopes__: { default: any };
