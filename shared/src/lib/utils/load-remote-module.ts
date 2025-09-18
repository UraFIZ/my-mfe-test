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
  // Check if remote is already loaded and properly initialized
  if (
    isRemoteLoaded(remoteName) &&
    typeof window[remoteName].get === 'function'
  ) {
    console.log(`Remote ${remoteName} already loaded, using cached version`);
    return loadModule(remoteName, exposedModule);
  }

  console.log(`Loading remote ${remoteName} from ${remoteEntry}`);

  // Load remote entry script with retry mechanism
  await loadScriptWithRetry(remoteEntry, 3);

  // Wait for remote to be available with timeout
  await waitForRemote(remoteName, 5000);

  // Initialize and register the remote container
  if (!window[remoteName]) {
    throw new Error(
      `Remote ${remoteName} not found after loading ${remoteEntry}`
    );
  }

  // Register the remote in our registry
  registerRemote(remoteName, window[remoteName]);

  return loadModule(remoteName, exposedModule);
}

async function loadScriptWithRetry(
  src: string,
  retries: number
): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await loadScript(src);
      return;
    } catch (error) {
      if (i === retries - 1) {
        throw error;
      }
      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, 100 * (i + 1)));
    }
  }
}

async function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if script already exists
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      // If script exists but hasn't loaded the remote yet, wait a bit
      if (!window[extractRemoteName(src)]) {
        setTimeout(() => {
          window[extractRemoteName(src)]
            ? resolve()
            : reject(
                new Error(`Script loaded but remote not available: ${src}`)
              );
        }, 100);
      } else {
        resolve();
      }
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

async function waitForRemote(
  remoteName: string,
  timeout: number
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (window[remoteName] && typeof window[remoteName].get === 'function') {
      return;
    }
    // Wait 50ms before checking again
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error(`Timeout waiting for remote ${remoteName} to be available`);
}

function extractRemoteName(url: string): string {
  // Extract remote name from URL - assumes format like http://localhost:4201/remoteEntry.js
  // and maps to remoteName like 'usersMfe'
  if (url.includes('4201')) return 'usersMfe';
  if (url.includes('4202')) return 'dashboardMfe';
  return 'unknown';
}

// Add a global container registry to track loaded remotes
const remoteRegistry = new Map<string, any>();

function isRemoteLoaded(remoteName: string): boolean {
  return remoteRegistry.has(remoteName) && window[remoteName];
}

function registerRemote(remoteName: string, container: any): void {
  remoteRegistry.set(remoteName, container);
}

async function loadModule(scope: string, module: string): Promise<any> {
  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(
        `Loading module ${module} from ${scope} (attempt ${attempt})`
      );

      // Ensure __webpack_init_sharing__ is available
      if (typeof __webpack_init_sharing__ === 'function') {
        await __webpack_init_sharing__('default');
      }

      const container = window[scope];
      if (!container) {
        throw new Error(`Container ${scope} not found`);
      }

      // Initialize the container if it has an init method
      if (typeof container.init === 'function') {
        if (typeof __webpack_share_scopes__ !== 'undefined') {
          await container.init(__webpack_share_scopes__.default);
        } else {
          await container.init({});
        }
      }

      // Verify container has the get method
      if (typeof container.get !== 'function') {
        throw new Error(`Container ${scope} does not have a get method`);
      }

      // Get the module factory
      const factory = await container.get(module);
      if (!factory) {
        throw new Error(`Module ${module} not found in container ${scope}`);
      }

      // Execute the factory to get the module
      const Module = factory();

      console.log(`Successfully loaded module ${module} from ${scope}`);
      return Module;
    } catch (error) {
      lastError = error as Error;
      console.error(
        `Error loading module ${module} from ${scope} (attempt ${attempt}):`,
        error
      );

      // Wait before retrying
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
      }
    }
  }

  // If all retries failed, throw the last error
  throw new Error(
    `Failed to load module ${module} from ${scope} after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`
  );
}

// Webpack specific globals
declare const __webpack_init_sharing__: (scope: string) => Promise<void>;
declare const __webpack_share_scopes__: { default: any };
