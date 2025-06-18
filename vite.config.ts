// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// import { componentTagger } from "lovable-tagger"; // Keep commented or filter out if not used in production

export default defineConfig(({ mode }) => {
  // Determine the base path for assets depending on the build mode.
  // For production (GitHub Pages project site), it's the repository name.
  // For development, it's the root path ("/").
  const isProduction = mode === "production";
  const base_path = "/";

  return {
    // The 'base' property is crucial for GitHub Pages project sites.
    // It prefixes all your asset URLs (JS, CSS, images) in the final build,
    // ensuring they are loaded relative to your GitHub Pages subdirectory.
    base: base_path,

    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      // If you are using 'lovable-tagger', uncomment this line:
      // mode === 'development' && componentTagger(),
    ].filter(Boolean), // .filter(Boolean) removes falsey values (e.g., when mode !== 'development')

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"), // Ensures your '@/...' imports work
      },
    },

    build: {
      outDir: "dist", // Confirms the output directory for your compiled files is 'dist'

      // Explicitly define the main HTML entry point for Rollup (Vite's bundler).
      // This helps ensure Vite processes your root index.html correctly and injects
      // the appropriate production script paths.
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, "index.html"), // Points to your project's root index.html file
        },
      },
    },

    // Explicitly sets the root directory for Vite to resolve paths from.
    // This often defaults correctly, but being explicit can prevent some issues.
    root: process.cwd(),
  };
});
