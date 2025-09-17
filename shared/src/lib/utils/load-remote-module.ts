declare global {
  interface Window {
    [key: string]: unknown;
  }
}

interface LoadRemoteModuleOptions {
  remoteEntry: string;
  remoteName: string;
  exposedModule: string;
}

const REMOTE_READY_TIMEOUT_MS = 5000;
const REMOTE_POLL_INTERVAL_MS = 50;
const REMOTE_RETRY_DELAY_MS = 300;
const REMOTE_MAX_ATTEMPTS = 3;

export async function loadRemoteModule<TModule = unknown>({
  remoteEntry,
  remoteName,
  exposedModule,
}: LoadRemoteModuleOptions): Promise<TModule> {
  if (window[remoteName]) {
    return loadModule<TModule>(remoteName, exposedModule);
  }

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < REMOTE_MAX_ATTEMPTS; attempt += 1) {
    try {
      await loadRemoteEntry(remoteEntry, attempt);

      const remoteAvailable = await waitForRemote(remoteName);

      if (remoteAvailable) {
        return loadModule<TModule>(remoteName, exposedModule);
      }
    } catch (error) {
      lastError = error as Error;
    }

    if (attempt < REMOTE_MAX_ATTEMPTS - 1) {
      await delay(REMOTE_RETRY_DELAY_MS * (attempt + 1));
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error(`Remote ${remoteName} not found after loading ${remoteEntry}`);
}

async function loadRemoteEntry(remoteEntry: string, attempt: number): Promise<void> {
  removeExistingRemoteEntry(remoteEntry);

  const scriptUrl = attempt === 0
    ? remoteEntry
    : appendCacheBustingParam(remoteEntry, attempt);

  return loadScript(scriptUrl, remoteEntry);
}

async function loadScript(src: string, remoteEntryId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.type = 'text/javascript';
    script.async = true;
    script.dataset.remoteEntry = remoteEntryId;

    script.onload = () => {
      resolve();
    };

    script.onerror = () => {
      script.remove();
      reject(new Error(`Failed to load script: ${remoteEntryId}`));
    };

    document.head.appendChild(script);
  });
}

function removeExistingRemoteEntry(remoteEntry: string) {
  const existingScript = document.querySelector<HTMLScriptElement>(
    `script[data-remote-entry="${remoteEntry}"]`
  );

  existingScript?.remove();
}

function appendCacheBustingParam(src: string, attempt: number): string {
  try {
    const url = new URL(src);
    url.searchParams.set('mfecache', `${Date.now()}-${attempt}`);
    return url.toString();
  } catch {
    const cacheBustValue = `${Date.now()}-${attempt}`;
    const separator = src.includes('?') ? '&' : '?';
    return `${src}${separator}mfecache=${cacheBustValue}`;
  }
}

async function waitForRemote(remoteName: string): Promise<boolean> {
  const startTime = Date.now();

  while (!window[remoteName] && Date.now() - startTime < REMOTE_READY_TIMEOUT_MS) {
    await delay(REMOTE_POLL_INTERVAL_MS);
  }

  return Boolean(window[remoteName]);
}

function delay(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

interface RemoteContainer {
  init(shareScope: unknown): Promise<void> | void;
  get(module: string): Promise<() => unknown>;
}

async function loadModule<TModule>(scope: string, module: string): Promise<TModule> {
  // Ensure __webpack_init_sharing__ is available
  await __webpack_init_sharing__('default');

  const container = window[scope] as RemoteContainer | undefined;

  if (!container) {
    throw new Error(`Container ${scope} is not available on window`);
  }

  // Initialize the container
  await container.init(__webpack_share_scopes__.default);

  // Get the module factory
  const factory = await container.get(module);

  // Execute the factory to get the module
  return factory() as TModule;
}

// Webpack specific globals
declare const __webpack_init_sharing__: (scope: string) => Promise<void>;
declare const __webpack_share_scopes__: { default: unknown };
