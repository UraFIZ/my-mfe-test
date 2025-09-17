import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

interface MfeConfig {
  name: string;
  port: number;
  envVar: string;
}

const MFE_PORTS: Record<string, MfeConfig> = {
  'users-mfe': {
    name: 'Users MFE',
    port: 4201,
    envVar: 'NX_USERS_MFE_PORT',
  },
  'dashboard-mfe': {
    name: 'Dashboard MFE',
    port: 4202,
    envVar: 'NX_DASHBOARD_MFE_PORT',
  },
};

const runningProcesses: ChildProcess[] = [];

// Format console output with app name prefix
function formatOutput(
  name: string,
  color: typeof chalk.blue,
  message: string
): string {
  const prefix = color(`[${name}]`);
  return `${prefix} ${message}`;
}

// Get list of available MFE app names from the project structure
export async function getMfeAppNames(): Promise<string[]> {
  const rootDir = process.cwd();
  const entries = await fs.promises.readdir(rootDir, { withFileTypes: true });

  const mfeApps = entries
    .filter(
      (entry) =>
        entry.isDirectory() &&
        entry.name.endsWith('-mfe') &&
        fs.existsSync(path.join(rootDir, entry.name, 'project.json'))
    )
    .map((entry) => entry.name);

  return mfeApps;
}

// Start a single application process
function startProcess(
  name: string,
  command: string,
  color: typeof chalk.blue,
  env?: NodeJS.ProcessEnv
): ChildProcess {
  console.log(
    formatOutput(
      name,
      color,
      chalk.yellow(`Starting on port ${env?.PORT || 'default'}...`)
    )
  );

  const childEnv: NodeJS.ProcessEnv = { ...process.env, ...env };
  // Ensure ts-node project settings stay scoped to the orchestrator only.
  // Child Nx/webpack processes don't need the loader configuration and
  // inheriting the TS_NODE_PROJECT path causes lookups relative to each
  // project's working directory, triggering ENOENT errors for files outside
  // their tree.
  childEnv.TS_NODE_PROJECT = undefined;

  const childProcess = spawn(command, [], {
    env: childEnv,
    shell: true,
    stdio: 'pipe',
  });

  // Handle stdout
  childProcess.stdout?.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    lines.forEach((line: string) => {
      // Filter out noisy webpack output if needed
      if (
        !line.includes('webpack.Progress') &&
        !line.includes('asset') &&
        !line.includes('chunk')
      ) {
        console.log(formatOutput(name, color, line));
      }
    });
  });

  // Handle stderr
  childProcess.stderr?.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    lines.forEach((line: string) => {
      // Only show actual errors, not warnings
      if (
        line.toLowerCase().includes('error') ||
        line.toLowerCase().includes('failed')
      ) {
        console.error(formatOutput(name, color, chalk.red(line)));
      }
    });
  });

  childProcess.on('error', (error) => {
    console.error(
      formatOutput(name, color, chalk.red(`Failed to start: ${error.message}`))
    );
  });

  childProcess.on('exit', (code) => {
    if (code !== 0) {
      console.log(
        formatOutput(name, color, chalk.red(`Exited with code ${code}`))
      );
    }
  });

  runningProcesses.push(childProcess);
  return childProcess;
}

// Start selected MFEs and return their environment variables
export async function serveMfes(
  mfeApps: string[]
): Promise<Record<string, string>> {
  console.log(chalk.cyan('\n🚀 Starting MFEs...'));
  console.log(chalk.cyan('━'.repeat(50)));

  const envVars: Record<string, string> = {};
  const colors = [
    chalk.blue,
    chalk.green,
    chalk.yellow,
    chalk.magenta,
    chalk.cyan,
  ];
  let colorIndex = 0;

  for (const mfeApp of mfeApps) {
    const config = MFE_PORTS[mfeApp];

    if (!config) {
      console.warn(chalk.yellow(`⚠️  Unknown MFE: ${mfeApp}, skipping...`));
      continue;
    }

    const color = colors[colorIndex % colors.length];
    colorIndex++;

    // Store environment variable for container
    envVars[config.envVar] = config.port.toString();

    // Start the MFE
    const command = `nx serve ${mfeApp}`;
    startProcess(config.name, command, color, {
      PORT: config.port.toString(),
    });

    console.log(
      chalk.gray(
        `   ${config.name} will be available at: http://localhost:${config.port}`
      )
    );

    // Small delay between starting MFEs to avoid port conflicts
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  console.log(chalk.cyan('━'.repeat(50)));
  return envVars;
}

// Start the container application with MFE environment variables
export function serveContainer(mfeEnvVars: Record<string, string>): void {
  console.log(chalk.cyan('\n🎯 Starting Container Application...'));
  console.log(chalk.cyan('━'.repeat(50)));

  const command = 'nx serve container';
  const containerColor = chalk.magenta;

  // Log environment variables being passed
  console.log(chalk.gray('   Environment variables:'));
  Object.entries(mfeEnvVars).forEach(([key, value]) => {
    console.log(chalk.gray(`     ${key}=${value}`));
  });

  startProcess('Container', command, containerColor, {
    ...mfeEnvVars,
    PORT: '4200',
  });

  console.log(
    chalk.gray(`   Container will be available at: http://localhost:4200`)
  );
  console.log(chalk.cyan('━'.repeat(50)));
  console.log(chalk.green('\n✅ All applications started successfully!'));
  console.log(chalk.yellow('\n💡 Press Ctrl+C to stop all applications\n'));
}

// Graceful shutdown handler
export function setupShutdownHandlers(): void {
  const shutdown = () => {
    console.log(chalk.red('\n\n🛑 Shutting down all applications...'));

    runningProcesses.forEach((proc) => {
      try {
        // Send SIGTERM for graceful shutdown
        proc.kill('SIGTERM');
      } catch (e) {
        // Process might already be dead
      }
    });

    // Force kill after 2 seconds if processes don't exit
    setTimeout(() => {
      runningProcesses.forEach((proc) => {
        try {
          proc.kill('SIGKILL');
        } catch (e) {
          // Process might already be dead
        }
      });
      process.exit(0);
    }, 2000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Cleanup on normal exit
  process.on('exit', () => {
    runningProcesses.forEach((proc) => {
      try {
        proc.kill();
      } catch (e) {
        // Process might already be dead
      }
    });
  });
}

// Get list of available MFE names without the '-mfe' suffix
export function getBaseMfeNames(mfeApps: string[]): string[] {
  return mfeApps.map((mfe) => mfe.replace('-mfe', ''));
}
