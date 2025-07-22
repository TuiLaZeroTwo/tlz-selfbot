import axios from "axios";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync, spawn } from "node:child_process";
import packageJSON from "../../package.json" with { type: "json" };
import { logger } from "../utils/logger.js";
import { t } from "../utils/locales.js";
import { copyDirectory } from "../utils/path.js";
import { downloadAndExtractRepo } from "../utils/download.js";
export class UpdateFeature {
    baseHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537'
    };
    checkForUpdates = async () => {
        logger.info(t("system.update.checkingForUpdates"));
        try {
            const { version: currentVersion } = packageJSON;
            const { data: { version: latestVersion } } = await axios.get("https://raw.githubusercontent.com/Kyou-Izumi/advanced-discord-owo-tool-farm/refs/heads/main/package.json", {
                headers: this.baseHeaders
            });
            if (currentVersion < latestVersion) {
                logger.info(t("system.update.newVersionAvailable", { latestVersion, currentVersion }));
                return true;
            }
            logger.info(t("system.update.latestVersion", { currentVersion }));
        }
        catch (error) {
            logger.error(`Failed to check for updates:` + error);
        }
        return false;
    };
    gitUpdate = async () => {
        try {
            logger.debug("Stashing local changes...");
            execSync("git stash", { stdio: "inherit" });
            logger.debug("Pulling latest changes from remote repository...");
            execSync("git pull --force", { stdio: "inherit" });
            logger.debug("Applying stashed changes...");
            execSync("git stash pop", { stdio: "inherit" });
        }
        catch (error) {
            logger.debug(`Failed to update repository: ${error}`);
        }
    };
    manualUpdate = async () => {
        try {
            const extractedFolderName = await downloadAndExtractRepo("https://github.com/Kyou-Izumi/advanced-discord-owo-tool-farm/archive/refs/heads/main.zip", os.tmpdir());
            const extractedPath = path.join(os.tmpdir(), extractedFolderName);
            copyDirectory(extractedPath, process.cwd());
        }
        catch (error) {
            logger.error("Error updating project manually:");
            logger.error(String(error));
        }
    };
    installDependencies = async () => {
        logger.info(t("system.update.installingDependencies"));
        try {
            execSync("npm install", { stdio: "inherit" });
            logger.info(t("system.update.dependenciesInstalled"));
        }
        catch (error) {
            logger.error("Failed to install dependencies:" + error);
        }
    };
    restart = () => {
        const child = spawn("start", ["cmd.exe", "/K", "npm start"], {
            cwd: process.cwd(),
            shell: true,
            detached: true,
            stdio: "ignore"
        });
        child.unref();
        process.exit(1);
    };
    updateAndRestart = async () => {
        await this.performUpdate();
        await this.installDependencies();
        this.restart();
    };
    performUpdate = async () => {
        logger.info(t("system.update.performingUpdate"));
        try {
            if (fs.existsSync(".git")) {
                logger.info(t("system.update.gitDetected"));
                await this.gitUpdate();
            }
            else {
                logger.info(t("system.update.gitNotFound"));
                await this.manualUpdate();
            }
            await this.installDependencies();
            logger.info(t("system.update.updateCompleted"));
            process.exit(0);
        }
        catch (error) {
            logger.error("Failed to perform update:" + error);
        }
    };
}
