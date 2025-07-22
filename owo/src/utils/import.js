import { pathToFileURL } from "node:url";
/**
 * Dynamically imports a module by its file path and returns its default export.
 *
 * @template T The expected type of the module's default export.
 * @param id - The absolute path to the module to import.
 * @returns A promise that resolves to the module's default export, or `undefined` if not present.
 * @copyright Original credit to Misono Mika - https://github.com/misonomikadev
 */
export const importDefault = async (id) => {
    const resolvedPath = pathToFileURL(id).href;
    const importedModule = await import(resolvedPath);
    return importedModule?.default;
};
