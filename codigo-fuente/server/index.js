#!/usr/bin/env node
// Arranca el servidor de "Sol a Sol".
//   node server/index.js            (o: npm start)
// Variables de entorno:
//   PORT         puerto (por defecto 3001)
//   TRUST_PROXY  si hay un proxy delante (Render, Nginx…): número de saltos, p. ej. 1, para que el
//                limitador vea la IP real. No uses "true" en público: cualquiera podría falsear su IP.

import { createApp } from './src/app.js';

/** '1' → 1 · 'true' → true · 'loopback' → 'loopback' · vacío/'false' → false */
function parseTrustProxy(value) {
  if (value == null || value === '' || value === 'false') return false;
  if (value === 'true') return true;
  if (/^\d+$/.test(value)) return Number(value);
  return value;
}

// --port N (lo usa `npm run dev`) manda sobre PORT: así, en desarrollo, la API no hereda el puerto
// que algunas herramientas ponen para Vite (5173) y Vite puede seguir enviando /api al 3001.
const portArg = process.argv.indexOf('--port');
const port = (portArg > -1 && Number(process.argv[portArg + 1])) || Number(process.env.PORT) || 3001;

let app;
try {
  app = createApp({ trustProxy: parseTrustProxy(process.env.TRUST_PROXY) });
} catch (err) {
  console.error(`No se pudo preparar el servidor: ${err.message}`);
  console.error('¿Falta la copia ARCHIVO? Créala con: npm run data:build');
  process.exit(1);
}

const server = app.listen(port, (err) => {
  if (err) {
    console.error(
      err.code === 'EADDRINUSE'
        ? `El puerto ${port} ya está en uso. Cierra el otro servidor o usa otro puerto: PORT=3002 npm start`
        : `No se pudo arrancar el servidor: ${err.message}`
    );
    process.exit(1);
  }
  console.log(`Sol a Sol · servidor listo en http://localhost:${port}`);
  console.log(`  API: http://localhost:${port}/api/health`);
});

// Apagado limpio (Ctrl+C o el gestor de procesos).
function shutdown(signal) {
  console.log(`\n${signal}: cerrando el servidor…`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref(); // por si queda alguna conexión abierta
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
