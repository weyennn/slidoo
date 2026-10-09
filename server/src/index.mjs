import { createApp } from './app.mjs';
import { loadConfig } from './config.mjs';

const config = loadConfig();
const app = createApp(config);

await app.prepare();

app.server.listen(config.port, config.host, () => {
  const origin = `http://${config.host === '0.0.0.0' ? 'localhost' : config.host}:${config.port}`;
  console.info(`Slidoo (${config.mode}) → ${origin}${config.base}`);
  console.info(`  unggah dokumen : ${origin}${config.base}upload`);
  if (config.mode === 'dev') console.info(`  deck (open-slide dev) : ${config.appUrl}`);
  console.info(`  penyusun slide : ${config.ai.enabled ? `AI (${config.ai.model})` : 'aturan otomatis (tanpa AI)'}`);
  if (!config.uploadToken && config.host !== '127.0.0.1' && config.host !== 'localhost') {
    console.warn('  peringatan: SLIDOO_UPLOAD_TOKEN kosong, siapa pun yang bisa membuka alamat ini bisa mengunggah.');
  }
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    app.server.close(() => process.exit(0));
    // Don't wait on idle keep-alive connections.
    app.server.closeIdleConnections();
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
