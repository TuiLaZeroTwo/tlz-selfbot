import { Schematic } from "../structure/Schematic.js";
import { ranInt } from "../utils/math.js";
import { quotes } from "../utils/quotes.js";
export default Schematic.registerFeature({
    name: "autoQuote",
    cooldown: () => 15_000,
    condition: async ({ agent }) => {
        return agent.config.autoQuote.length > 0;
    },
    run: async ({ agent }) => {
        let quote;
        switch (agent.config.autoQuote[ranInt(0, agent.config.autoQuote.length)]) {
            case "owo":
                quote = "owo";
                break;
            case "quote":
                quote = quotes[ranInt(0, quotes.length)];
                break;
        }
        agent.send(quote, { prefix: "", channel: agent.activeChannel, skipLogging: true });
    }
});
