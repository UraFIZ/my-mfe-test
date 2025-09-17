#!/usr/bin/env node
import { program, Option } from 'commander';
import chalk from 'chalk';
import {
  serveMfes,
  serveContainer,
  getMfeAppNames,
  getBaseMfeNames,
  setupShutdownHandlers,
} from '../utils/development';

const startDev = async () => {
  console.log(chalk.cyan.bold('\n🎯 Module Federation Development Server'));
  console.log(chalk.cyan('══════════════════════════════════════════'));

  // Setup shutdown handlers early
  setupShutdownHandlers();

  // Get available MFEs from the project structure
  const allMfes = await getMfeAppNames();
  const baseMfes = getBaseMfeNames(allMfes);

  if (allMfes.length === 0) {
    console.error(chalk.red('❌ No MFE applications found!'));
    console.log(
      chalk.yellow(
        'Make sure you have generated MFE apps with names ending in "-mfe"'
      )
    );
    process.exit(1);
  }

  console.log(chalk.gray(`📦 Found MFEs: ${allMfes.join(', ')}`));
  console.log(chalk.cyan('══════════════════════════════════════════\n'));

  // Setup commander CLI
  program
    .name('startDev')
    .description('Start MFEs and Container for Module Federation')
    .version('1.0.0')
    .addOption(
      new Option(
        '--mfe [mfes...]',
        'Scope down which MFE(s) should be started alongside the container'
      )
        .choices(baseMfes)
        .default(baseMfes) // Start all MFEs by default
    )
    .addOption(
      new Option(
        '--container-only',
        'Start only the container application (assumes MFEs are already running)'
      )
    )
    .addOption(
      new Option(
        '--verbose',
        'Show all webpack output (by default, filtered for cleaner output)'
      )
    );

  program.parse();

  const options = program.opts();

  // Handle container-only mode
  if (options.containerOnly) {
    console.log(
      chalk.yellow(
        '📋 Starting Container only (assuming MFEs are already running)'
      )
    );

    // Build env vars for all possible MFEs
    const envVars: Record<string, string> = {
      NX_USERS_MFE_PORT: '4201',
      NX_DASHBOARD_MFE_PORT: '4202',
    };

    serveContainer(envVars);
    return;
  }

  // Normal mode - start selected MFEs
  const selectedMfes = options.mfe;
  const mfeAppsToStart = selectedMfes.map((mfe: string) => `${mfe}-mfe`);

  console.log(chalk.cyan('📋 Configuration:'));
  console.log(
    chalk.white(`   MFEs to start: ${chalk.green(mfeAppsToStart.join(', '))}`)
  );
  console.log(
    chalk.white(`   Container URL: ${chalk.blue('http://localhost:4200')}`)
  );

  // Display MFE URLs
  mfeAppsToStart.forEach((mfe: string) => {
    const port =
      mfe === 'users-mfe' ? 4201 : mfe === 'dashboard-mfe' ? 4202 : 'unknown';
    console.log(
      chalk.white(`   ${mfe} URL: ${chalk.blue(`http://localhost:${port}`)}`)
    );
  });
  console.log('');

  try {
    // Start MFEs first
    const appsPortsEnvVars = await serveMfes(mfeAppsToStart);

    // Wait for MFEs to initialize
    console.log(chalk.yellow('\n⏳ Waiting for MFEs to initialize...'));

    // Show a progress indicator
    const waitTime = 5000;
    const interval = 500;
    let elapsed = 0;

    const progressInterval = setInterval(() => {
      elapsed += interval;
      const progress = Math.floor((elapsed / waitTime) * 20);
      const bar = '█'.repeat(progress) + '░'.repeat(20 - progress);
      process.stdout.write(
        `\r   ${bar} ${Math.floor((elapsed / waitTime) * 100)}%`
      );
    }, interval);

    await new Promise((resolve) => setTimeout(resolve, waitTime));
    clearInterval(progressInterval);
    process.stdout.write('\r   ' + ' '.repeat(40) + '\r'); // Clear the progress bar

    // Start container with MFE ports as environment variables
    serveContainer(appsPortsEnvVars);
  } catch (error) {
    console.error(chalk.red('\n❌ Error starting applications:'), error);
    process.exit(1);
  }
};

// Run the script
startDev().catch((error) => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
