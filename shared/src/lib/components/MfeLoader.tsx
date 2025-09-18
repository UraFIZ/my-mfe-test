import React, { Suspense, useEffect, useState, useCallback } from 'react';
import { loadRemoteModule } from '../utils/load-remote-module';
import { log } from '../utils/logger';

interface MfeLoaderProps {
    mfeId: string;
    port: string | number;
}

interface LoadingState {
    isLoading: boolean;
    error: Error | null;
    component: React.ComponentType | null;
    retryCount: number;
    loadingKey: number; // Used to force re-renders on retry
}

// Error Boundary for MFE components
class MfeErrorBoundary extends React.Component<
    {
        children: React.ReactNode;
        onRetry: () => void;
        mfeId: string;
    },
    { hasError: boolean; error: Error | null }
> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('MFE Error Boundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '20px',
                    background: '#ffe6e6',
                    borderRadius: '8px',
                    margin: '20px',
                    border: '1px solid #ffcccc'
                }}>
                    <h3 style={{ margin: '0 0 15px', color: '#dc3545' }}>
                        MFE Runtime Error: {this.props.mfeId}
                    </h3>
                    <p style={{ margin: '0 0 15px', color: '#721c24' }}>
                        {this.state.error?.message || 'An unexpected error occurred'}
                    </p>
                    <button
                        onClick={() => {
                            this.setState({ hasError: false, error: null });
                            this.props.onRetry();
                        }}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Retry Loading MFE
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export const MfeLoader: React.FC<MfeLoaderProps> = ({ mfeId, port }) => {
    const [state, setState] = useState<LoadingState>({
        isLoading: true,
        error: null,
        component: null,
        retryCount: 0,
        loadingKey: 0
    });

    const loadMfe = useCallback(async (retryAttempt = 0) => {
        try {
            log(`Loading MFE: ${mfeId} from port ${port} (attempt ${retryAttempt + 1})`);

            setState(prev => ({
                ...prev,
                isLoading: true,
                error: null,
                retryCount: retryAttempt,
                loadingKey: prev.loadingKey + 1
            }));

            // Add a small delay to ensure DOM is ready on retry
            if (retryAttempt > 0) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            const module = await loadRemoteModule({
                remoteEntry: `http://localhost:${port}/remoteEntry.js`,
                remoteName: mfeId,
                exposedModule: './Module',
            });

            let ComponentToRender: React.ComponentType;

            if (module && module.default) {
                ComponentToRender = module.default;
            } else if (module) {
                ComponentToRender = module;
            } else {
                throw new Error(`Failed to load module from ${mfeId} - no component found`);
            }

            setState(prev => ({
                ...prev,
                isLoading: false,
                component: ComponentToRender,
                error: null
            }));

        } catch (err) {
            console.error(`Error loading MFE ${mfeId}:`, err);
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: err as Error,
                component: null
            }));
        }
    }, [mfeId, port]);

    const handleRetry = useCallback(() => {
        loadMfe(state.retryCount + 1);
    }, [loadMfe, state.retryCount]);

    useEffect(() => {
        loadMfe(0);
    }, [loadMfe]);

    // Loading state
    if (state.isLoading) {
        return (
            <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                background: '#f8f9fa',
                borderRadius: '8px',
                margin: '20px'
            }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid #e9ecef',
                    borderTop: '4px solid #007bff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 20px'
                }}></div>
                <h3 style={{ margin: '0 0 10px', color: '#495057' }}>
                    Loading {mfeId}...
                </h3>
                {state.retryCount > 0 && (
                    <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
                        Retry attempt {state.retryCount + 1}
                    </p>
                )}
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    // Error state
    if (state.error) {
        return (
            <div style={{
                padding: '20px',
                background: '#ffe6e6',
                borderRadius: '8px',
                margin: '20px',
                border: '1px solid #ffcccc'
            }}>
                <h3 style={{ margin: '0 0 15px', color: '#dc3545' }}>
                    Error Loading MFE: {mfeId}
                </h3>
                <p style={{ margin: '0 0 15px', color: '#721c24' }}>
                    {state.error.message}
                </p>

                <div style={{ marginBottom: '15px' }}>
                    <button
                        onClick={handleRetry}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            marginRight: '10px'
                        }}
                    >
                        Retry Loading
                    </button>
                    <small style={{ color: '#6c757d' }}>
                        Attempts: {state.retryCount + 1}
                    </small>
                </div>

                <details>
                    <summary style={{ cursor: 'pointer', color: '#495057' }}>
                        Technical Details
                    </summary>
                    <div style={{
                        marginTop: '10px',
                        padding: '10px',
                        background: '#f8f9fa',
                        borderRadius: '4px',
                        fontSize: '12px'
                    }}>
                        <strong>Error Stack:</strong>
                        <pre style={{
                            marginTop: '5px',
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word'
                        }}>
                            {state.error.stack}
                        </pre>
                    </div>
                </details>

                <div style={{
                    marginTop: '15px',
                    padding: '10px',
                    background: '#fff3cd',
                    borderRadius: '4px',
                    fontSize: '14px'
                }}>
                    <strong>Troubleshooting tips:</strong>
                    <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
                        <li>Check if the MFE is running on port {port}</li>
                        <li>Verify the remoteEntry.js is accessible at http://localhost:{port}/remoteEntry.js</li>
                        <li>Check browser console for CORS or network errors</li>
                        <li>Try refreshing the page or navigating back to home first</li>
                    </ul>
                </div>
            </div>
        );
    }

    // No component loaded state
    if (!state.component) {
        return (
            <div style={{
                padding: '20px',
                textAlign: 'center',
                background: '#fff3cd',
                borderRadius: '8px',
                margin: '20px'
            }}>
                <h3 style={{ margin: '0 0 10px', color: '#856404' }}>
                    No Component Available
                </h3>
                <p style={{ margin: '0 0 15px', color: '#856404' }}>
                    MFE {mfeId} loaded but no component was found
                </p>
                <button
                    onClick={handleRetry}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Retry Loading
                </button>
            </div>
        );
    }

    // Successfully loaded - render the component
    const Component = state.component;

    return (
        <MfeErrorBoundary onRetry={handleRetry} mfeId={mfeId}>
            <Suspense fallback={
                <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    margin: '20px'
                }}>
                    <div>Loading {mfeId} content...</div>
                </div>
            }>
                <Component key={state.loadingKey} />
            </Suspense>
        </MfeErrorBoundary>
    );
};
