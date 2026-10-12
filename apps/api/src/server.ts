import { createServer, type Server } from "node:http";
import type { execute, subscribe } from "graphql";
import { useServer } from "graphql-ws/use/ws";
import { WebSocketServer } from "ws";
import type { createApp } from "./yoga";

type Yoga = ReturnType<typeof createApp>;

/**
 * One HTTP server for queries/mutations and graphql-ws subscriptions on the same /graphql path.
 * WebSocket operations go through Yoga's envelop pipeline (same schema, plugins and auth context).
 */
export function createApiServer(yoga: Yoga): { server: Server; close: () => Promise<void> } {
  const server = createServer(yoga);
  const wsServer = new WebSocketServer({ server, path: yoga.graphqlEndpoint });
  const disposable = useServer(
    {
      execute: (args) => (args.rootValue as { execute: typeof execute }).execute(args),
      subscribe: (args) => (args.rootValue as { subscribe: typeof subscribe }).subscribe(args),
      onSubscribe: async (ctx, _id, params) => {
        const { schema, execute, subscribe, contextFactory, parse, validate } = yoga.getEnveloped({
          ...ctx,
          req: ctx.extra.request,
          socket: ctx.extra.socket,
          params,
        });
        const args = {
          schema,
          operationName: params.operationName,
          document: parse(params.query),
          variableValues: params.variables,
          contextValue: await contextFactory(),
          rootValue: { execute, subscribe },
        };
        const errors = validate(args.schema, args.document);
        return errors.length ? errors : args;
      },
    },
    wsServer,
  );
  return {
    server,
    close: async () => {
      await disposable.dispose();
      await new Promise<void>((resolve) => wsServer.close(() => resolve()));
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
