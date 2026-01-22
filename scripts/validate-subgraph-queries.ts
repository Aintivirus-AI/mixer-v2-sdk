import {
  buildClientSchema,
  getIntrospectionQuery,
  parse,
  validate,
} from "graphql";

// Load .env for SUBGRAPH_ENDPOINT (dev-only script)
import "dotenv/config";

import { QUERIES } from "../src/evm/subgraph/queries";

type GraphQLResponse = {
  data?: any;
  errors?: Array<{ message?: string }>;
};

async function graphqlRequest(
  endpoint: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<GraphQLResponse> {
  const f = (globalThis as any).fetch as
    | ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>)
    | undefined;
  if (!f) {
    throw new Error("No fetch() available (Node.js >= 18 required).");
  }

  const res = await f(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }

  try {
    return JSON.parse(text) as GraphQLResponse;
  } catch {
    throw new Error(`Invalid JSON response: ${text.slice(0, 500)}`);
  }
}

async function main() {
  const endpoint = process.env.SUBGRAPH_ENDPOINT?.trim();
  if (!endpoint) {
    throw new Error(
      "Missing SUBGRAPH_ENDPOINT. Set it in your environment or in `.env`."
    );
  }

  const introspection = await graphqlRequest(
    endpoint,
    getIntrospectionQuery({ descriptions: false })
  );

  if (introspection.errors?.length) {
    throw new Error(
      `Introspection failed: ${introspection.errors
        .map((e) => e.message ?? "Unknown error")
        .join("; ")}`
    );
  }

  const schema = buildClientSchema(introspection.data);

  const failures: Array<{ name: string; message: string }> = [];

  for (const [name, query] of Object.entries(QUERIES)) {
    try {
      const doc = parse(query);
      const errors = validate(schema, doc);
      if (errors.length) {
        failures.push({
          name,
          message: errors.map((e) => e.message).join("\n"),
        });
      }
    } catch (e: unknown) {
      failures.push({
        name,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  if (failures.length) {
    // eslint-disable-next-line no-console
    console.error(
      `Subgraph query validation failed (${failures.length}/${Object.keys(QUERIES).length}):\n`
    );
    for (const f of failures) {
      // eslint-disable-next-line no-console
      console.error(`--- ${f.name} ---\n${f.message}\n`);
    }
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.log(
    `Subgraph queries OK (${Object.keys(QUERIES).length}/${Object.keys(QUERIES).length})`
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

