import { checkbox, confirm, input, select } from "@inquirer/prompts";
/**
 * Abstract base class for creating interactive command-line prompts.
 *
 * Provides utility methods for common prompt types such as confirmation, input, single selection, and multiple selection.
 * Designed to be extended by concrete prompter implementations.
 *
 * @template TValue The type of value returned by the prompt.
 * @template TOptions The type of options accepted by the prompt.
 *
 * @method ask
 * Prompts the user with a custom prompt function and options.
 * Optionally displays documentation before prompting.
 *
 * @method trueFalse
 * Prompts the user with a yes/no (boolean) confirmation.
 *
 * @method getInput
 * Prompts the user for a string input, with optional default value, validation, and documentation.
 *
 * @method getSelection
 * Prompts the user to select a single value from a list of choices.
 *
 * @method getMultipleSelection
 * Prompts the user to select multiple values from a list of choices.
 */
export class BasePrompter {
    constructor() { }
    ask = (prompt, options, doc) => {
        console.clear();
        if (doc)
            console.log(doc);
        return prompt(options);
    };
    trueFalse = (message, defaultValue = true) => this.ask(confirm, {
        message,
        default: defaultValue,
    });
    getInput = (message, defaultValue, validate, documentation) => this.ask(input, {
        message,
        default: defaultValue,
        validate,
    }, documentation);
    getSelection = (message, choices, defaultValue, documentation) => this.ask((select), {
        message,
        choices,
        default: defaultValue,
    }, documentation);
    getMultipleSelection = (message, choices, defaultValue, documentation) => this.ask((checkbox), {
        message,
        choices,
        default: defaultValue,
    }, documentation);
}
