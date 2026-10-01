// Set this file as Hostinger's Node.js Application startup file.
// LiteSpeed loads startup files with require(), so this bridge dynamically
// imports the ESM application instead of requiring it synchronously.
import('./server/index.js').catch((error) => {
  console.error('Cricket Central failed to start:', error);
  process.exit(1);
});
