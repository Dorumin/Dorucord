const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const process = require('node:process');
const readline = require('node:readline');
const asar = require('asar');
const ps = require('ps-node');
const DorucordPatcher = require('./Patcher');

class DorucordInstaller {
    async install() {
        // await this.killAllDiscords();
        const discordDirectory = await this.getDiscordInstallDirectory();
        if (!discordDirectory) return;

        const appDirectory = await this.getLatestAppDirectory(discordDirectory);
        if (!appDirectory) return;

        console.log('Extracting...');
        const extractedPaths = await this.extractPackages(appDirectory);

        console.log('Patching...');
        const patcher = new DorucordPatcher();
        await Promise.all(extractedPaths.map(extractedPath => patcher.patch(extractedPath)));

        await this.patchSettings(discordDirectory);

        console.log('Patched! Feel free to restart Discord now.');
    }

    async uninstall() {
        // await this.killAllDiscords();
        const directory = await this.getDiscordInstallDirectory();
        if (!directory) return;

        const appDirectory = await this.getLatestAppDirectory(directory);
        if (!appDirectory) return;

        const asarPaths = await this.getAsarPaths(appDirectory);

        await Promise.all(asarPaths.map(asarPath => this.restoreOriginal(asarPath)));

        console.log('Uninstalled! Feel free to restart Discord now.');
    }

    async patchSettings(discordDirectory) {
        // First, we need to convert the discordDirectory into the settings.json directory
        // For that, we must do a few things
        switch (os.platform()) {
            case 'win32': {
                // In Windows, we must transform AppData/Local into AppData/Roaming
                // We must also change "DiscordPTB" into "discordptb", and so on
                const appData = path.dirname(path.dirname(discordDirectory));
                const selectedBuild = path.basename(discordDirectory).toLowerCase();
                const roamingDirectory = path.join(appData, 'Roaming', selectedBuild);
                const settingsPath = path.join(roamingDirectory, 'settings.json');
                const json = await fs.readFile(settingsPath, {
                    encoding: 'utf8'
                });
                const settings = JSON.parse(json);

                settings.DANGEROUS_ENABLE_DEVTOOLS_ONLY_ENABLE_IF_YOU_KNOW_WHAT_YOURE_DOING = true;

                await fs.writeFile(settingsPath, JSON.stringify(settings, null, 4));
                break;
            }
            case 'darwin': {
                // In MacOS, the folder for settings.json is the same as the rest of the app
                const settingsPath = path.join(discordDirectory, 'settings.json');
                const json = await fs.readFile(settingsPath, {
                    encoding: 'utf8'
                });
                const settings = JSON.parse(json);

                settings.DANGEROUS_ENABLE_DEVTOOLS_ONLY_ENABLE_IF_YOU_KNOW_WHAT_YOURE_DOING = true;

                await fs.writeFile(settingsPath, JSON.stringify(settings, null, 4));
                break;
            }
        }
    }

    async restoreOriginal(asarPath) {
        const parent = path.dirname(asarPath);
        const asarFileName = path.basename(asarPath);
        const backupPath = path.join(parent, `original.${asarFileName}`);
        const backupExists = await this.exists(backupPath);

        // We don't do anything if backup does not exist
        // We could report it, but I don't think there's a need
        // Let's keep uninstalling silent
        if (backupExists) {
            // We don't delete the backup after restoring
            // We _might_ want to do that... but let's keep it, just in case.
            await fs.copyFile(backupPath, asarPath);
        }
    }

    async getAsarPaths(appDirectory) {
        // Hardcoded for now to only include app.asar and core
        // Might be made more dynamic later if needed? Likely unnecessary

        // discord_desktop_core has a varying number at the end
        const modulePaths = await fs.readdir(path.join(appDirectory, 'modules'));
        const coreName = modulePaths.find(mod => mod.startsWith('discord_desktop_core'));

        const packagePaths = [
            path.join(appDirectory, 'modules', coreName, 'discord_desktop_core', 'core.asar')
        ];

        if (os.platform() === 'win32') {
            packagePaths.push(path.join(appDirectory, 'resources', 'app.asar'));
        }

        return packagePaths;
    }

    async extractPackages(appDirectory) {
        const extractPaths = await this.getAsarPaths(appDirectory);

        const extractedPaths = await Promise.all(extractPaths.map(asarPath => this.extractAsar(asarPath, 'extracted')));

        return extractedPaths;
    }

    async extractAsar(asarPath, output) {
        const parent = path.dirname(asarPath);
        const asarFileName = path.basename(asarPath);
        const outputPath = path.join(parent, output);
        const backupPath = path.join(parent, `original.${asarFileName}`);
        const backupExists = await this.exists(backupPath);

        if (!backupExists) {
            await fs.copyFile(asarPath, backupPath);
        } else {
            // We actually extract from the backupPath because
            // we don't want to patch an already-patched version
            // Unfortunately for us, patching isn't pure!
            // We can only do it once.
            asarPath = backupPath;
        }

        asar.extractAll(asarPath, outputPath);

        return outputPath;
    }

