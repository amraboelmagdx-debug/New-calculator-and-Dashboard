// craco.config.js
const path = require("path");
const webpack = require("webpack");
require("dotenv").config();

// Check if we're in development/preview mode (not production build)
const isDevServer = process.env.NODE_ENV !== "production";

// Environment variable overrides
const config = {
  enableHealthCheck: process.env.ENABLE_HEALTH_CHECK === "true",
};

// Conditionally load health check modules only if enabled
let WebpackHealthPlugin;
let setupHealthEndpoints;
let healthPluginInstance;

if (config.enableHealthCheck) {
  WebpackHealthPlugin = require("./plugins/health-check/webpack-health-plugin");
  setupHealthEndpoints = require("./plugins/health-check/health-endpoints");
  healthPluginInstance = new WebpackHealthPlugin();
}

// ── node: scheme fix for pptxgenjs ───────────────────────────────────────────
// pptxgenjs uses node:fs, node:https, etc. which webpack 5 can't resolve in
// the browser. We shim them via resolve.alias + resolve.fallback.
// Using alias (not just NormalModuleReplacementPlugin) because alias is
// evaluated earlier in webpack's resolution pipeline and survives withVisualEdits.
const NODE_SHIM = path.resolve(__dirname, "src/utils/node-shim.js");
const NODE_SCHEME_ALIASES = {
  "node:fs":             NODE_SHIM,
  "node:https":          NODE_SHIM,
  "node:http":           NODE_SHIM,
  "node:path":           NODE_SHIM,
  "node:os":             NODE_SHIM,
  "node:zlib":           NODE_SHIM,
  "node:stream":         NODE_SHIM,
  "node:crypto":         NODE_SHIM,
  "node:url":            NODE_SHIM,
  "node:assert":         NODE_SHIM,
  "node:buffer":         NODE_SHIM,
  "node:util":           NODE_SHIM,
  "node:net":            NODE_SHIM,
  "node:tls":            NODE_SHIM,
  "node:child_process":  NODE_SHIM,
  "node:events":         NODE_SHIM,
};
const NODE_FALLBACKS = {
  // Without node: prefix
  fs: false, https: false, http: false, path: false, os: false,
  zlib: false, stream: false, crypto: false, url: false,
  assert: false, buffer: false, util: false, net: false,
  tls: false, child_process: false, events: false,
  // With node: prefix — webpack 5 treats these as a different namespace
  "node:fs": false, "node:https": false, "node:http": false,
  "node:path": false, "node:os": false, "node:zlib": false,
  "node:stream": false, "node:crypto": false, "node:url": false,
  "node:assert": false, "node:buffer": false, "node:util": false,
  "node:net": false, "node:tls": false, "node:child_process": false,
  "node:events": false,
};

/** Apply the node: scheme fix to an already-built webpack config object */
function applyNodeSchemeFix(webpackCfg) {
  webpackCfg.resolve = webpackCfg.resolve || {};
  webpackCfg.resolve.alias = {
    ...(webpackCfg.resolve.alias || {}),
    ...NODE_SCHEME_ALIASES,
  };
  webpackCfg.resolve.fallback = {
    ...(webpackCfg.resolve.fallback || {}),
    ...NODE_FALLBACKS,
  };
  return webpackCfg;
}
// ─────────────────────────────────────────────────────────────────────────────

let webpackConfig = {
  eslint: {
    configure: {
      extends: ["plugin:react-hooks/recommended"],
      rules: {
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
      },
    },
  },
  webpack: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
    configure: (webpackCfg) => {

      // Apply node: scheme fix (works in production; dev mode is re-applied
      // after withVisualEdits so it can't be accidentally overwritten)
      applyNodeSchemeFix(webpackCfg);

      // NormalModuleReplacementPlugin: map node: scheme directly to the empty
      // shim so it never hits the fallback (which is `false` for fs/https/etc.)
      // This runs BEFORE alias resolution, so we must point to the shim here.
      webpackCfg.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = NODE_SHIM;
        })
      );

      // Reduce watched directories in dev
      webpackCfg.watchOptions = {
        ...webpackCfg.watchOptions,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/build/**",
          "**/dist/**",
          "**/coverage/**",
          "**/public/**",
        ],
      };

      if (config.enableHealthCheck && healthPluginInstance) {
        webpackCfg.plugins.push(healthPluginInstance);
      }

      return webpackCfg;
    },
  },
};

webpackConfig.devServer = (devServerConfig) => {
  devServerConfig.historyApiFallback = {
    disableDotRule: true,
    index: "/index.html",
  };

  if (config.enableHealthCheck && setupHealthEndpoints && healthPluginInstance) {
    const originalSetupMiddlewares = devServerConfig.setupMiddlewares;
    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      if (originalSetupMiddlewares) {
        middlewares = originalSetupMiddlewares(middlewares, devServer);
      }
      setupHealthEndpoints(devServer, healthPluginInstance);
      return middlewares;
    };
  }

  const originalSetupMiddlewares = devServerConfig.setupMiddlewares;
  devServerConfig.setupMiddlewares = (middlewares, devServer) => {
    if (originalSetupMiddlewares) {
      middlewares = originalSetupMiddlewares(middlewares, devServer);
    }
    if (devServer && devServer.app) {
      const indexPath = path.join(__dirname, "public", "index.html");
      devServer.app.get(
        ["/sales-dashboard", "/admin", "/admin/*"],
        (_req, res) => { res.sendFile(indexPath); }
      );
    }
    return middlewares;
  };

  return devServerConfig;
};

// Wrap with visual edits in dev mode
if (isDevServer) {
  try {
    const { withVisualEdits } = require("@emergentbase/visual-edits/craco");
    webpackConfig = withVisualEdits(webpackConfig);
  } catch (err) {
    if (
      err.code === "MODULE_NOT_FOUND" &&
      err.message.includes("@emergentbase/visual-edits/craco")
    ) {
      console.warn(
        "[visual-edits] @emergentbase/visual-edits not installed — visual editing disabled."
      );
    } else {
      throw err;
    }
  }

  // ── Re-apply node: scheme fix AFTER withVisualEdits ─────────────────────
  // withVisualEdits wraps webpack.configure and may overwrite resolve.alias.
  // We chain one more wrapper here that runs LAST to guarantee our aliases
  // are present regardless of what withVisualEdits does.
  const prevConfigure = webpackConfig.webpack && webpackConfig.webpack.configure;
  webpackConfig.webpack = webpackConfig.webpack || {};
  webpackConfig.webpack.configure = (webpackCfg, ctx) => {
    // Run whatever configure chain exists (our original → withVisualEdits → ...)
    const result =
      typeof prevConfigure === "function"
        ? prevConfigure(webpackCfg, ctx)
        : webpackCfg;

    // Re-apply the node: scheme aliases — this is the last configure that runs
    applyNodeSchemeFix(result);

    return result;
  };
  // ─────────────────────────────────────────────────────────────────────────
}

const baseDevServer = webpackConfig.devServer;
webpackConfig.devServer = (devServerConfig) => {
  const nextConfig = baseDevServer
    ? baseDevServer(devServerConfig)
    : devServerConfig;
  nextConfig.historyApiFallback = {
    disableDotRule: true,
    index: "/index.html",
  };
  return nextConfig;
};

module.exports = webpackConfig;
