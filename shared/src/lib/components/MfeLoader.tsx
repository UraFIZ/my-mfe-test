import React, { Suspense, lazy, useEffect, useState } from 'react';
import { loadRemoteModule } from '../utils/load-remote-module';
import { log } from '../utils/logger';

interface MfeLoaderProps {
    mfeId: string;
    port: string | number;
}

export const MfeLoader: React.FC<MfeLoaderProps> = ({ mfeId, port }) => {
    const [Component, setComponent] = useState<React.ComponentType | null>(null);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const loadMfe = async () => {
            try {
                log(`Loading MFE: ${mfeId} from port ${port}`);

                const module = await loadRemoteModule({
                    remoteEntry: `http://localhost:${port}/remoteEntry.js`,
                    remoteName: mfeId,
                    exposedModule: './Module',
                });

                if (module && module.default) {
                    setComponent(() => module.default);
                } else if (module) {
                    setComponent(() => module);
                } else {
                    throw new Error(`Failed to load module from ${mfeId}`);
                }
            } catch (err) {
                console.error(`Error loading MFE ${mfeId}:`, err);
                setError(err as Error);
            }
        };

        loadMfe();
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
