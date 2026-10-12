// Local development: API and notification worker in one watched process.
// Production runs them as separate processes (see docker-compose.yml).
await import("./index");
await import("./worker");
