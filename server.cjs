// CommonJS bootstrap for hosts that load the package entry with require().
// The application itself remains ESM and is loaded asynchronously so Node
// does not try to synchronously require an ESM graph with top-level await.
import('./server/index.js').catch(error => {
  console.error('Cricket Central failed to start:', error);
  process.exitCode = 1;
});
