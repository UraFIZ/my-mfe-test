import React, { Suspense, useEffect, useState } from 'react';
import { loadRemoteModule } from '../utils/load-remote-module';
import { log } from '../utils/logger';

interface MfeLoaderProps {
    mfeId: string;
    port: string | number;
}

type RemoteComponent = React.ComponentType<unknown>;
type RemoteModule = RemoteComponent | { default?: RemoteComponent };

export const MfeLoader: React.FC<MfeLoaderProps> = ({ mfeId, port }) => {
    const [Component, setComponent] = useState<React.ComponentType | null>(null);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let isMounted = true;

        const loadMfe = async () => {
            try {
                log(`Loading MFE: ${mfeId} from port ${port}`);

                const module = await loadRemoteModule<RemoteModule>({
                    remoteEntry: `http://localhost:${port}/remoteEntry.js`,
                    remoteName: mfeId,
                    exposedModule: './Module',
                });

                if (!isMounted) {
                    return;
                }

                if (isModuleWithDefault(module)) {
                    setComponent(() => module.default);
                } else if (isComponent(module)) {
                    setComponent(() => module);
                } else {
                    throw new Error(`Failed to load module from ${mfeId}`);
                }
            } catch (err) {
                if (!isMounted) {
                    return;
                }

                console.error(`Error loading MFE ${mfeId}:`, err);
                setError(err as Error);
            }
        };

        loadMfe();

        return () => {
            isMounted = false;
        };
    }, [mfeId, port]);

    if (error) {
        return (
            <div style={{ padding: '20px', background: '#ffe6e6', borderRadius: '8px', margin: '20px' }}>
                <h3>Error Loading MFE: {mfeId}</h3>
                <p>{error.message}</p>
                <details>
                    <summary>Stack Trace</summary>
                    <pre>{error.stack}</pre>
                </details>
            </div>
        );
    }

    if (!Component) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <h3>Loading {mfeId}...</h3>
            </div>
        );
    }

    return (
        <Suspense fallback={<div>Loading MFE content...</div>}>
            <Component />
        </Suspense>
    );
};

function isModuleWithDefault(module: RemoteModule): module is { default: RemoteComponent } {
    return (
        typeof module === 'object' &&
        module !== null &&
        'default' in module &&
        typeof module.default === 'function'
    );
}

function isComponent(module: RemoteModule): module is RemoteComponent {
    return typeof module === 'function';
}
