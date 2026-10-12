import type pg from "pg";

type Listener = EventListenerOrEventListenerObject;

/**
 * An EventTarget backed by Postgres LISTEN/NOTIFY, so events published in one process (the worker)
 * reach subscribers in another (the API) with no extra infrastructure (ADR-0006, amended).
 * Payloads must stay small (Postgres caps NOTIFY at 8 kB): publish ids, not documents.
 */
export class PgEventTarget implements EventTarget {
  private readonly listeners = new Map<string, Set<Listener>>();
  private client: pg.PoolClient | null = null;
  private connecting: Promise<void> | null = null;

  constructor(
    private readonly pool: pg.Pool,
    private readonly channel = "kudos_events",
  ) {}

  addEventListener(type: string, listener: Listener | null): void {
    if (!listener) return;
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)?.add(listener);
    void this.listen();
  }

  removeEventListener(type: string, listener: Listener | null): void {
    if (!listener) return;
    this.listeners.get(type)?.delete(listener);
    if (this.listeners.get(type)?.size === 0) this.listeners.delete(type);
  }

  /** Publishes through Postgres; every process listening on the channel (including this one) receives it. */
  dispatchEvent(event: Event): boolean {
    const detail = (event as CustomEvent).detail ?? null;
    void this.pool.query("select pg_notify($1, $2)", [
      this.channel,
      JSON.stringify({ type: event.type, detail }),
    ]);
    return true;
  }

  /** Opens the dedicated LISTEN connection on first subscription. */
  private listen(): Promise<void> {
    this.connecting ??= (async () => {
      const client = await this.pool.connect();
      client.on("notification", (message) => {
        if (message.channel !== this.channel || !message.payload) return;
        const { type, detail } = JSON.parse(message.payload) as { type: string; detail: unknown };
        for (const listener of this.listeners.get(type) ?? []) {
          const event = new CustomEvent(type, { detail });
          if (typeof listener === "function") listener(event);
          else listener.handleEvent(event);
        }
      });
      await client.query(`LISTEN ${this.channel}`);
      this.client = client;
    })();
    return this.connecting;
  }

  async close(): Promise<void> {
    await this.connecting?.catch(() => undefined);
    if (this.client) {
      await this.client.query(`UNLISTEN ${this.channel}`).catch(() => undefined);
      this.client.release();
      this.client = null;
    }
    this.connecting = null;
  }
}
