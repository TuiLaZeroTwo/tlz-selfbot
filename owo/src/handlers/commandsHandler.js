import path from "node:path";
import fs from "node:fs";
import { Schematic } from "../structure/Schematic.js";
import { logger } from "../utils/logger.js";
import { importDefault } from "../utils/import.js";
export default Schematic.registerHandler({
    run: async ({ agent }) => {
        const commandsFolder = path.join(agent.rootDir, "commands");
        const statDir = fs.statSync(commandsFolder);
        if (!statDir.isDirectory()) {
            logger.warn(`Features folder not found, creating...`);
            fs.mkdirSync(commandsFolder, { recursive: true });
        }
        for (const file of fs.readdirSync(commandsFolder)) {
            if (!file.endsWith(".js") && !file.endsWith(".ts")) {
                logger.warn(`Skipping non-JS/TS file: ${file}`);
                continue;
            }
            const filePath = path.join(commandsFolder, file);
            try {
                const command = await importDefault(filePath);
                if (!command || typeof command !== "object" || !command.name) {
                    logger.warn(`Invalid feature in ${filePath}, skipping...`);
                    continue;
                }
                agent.commands.set(command.name, command);
            }
            catch (error) {
                logger.error(`Error loading feature from ${filePath}:`);
                logger.error(error);
            }
        }
    },
});
