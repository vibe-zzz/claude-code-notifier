/**
 * Channel dispatcher: run selected notification channels in parallel.
 */

const CHANNEL_MODULES = {
  'system-notification': '../channels/system-notification.js',
};

/**
 * Dispatch notifications to all configured channels.
 * @param {string[]} channels - channel names to activate
 * @param {{ title: string, message: string, sound?: string }} opts
 * @returns {Promise<void>}
 */
export async function dispatch(channels, opts) {
  const tasks = channels
    .filter((ch) => CHANNEL_MODULES[ch])
    .map(async (ch) => {
      try {
        const mod = await import(CHANNEL_MODULES[ch]);
        await mod.send(opts);
      } catch {
        // Individual channel failure should not affect others
      }
    });

  await Promise.allSettled(tasks);
}
