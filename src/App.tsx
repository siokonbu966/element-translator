import { useEffect, useState } from "react";
import browser from "webextension-polyfill";
import WindowIcon from "ikonate/icons/window.svg?react";
import "./popup.css";

interface Settings {
  endpoint: string;
  model: string;
}

interface HistoryItem {
  url: string;
  at: number;
  sourceText: string;
  translatedText: string;
  endpoint: string;
  model: string;
  error?: string;
}

type Variant = "popup" | "window";

interface AppProps {
  variant?: Variant;
}

const DEFAULT_ENDPOINT = "";

function normalizeBaseUrl(endpoint: string): string {
  // ユーザーが OpenAI 互換の base URL（例: http://localhost:11434/v1）を
  // 入力しても /v1 が二重にならないようにする
  return endpoint.trim().replace(/\/+$/, "").replace(/\/v1$/, "");
}

function isValidHttpUrl(endpoint: string): boolean {
  if (!URL.canParse(endpoint)) {
    return false;
  }
  const url = new URL(endpoint);
  return url.protocol === "http:" || url.protocol === "https:";
}

export default function App({ variant = "popup" }: AppProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [settings, setSettings] = useState<Settings>({
    endpoint: DEFAULT_ENDPOINT,
    model: "",
  });
  const [endpointError, setEndpointError] = useState<string | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [loadingModels, setLoadingModels] = useState<boolean>(false);

  // popupかpanelを判定
  const isWindow = variant === "window";

  useEffect(() => {
    void (async () => {
      const store = await browser.storage.local.get([
        "history",
        "settings",
        "models",
      ]);
      const storedHistory = Array.isArray(store.history)
        ? (store.history as HistoryItem[])
        : [];
      const raw = (store.settings ?? {}) as Partial<Settings>;
      const endpoint =
        typeof raw.endpoint === "string" && raw.endpoint.trim()
          ? raw.endpoint.trim()
          : DEFAULT_ENDPOINT;
      const model = typeof raw.model === "string" ? raw.model : "none";
      const models = Array.isArray(store.models)
        ? store.models.filter(
            (model): model is string => typeof model === "string",
          )
        : [];
      setHistory(storedHistory);
      const nextSet = { endpoint, model };
      setSettings(nextSet);
      setModels(models);
    })();
  }, [history]);

  async function clearHistory() {
    await browser.storage.local.set({ history: [] });
  }

  async function loadModels() {
    const endpoint = settings.endpoint.trim() || DEFAULT_ENDPOINT;
    if (!isValidHttpUrl(endpoint)) {
      setEndpointError(
        "Invalid endpoint URL (must start with http:// or https://)",
      );
      setModelsError(null);
      setModels([]);
      return;
    }
    setLoadingModels(true);
    setModelsError(null);
    setEndpointError(null);
    try {
      const res = await fetch(`${normalizeBaseUrl(endpoint)}/v1/models`);
      if (!res.ok) throw new Error(`GET /v1/models failed: ${res.status}`);
      const json = (await res.json()) as { data?: Array<{ id?: string }> };
      const nextModels = (json.data ?? [])
        .map((m) => (typeof m.id === "string" ? m.id : ""))
        .filter(Boolean);
      setModels(nextModels);
      browser.storage.local.set({ models: nextModels });
      const picked = nextModels.includes(settings.model)
        ? settings.model
        : (nextModels[0] ?? "");
      if (picked !== settings.model) {
        await browser.storage.local.set({
          settings: { ...settings, endpoint, model: picked },
          models: nextModels,
        });
      }
    } catch (e: unknown) {
      setModelsError(e instanceof Error ? e.message : String(e));
      setModels([]);
    } finally {
      setLoadingModels(false);
    }
  }

  function setEndpoint(endpoint: string) {
    const next = { ...settings, endpoint };
    setSettings(next);
    void browser.storage.local.set({ settings: next });
  }

  function setModel(model: string) {
    const next = { ...settings, model };
    setSettings(next);
    void browser.storage.local.set({ settings: next });
  }

  async function startSelectText() {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      browser.tabs.sendMessage(tab.id, { type: "SELECT_TRANSLATE" });
    }
  }

  async function allTextTranslate() {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      browser.tabs.sendMessage(tab.id, { type: "ALL_TEXT_TRANSLATE" });
    }
  }

  async function openWindow() {
    const width = Math.max(
      320,
      Math.min(880, Math.floor(window.screen.availWidth * 0.9)),
    );
    const height = Math.max(
      480,
      Math.min(760, Math.floor(window.screen.availHeight * 0.9)),
    );

    try {
      await browser.windows.create({
        url: browser.runtime.getURL("panel.html"),
        type: "popup",
        width,
        height,
        focused: true,
      });
    } catch (e: unknown) {
      console.error("[element-translator] Failed to open window:", e);
    }
  }

  return (
    <main className={`app-shell${isWindow ? " app-shell--window" : ""}`}>
      <header className="app-header">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            文
          </div>
          <div>
            <h1 className="app-title">Element Translator</h1>
            <p className="app-subtitle">Translate the page you’re reading.</p>
          </div>
        </div>
        {!isWindow ? (
          <button
            className="icon-button"
            type="button"
            onClick={() => void openWindow()}
            aria-label="Open in a separate window"
            title="Open in a separate window"
          >
            <WindowIcon aria-hidden="true" />
          </button>
        ) : null}
      </header>

      <div className="app-body">
        <div className="control-stack">
          <section className="settings-card" aria-labelledby="connection-title">
            <div className="section-heading">
              <div>
                <h2 id="connection-title">Connection</h2>
                <p>Choose the translation service and model.</p>
              </div>
              <span className="section-mark" aria-hidden="true">
                ✳
              </span>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="endpoint">
                Endpoint
              </label>
              <input
                id="endpoint"
                className="text-field"
                value={settings.endpoint}
                onChange={(e) => void setEndpoint(e.target.value)}
                placeholder="http://127.0.0.1:1234"
              />
              {endpointError ? (
                <div className="field-error" role="alert">
                  {endpointError}
                </div>
              ) : null}
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="model">
                Model
              </label>
              <select
                id="model"
                className="text-field model-select"
                value={settings.model}
                onChange={(e) => void setModel(e.target.value)}
                disabled={loadingModels || models.length === 0}
              >
                <option value="" disabled>
                  {loadingModels
                    ? "Loading..."
                    : models.length
                      ? "Select model"
                      : "No models"}
                </option>
                {/*表示させているものが違う(string array)*/}
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              {modelsError ? (
                <div className="field-error" role="alert">
                  {modelsError}
                </div>
              ) : null}
            </div>

            <button
              className="text-button refresh-button"
              type="button"
              onClick={() => void loadModels()}
              disabled={loadingModels}
            >
              <span
                className={
                  loadingModels ? "refresh-glyph is-spinning" : "refresh-glyph"
                }
                aria-hidden="true"
              >
                ↻
              </span>
              {loadingModels ? "Loading models…" : "Refresh models"}
            </button>
          </section>

          <section className="actions-section" aria-label="Translation actions">
            <div className="actions-grid">
              <button
                className="action-button action-button--primary"
                type="button"
                onClick={() => void startSelectText()}
              >
                <span className="action-symbol" aria-hidden="true">
                  Aa
                </span>
                <span>Select text</span>
              </button>
              <button
                className="action-button action-button--tonal"
                type="button"
                onClick={() => void allTextTranslate()}
              >
                <span
                  className="action-symbol action-symbol--page"
                  aria-hidden="true"
                >
                  ▤
                </span>
                <span>Translate page</span>
              </button>
            </div>
          </section>
        </div>

        <section className="history-section" aria-labelledby="history-title">
          <div className="history-heading">
            <div>
              <h2 id="history-title">Recent translations</h2>
              <p>Your latest activity on this device.</p>
            </div>
            {history.length > 0 ? (
              <button
                className="text-button clear-button"
                type="button"
                onClick={() => void clearHistory()}
              >
                Clear
              </button>
            ) : null}
          </div>

          <div className="history-list">
            {history.map((item) => (
              <article key={item.at} className="history-item">
                <div className="history-meta">
                  <time dateTime={new Date(item.at).toISOString()}>
                    {new Date(item.at).toLocaleString()}
                  </time>
                  <span className="history-model">{item.model}</span>
                </div>
                <div className="history-url" title={item.url}>
                  {item.url}
                </div>
                <div className="history-copy">
                  <div className="history-text">
                    <h3>Original</h3>
                    <p>{item.sourceText}</p>
                  </div>
                  <div
                    className={`history-text history-translation${item.error ? " history-translation--error" : ""}`}
                  >
                    <h3>{item.error ? "Translation error" : "Translation"}</h3>
                    <p>{item.error ?? item.translatedText}</p>
                  </div>
                </div>
              </article>
            ))}
            {history.length === 0 ? (
              <div className="empty-state">
                <span className="empty-mark" aria-hidden="true">
                  文
                </span>
                <p>No translations yet</p>
                <span>Select text or translate a page to get started.</span>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