    async getDiscordInstallDirectory() {
        const directories = await this.getDiscordInstallDirectories();

        if (directories.length === 0) {
            console.log('No valid Discord installation directories found.');
            console.log('Do you even have it installed?');
            console.log('Try running this program in administrator mode, though that should not be necessary');
            return null;
        }

        if (directories.length === 0) {
            const directory = directories[0];
            console.log(`Installing in ${directory}`);

            return directory;
        }

        console.log('Found multiple installed Discord versions.');

        if (!isNaN(process.argv[2]) && directories[process.argv[2] - 1]) {
            const selectedDirectory = directories[process.argv[2] - 1];

            console.log(`Selecting ${selectedDirectory} from command-line arguments`);

            return selectedDirectory;
        }

        console.log('Select which one you want to modify:');
        directories.forEach((directory, i) => {
            console.log(`[${i + 1}] ${directory}`);
        });
        const response = await this.question('');
        let selectedIndex = Number(response);
        if (selectedIndex === 0) selectedIndex = 1;

        const selectedDirectory = directories[selectedIndex - 1];
        if (selectedDirectory === undefined) {
            console.log('Fuck you');
            return null;
        }

        return selectedDirectory;
    }

    async getDiscordInstallDirectories() {
        switch (os.platform()) {
            case 'win32': {
                const home = os.homedir();
                const root = path.join(home, 'AppData', 'Local');
                const possibleDirectories = ['Discord', 'DiscordPTB', 'DiscordCanary'].map(folder => path.join(root, folder));
                const installedPaths = await Promise.all(possibleDirectories.filter(async discordPath => this.exists(discordPath)));

                return installedPaths;
            }
            case 'darwin': {
                const home = os.homedir();
                const root = path.join(home, 'Library', 'Application Support');
                // TODO: Make sure PTB and canary are correct
                const possibleDirectories = ['discord', 'discordptb', 'discordcanary'].map(folder => path.join(root, folder));
                const installedPaths = await Promise.all(possibleDirectories.filter(async discordPath => this.exists(discordPath)));

                return installedPaths;
            }
        }

        console.log(`Not supported platform: ${os.platform()}`);

        return [];
    }

    async killAllDiscords() {
        console.log('Looking up Discord processes...');
        const processes = await this.lookupProcesses({
            command: /app-\d+\.\d+\.\d+\\\.*discord.*/i
        });

        if (processes.length !== 0) {
            console.log(`Found ${processes.length} Discord processes.`)
            for (const process of processes) {
                console.log(`- ${process.command}`);
            }
            console.log(`Killing...`);

            const results = await Promise.allSettled(processes.map(process => this.killProcess(process.pid)));
            const failures = results.filter(result => result.status === 'rejected');

            if (failures.length === 0) {
                console.log('Killed all Discord processes.');
            } else {
                console.log(`Error encountered while killing ${failures.length} of the processes.`);
            }
        }
    }

    /**
     * Looks up processes by a ps-node Query
     * @param {ps.Query} options The query
     * @returns {ps.Program[]} The list of matching processes
     */
    lookupProcesses(options) {
        return new Promise((resolve, reject) => {
            ps.lookup(options, (error, list) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(list);
                }
            });
        });
    }

    killProcess(pid) {
        return new Promise((resolve, reject) => {
            ps.kill(pid, (error) => {
                if (error) {
                    console.log(error);
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    async question(query) {
        return new Promise(resolve => {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            rl.question(query, (answer) => {
                resolve(answer);
                rl.close();
            });
        });
    }

    async getLatestAppDirectory(discordDirectory) {
        const directories = await fs.readdir(discordDirectory);

        const matches = directories.map(directory => directory.match(/app-((?:\d+.)+\d+)/i)).filter(Boolean);

        if (matches.length === 0) {
            console.log(`There's something wrong with your Discord installation. (no app folder)`);
            return null;
        }

        matches.sort((matchA, matchB) => {
            const segmentsA = matchA[1].split('.').map(Number);
            const segmentsB = matchB[1].split('.').map(Number);

            // Find the latest version
            // 1.0.9006 should be before 1.0.9003
            // 1.1.0 should be before 1.0.9006
            return segmentsB[0] - segmentsA[0]
                || segmentsB[1] - segmentsA[1]
                || segmentsB[2] - segmentsA[2];
        });

        return path.join(discordDirectory, matches[0].input);
    }

    async exists(path) {
        try {
            await fs.access(path);
            return true;
        } catch(e) {
            return false;
        }
    }
}

module.exports = DorucordInstaller;
