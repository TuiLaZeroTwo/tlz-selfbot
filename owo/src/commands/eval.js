import { inspect } from "node:util";
import { Schematic } from "../structure/Schematic.js";
export default Schematic.registerCommand({
    name: "eval",
    description: "commands.eval.description",
    usage: "eval <code>",
    execute: async ({ agent, message, t, args }) => {
        if (!args || !args.length) {
            return message.reply({
                content: t("commands.eval.noCode")
            });
        }
        const startTime = Date.now();
        const code = args.join(" ");
        try {
            const result = await Promise.race([
                (async () => {
                    const asyncCode = code.includes("await") ? `(async () => { ${code} })()` : code;
                    return eval(asyncCode);
                })(),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Execution timed out")), 5000))
            ]);
            const output = inspect(result, {
                depth: 2,
                maxStringLength: 500,
            });
            message.reply({
                content: t("commands.eval.success", {
                    type: typeof result,
                    time: Date.now() - startTime,
                    result: output.slice(0, 1000)
                }),
            });
        }
        catch (error) {
            if (error instanceof Error && error.message === 'Execution timed out') {
                message.reply({
                    content: t("commands.eval.timeout", {
                        timeout: Date.now() - startTime
                    })
                });
            }
            else {
                message.reply({
                    content: t("commands.eval.error", {
                        error: String(error).slice(0, 1000)
                    })
                });
            }
        }
    }
});
