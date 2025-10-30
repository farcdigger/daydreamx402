import { Hono } from "hono";
import { createDreamsRouterAuth } from "@daydreamsai/ai-sdk-provider";
import { privateKeyToAccount } from "viem/accounts";
import { createDreams, LogLevel } from "@daydreamsai/core";
import { z } from "zod";

// Environment validation
const EnvSchema = z.object({
  PRIVATE_KEY: z
    .string()
    .regex(/^0x[0-9a-fA-F]+$/, "PRIVATE_KEY must be a 0x-prefixed hex string"),
  PORT: z.string().optional(),
  PAYMENTS_NETWORK: z.enum(["base", "base-sepolia"]).optional(),
});

// Read env from Bun (if present) or Node
const envSource = (globalThis as any)?.Bun?.env ?? process.env;
const parsed = EnvSchema.safeParse(envSource as unknown as any);
const env = parsed.success ? parsed.data : ({} as any);
const envError = parsed.success ? null : parsed.error;
const paymentsNetwork = env.PAYMENTS_NETWORK ?? "base"; // default Base mainnet

// x402 amounts are specified in 6-decimal USDC units.
// 1 USDC = 1_000_000 units
const USDC6 = 1_000_000n;
const toUsdc6 = (usd: number): string => (BigInt(Math.round(usd * 100)) * (USDC6 / 100n)).toString();

// Supported price tiers
const PRICE_USD: Record<string, number> = {
  "5": 5,
  "10": 10,
  "100": 100,
};

export const app = new Hono();

app.get("/health", (c) => {
  if (envError) {
    return c.json({ ok: false, error: "Invalid environment", details: envError.flatten().fieldErrors }, 500);
  }
  return c.json({ ok: true });
});

// Generic payment endpoint: /pay/:amount where amount in {5,10,100}
const handlePayment = async (c: any, amountParam?: string) => {
  const amt = amountParam ?? c.req.param("amount");
  const usd = PRICE_USD[amt];
  if (!usd) {
    return c.json({ error: "Unsupported amount. Use 5, 10, or 100." }, 400);
  }

  try {
    if (envError) {
      return c.json({ error: "Invalid environment", details: envError.flatten().fieldErrors }, 500);
    }
    // Authenticate with Dreams router using Bun.env per tutorial
    const { dreamsRouter, user } = await createDreamsRouterAuth(
      privateKeyToAccount(env.PRIVATE_KEY as `0x${string}`),
      {
      payments: {
        amount: toUsdc6(usd),
        network: paymentsNetwork,
      },
      }
    );

    // Trigger a minimal model call to execute a charge once.
    const agent = createDreams({
      logLevel: LogLevel.ERROR,
      model: dreamsRouter("google-vertex/gemini-2.5-flash"),
    });

    const response = await agent.complete("ok");

    return c.json({
      status: "charged",
      amountUsd: usd,
      amountUnits: toUsdc6(usd),
      network: paymentsNetwork,
      userBalance: user.balance,
      modelReply: response.outputText ?? "",
    });
  } catch (err) {
    console.error("/pay error", err);
    return c.json({ error: "Payment failed" }, 500);
  }
};

app.post("/pay/:amount", async (c) => {
  return handlePayment(c);
});
 

// Convenience routes for explicit tiers
app.post("/pay/5", (c) => handlePayment(c, "5"));
app.post("/pay/10", (c) => handlePayment(c, "10"));
app.post("/pay/100", (c) => handlePayment(c, "100"));

// Export fetch handler for environments that support it (Edge-like)
export default app.fetch;
