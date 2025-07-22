import path from "node:path";
import fs from "node:fs";
import { Schematic } from "../structure/Schematic.js";
import { logger } from "../utils/logger.js";
import { importDefault } from "../utils/import.js";
export default Schematic.registerHandler({
    run: async (BaseParams) => {
        const { agent } = BaseParams;
        const eventsFolder = path.join(agent.rootDir, "events");
        const statDir = fs.statSync(eventsFolder);
        if (!statDir.isDirectory()) {
            logger.warn(`Events folder not found, creating...`);
            fs.mkdirSync(eventsFolder, { recursive: true });
        }
        agent.client.removeAllListeners();
        for (const file of fs.readdirSync(eventsFolder)) {
            if (!file.endsWith(".js") && !file.endsWith(".ts")) {
                logger.warn(`Skipping non-JS/TS file: ${file}`);
                continue;
            }
            const filePath = path.join(eventsFolder, file);
            try {
                const event = await importDefault(filePath);
                if (!event || typeof event !== "object" || !event.name) {
                    logger.warn(`Invalid event in ${filePath}, skipping...`);
                    continue;
                }
                if (event.disabled)
                    continue;
                agent.client[event.once ? "once" : "on"](event.event, (...args) => void event.handler(BaseParams, ...args));
                logger.debug(`Loaded event: ${event.name} from ${filePath}`);
            }
            catch (error) {
                logger.error(`Error loading event from ${filePath}:`);
                logger.error(error);
            }
        }
    },
});
