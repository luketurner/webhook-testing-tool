const config: Config = {
  layout: "./layout.kdl",
  environment: async ({ findAvailablePort }) => ({
    WTT_ADMIN_PORT: await findAvailablePort(),
    WTT_WEBHOOK_PORT: await findAvailablePort(),
    WTT_TCP_PORT: await findAvailablePort(),
  }),
  setup: async ({ dir, $ }) => {
    await $`cp -r local ${dir}/local`;
    await $`cd ${dir} && bun install`;
  },
};

module.exports = config;

interface Config {
  layout: string;
  environment: (opts: {
    findAvailablePort: () => Promise<number>;
  }) => Promise<Record<string, string | number>>;
  setup: (opts: { $: Bun.$; dir: string }) => Promise<void>;
}
