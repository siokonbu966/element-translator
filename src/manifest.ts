export type Browser = "firefox" | "chrome";

const base = {
  manifest_version: 3,
  name: "Element Translator",
  version: "2.0.1",
  description:
    "Translate clicked HTML text element and show in popup with history.",
  action: {
    default_title: "Translate Element",
    default_popup: "popup.html",
  },
  permissions: ["storage", "activeTab"],
  host_permissions: [
    "http://127.0.0.1:1234/*",
    "http://localhost:1234/*",
    "http://127.0.0.1:11434/*",
    "http://localhost:11434/*",
  ],
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["browser-polyfill.js", "content.js"],
      run_at: "document_idle",
    },
  ],
} as const;

const firefox = {
  ...base,
  browser_specific_settings: {
    gecko: {
      id: "siokonbu_addon@example.com",
      data_collection_permissions: {
        required: ["websiteContent"],
        optional: [],
      },
    },
  },
  background: {
    scripts: ["background.js"],
    type: "module",
  },
  commands: {
    "select-text": {
      suggested_key: {
        default: "Alt+Shift+Y",
      },
      description: "Start text selection mode",
    },
  },
};

const chrome = {
  ...base,
  background: {
    service_worker: "background.js",
  },
  commands: {
    "select-text": {
      suggested_key: {
        default: "Alt+Shift+Y",
      },
      description: "Start text selection mode",
    },
  },
};

export function generateManifest(browser: Browser) {
  return browser === "firefox" ? firefox : chrome;
}
