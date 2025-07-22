import path from "node:path";
import fs from "node:fs";
import { ConfigSchema } from "../schemas/ConfigSchema.js";
import { BaseAgent } from "../structure/BaseAgent.js";
import { logger } from "../utils/logger.js";
import { ExtendedClient } from "../structure/core/ExtendedClient.js";
export const command = "import <filename>";
export const desc = "Import a config file for instant setup";
export const builder = {
    filename: {
        type: "string",
        demandOption: true,
        description: "The name of the config file to import",
    },
};
export const handler = async (argv) => {
    const filePath = path.resolve(process.cwd(), argv.filename);
    if (!fs.existsSync(filePath)) {
        logger.error(`File ${filePath} does not exist.`);
        return;
    }
    if (path.extname(filePath) !== ".json") {
        logger.error(`File ${filePath} is not a JSON file!`);
        return;
    }
    let config;
    try {
        const configData = fs.readFileSync(filePath, "utf-8");
        config = JSON.parse(configData);
        // Validate the configuration
        const validatedConfig = ConfigSchema.safeParse(config);
        if (!validatedConfig.success) {
            throw new Error(`Invalid configuration: ${validatedConfig.error.message}`);
        }
        logger.info("Configuration imported successfully");
        const client = new ExtendedClient();
        try {
            await client.checkAccount(validatedConfig.data.token);
            await BaseAgent.initialize(client, validatedConfig.data);
        }
        catch (error) {
            logger.error("Failed to start bot with imported configuration:");
            logger.error(error);
        }
    }
    catch (error) {
        logger.error("Error importing configuration:");
        logger.error(error);
        process.exit(1);
    }
};
