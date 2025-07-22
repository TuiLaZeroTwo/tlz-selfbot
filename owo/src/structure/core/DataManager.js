import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { logger } from "../../utils/logger.js";
import { t } from "../../utils/locales.js";
/**
 * Manages reading and writing JSON data to a file on disk.
 *
 * The `DataManager` class provides methods to persistently store and retrieve data
 * in a JSON file located at a specified path (defaulting to the user's home directory).
 * It ensures the data file and its parent directory exist before performing operations.
 *
 * @example
 * ```typescript
 * const manager = new DataManager();
 * manager.write({ foo: "bar" });
 * const data = manager.read();
 * ```
 *
 * @remarks
 * - Uses synchronous file operations for simplicity.
 * - Logs errors and info messages using a global `logger` object.
 *
 * @public
 */
export class DataManager {
    filePath;
    constructor(filePath = path.join(os.homedir(), "b2ki-ados", "data.json") // Default path to user's home directory
    ) {
        this.filePath = filePath;
        this.ensureFileExists();
    }
    ensureFileExists = () => {
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        if (!fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath, JSON.stringify({}, null, 2));
        }
    };
    read = () => {
        try {
            const data = fs.readFileSync(this.filePath, "utf-8");
            return JSON.parse(data);
        }
        catch (error) {
            logger.error("Error reading data file:");
            logger.error(error);
            return {};
        }
    };
    write = (data) => {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
            logger.info(t("system.messages.fileSaved", { filePath: this.filePath }));
        }
        catch (error) {
            logger.error("Error writing data file:");
            logger.error(error);
        }
    };
}
