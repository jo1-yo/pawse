/**
 * Loads server/.env into process.env. Imported first by index.ts so module
 * top-levels elsewhere (model name consts etc.) see the values. Shell env
 * vars win over the file; a missing file is fine.
 */

try {
  process.loadEnvFile();
} catch {
  /* no .env file */
}
