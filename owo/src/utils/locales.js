import lodash from "lodash";
import locales from "../locales/index.js";
import { logger } from "./logger.js";
export const translate = (locale) => {
    let data = locales[locale];
    if (!data) {
        logger.warn(`Locale "${locale}" not found, falling back to "en"`);
        process.env.LOCALE = "en"; // Set the environment variable to English if the locale is not found
        data = locales.en; // Fallback to English if the locale is not found
    }
    return (path, variables) => {
        const template = lodash.get(data, path);
        if (!template || typeof template !== 'string') {
            logger.warn(`Translation key "${path}" not found or invalid for locale "${locale}"`);
            return path;
        }
        if (!variables) {
            return template;
        }
        // Replace {variable} placeholders with actual values
        return template.replace(/\{(\w+)\}/g, (match, key) => {
            return variables[key] !== undefined ? String(variables[key]) : match;
        });
    };
};
export const i18n = (locale = "en") => {
    return {
        t: translate(locale),
        locale,
    };
};
// Dynamic exports that get the current locale from environment
export const t = (path, variables) => {
    const currentLocale = process.env.LOCALE || "en";
    return translate(currentLocale)(path, variables);
};
// Function to get current locale dynamically
export const getCurrentLocale = () => {
    return process.env.LOCALE || "en";
};
// For backward compatibility - this will be the locale at module load time
// Components that need dynamic locale should use getCurrentLocale()
export const locale = process.env.LOCALE || "en";
