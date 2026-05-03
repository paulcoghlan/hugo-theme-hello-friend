import {
  App,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  normalizePath,
} from "obsidian";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PluginSettings {
  supabaseUrl: string;
  supabaseAnonKey: string;
  openaiApiKey: string;
  syncFolder: string;       // vault-relative; empty string = entire vault
  outputFolder: string;     // where MCP-originated thoughts land as .md files
  syncIntervalMinutes: number;
}

interface Thought {
  id: string;
  content: string;
  embedding: number[] | null;
  metadata: Record<string, unknown>;
  created_at: string;
  obsidian_path: string | null;
  obsidian_sync_status: string;
  obsidian_synced_at: string | null;
  obsidian_file_hash: string | null;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_SETTINGS: PluginSettings = {
  supabaseUrl: "",
  supabaseAnonKey: "",
  openaiApiKey: "",
  syncFolder: "",
  outputFolder: "OB1 Thoughts",
  syncIntervalMinutes: 5,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function sha256(text: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function stripFrontmatter(content: string): {
  body: string;
  frontmatter: Record<string, string>;
} {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!fmMatch) return { body: content, frontmatter: {} };

  const frontmatter: Record<string, string> = {};
  for (const line of fmMatch[1].split("\n")) {
    const sep = line.indexOf(":");
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    const val = line.slice(sep + 1).trim();
    frontmatter[key] = val;
  }
  return { body: fmMatch[2].trim(), frontmatter };
}

function buildFrontmatter(fields: Record<string, string>): string {
  const lines = Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  return `---\n${lines}\n---\n\n`;
}

function injectSupabaseId(content: string, supabaseId: string): string {
  const { body, frontmatter } = stripFrontmatter(content);
  frontmatter["supabase_id"] = supabaseId;
  return buildFrontmatter(frontmatter) + body;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export default class SupabaseSyncPlugin extends Plugin {
  settings!: PluginSettings;
  private supabase!: SupabaseClient;
  private syncIntervalId: number | null = null;
  private isSyncing = false;

  async onload() {
    await this.loadSettings();
    this.initSupabase();

    // Ribbon icon — manual sync trigger
    this.addRibbonIcon("database", "Sync with Supabase", () => {
      this.runSync(true);
    });

    // Command palette entry
    this.addCommand({
      id: "supabase-sync-manual",
      name: "Sync vault with Supabase now",
      callback: () => this.runSync(true),
    });

    // Settings tab
    this.addSettingTab(new SupabaseSyncSettingTab(this.app, this));

    // Save-hook: sync the changed file immediately
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (file instanceof TFile && file.extension === "md") {
          this.syncFileToSupabase(file);
        }
      })
    );

    // Background loop
    this.startSyncInterval();
  }

  onunload() {
    if (this.syncIntervalId !== null) {
      window.clearInterval(this.syncIntervalId);
    }
  }

  // -------------------------------------------------------------------------
  // Settings
  // -------------------------------------------------------------------------

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.initSupabase();
    this.restartSyncInterval();
  }

  // -------------------------------------------------------------------------
  // Supabase client
  // -------------------------------------------------------------------------

  private initSupabase() {
    if (this.settings.supabaseUrl && this.settings.supabaseAnonKey) {
      this.supabase = createClient(
        this.settings.supabaseUrl,
        this.settings.supabaseAnonKey
      );
    }
  }

  private get isConfigured(): boolean {
    return !!(
      this.settings.supabaseUrl &&
      this.settings.supabaseAnonKey &&
      this.settings.openaiApiKey
    );
  }

  // -------------------------------------------------------------------------
  // Embedding
  // -------------------------------------------------------------------------

  private async generateEmbedding(text: string): Promise<number[]> {
    const resp = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.settings.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text.slice(0, 8000), // stay well within token limit
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`OpenAI embedding error ${resp.status}: ${err}`);
    }

    const data = await resp.json();
    return data.data[0].embedding as number[];
  }

  // -------------------------------------------------------------------------
  // On-save sync: vault → Supabase
  // -------------------------------------------------------------------------

  async syncFileToSupabase(file: TFile) {
    if (!this.isConfigured) return;
    if (!this.isInSyncFolder(file.path)) return;

    const rawContent = await this.app.vault.read(file);
    const { body, frontmatter } = stripFrontmatter(rawContent);
    const hash = await sha256(rawContent);
    const vaultPath = file.path;

    try {
      // Try lookup by supabase_id frontmatter first (survives renames)
      let existingThought: Thought | null = null;
      if (frontmatter["supabase_id"]) {
        const { data } = await this.supabase
          .from("thoughts")
          .select("*")
          .eq("id", frontmatter["supabase_id"])
          .maybeSingle();
        existingThought = data;
      }

      // Fall back to path lookup
      if (!existingThought) {
        const { data } = await this.supabase
          .from("thoughts")
          .select("*")
          .eq("obsidian_path", vaultPath)
          .maybeSingle();
        existingThought = data;
      }

      if (existingThought) {
        // Skip if hash unchanged
        if (existingThought.obsidian_file_hash === hash) return;

        const embedding = await this.generateEmbedding(body);
        await this.supabase
          .from("thoughts")
          .update({
            content: body,
            embedding,
            obsidian_path: vaultPath,
            obsidian_sync_status: "synced",
            obsidian_file_hash: hash,
            obsidian_synced_at: new Date().toISOString(),
          })
          .eq("id", existingThought.id);
      } else {
        // New thought originating from vault
        const embedding = await this.generateEmbedding(body);
        const { data, error } = await this.supabase
          .from("thoughts")
          .insert({
            content: body,
            embedding,
            obsidian_path: vaultPath,
            obsidian_sync_status: "obsidian_origin",
            obsidian_file_hash: hash,
            obsidian_synced_at: new Date().toISOString(),
            metadata: { source: "obsidian", topics: [], people: [] },
          })
          .select("id")
          .single();

        if (error) throw error;

        // Inject supabase_id into frontmatter without triggering another save event
        const updated = injectSupabaseId(rawContent, data.id);
        await this.app.vault.modify(file, updated);
      }
    } catch (err) {
      console.error("[SupabaseSync] syncFileToSupabase failed:", err);
    }
  }

  // -------------------------------------------------------------------------
  // Background sync loop
  // -------------------------------------------------------------------------

  private startSyncInterval() {
    if (this.syncIntervalId !== null) return;
    const ms = this.settings.syncIntervalMinutes * 60 * 1000;
    this.syncIntervalId = this.registerInterval(
      window.setInterval(() => this.runSync(false), ms)
    );
  }

  private restartSyncInterval() {
    if (this.syncIntervalId !== null) {
      window.clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
    this.startSyncInterval();
  }

  async runSync(manual: boolean) {
    if (!this.isConfigured) {
      if (manual) new Notice("Supabase Sync: configure URL, keys, and folder in settings.");
      return;
    }
    if (this.isSyncing) {
      if (manual) new Notice("Supabase Sync: sync already in progress.");
      return;
    }

    this.isSyncing = true;
    if (manual) new Notice("Supabase Sync: starting sync…");

    try {
      await this.syncPendingThoughts();
      await this.syncInboundChanges();
      if (manual) new Notice("Supabase Sync: sync complete.");
    } catch (err) {
      console.error("[SupabaseSync] runSync error:", err);
      new Notice(`Supabase Sync error: ${(err as Error).message}`);
    } finally {
      this.isSyncing = false;
    }
  }

  // -------------------------------------------------------------------------
  // Outbound: Supabase 'pending' → vault
  // -------------------------------------------------------------------------

  private async syncPendingThoughts() {
    const { data: pending, error } = await this.supabase
      .from("thoughts")
      .select("*")
      .eq("obsidian_sync_status", "pending");

    if (error) throw error;
    if (!pending?.length) return;

    const outputFolder = normalizePath(this.settings.outputFolder);
    if (!(await this.app.vault.adapter.exists(outputFolder))) {
      await this.app.vault.createFolder(outputFolder);
    }

    for (const thought of pending as Thought[]) {
      const title =
        thought.content.split("\n")[0].slice(0, 60) || thought.id.slice(0, 8);
      const filename = normalizePath(
        `${outputFolder}/${slugify(title)}-${thought.id.slice(0, 8)}.md`
      );

      const fileContent =
        buildFrontmatter({
          supabase_id: thought.id,
          created_at: thought.created_at,
        }) + thought.content;

      const hash = await sha256(fileContent);

      if (await this.app.vault.adapter.exists(filename)) {
        await this.app.vault.adapter.write(filename, fileContent);
      } else {
        await this.app.vault.create(filename, fileContent);
      }

      await this.supabase
        .from("thoughts")
        .update({
          obsidian_path: filename,
          obsidian_sync_status: "synced",
          obsidian_file_hash: hash,
          obsidian_synced_at: new Date().toISOString(),
        })
        .eq("id", thought.id);
    }
  }

  // -------------------------------------------------------------------------
  // Inbound: vault changes → Supabase
  // -------------------------------------------------------------------------

  private async syncInboundChanges() {
    const files = this.app.vault
      .getMarkdownFiles()
      .filter((f) => this.isInSyncFolder(f.path));

    for (const file of files) {
      const rawContent = await this.app.vault.read(file);
      const { body, frontmatter } = stripFrontmatter(rawContent);
      const supabaseId = frontmatter["supabase_id"];
      if (!supabaseId) continue; // not yet linked to Supabase

      const currentHash = await sha256(rawContent);

      const { data: thought } = await this.supabase
        .from("thoughts")
        .select("obsidian_file_hash, content, obsidian_sync_status")
        .eq("id", supabaseId)
        .maybeSingle();

      if (!thought) continue;

      const fileChanged = thought.obsidian_file_hash !== currentHash;
      const dbChanged = thought.content !== body;

      if (fileChanged && dbChanged && thought.obsidian_file_hash !== null) {
        // Both sides changed — conflict
        await this.supabase
          .from("thoughts")
          .update({ obsidian_sync_status: "conflict" })
          .eq("id", supabaseId);
        new Notice(
          `Supabase Sync: conflict detected in "${file.name}". Resolve manually.`
        );
        continue;
      }

      if (fileChanged) {
        const embedding = await this.generateEmbedding(body);
        await this.supabase
          .from("thoughts")
          .update({
            content: body,
            embedding,
            obsidian_sync_status: "synced",
            obsidian_file_hash: currentHash,
            obsidian_synced_at: new Date().toISOString(),
          })
          .eq("id", supabaseId);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private isInSyncFolder(vaultPath: string): boolean {
    const folder = this.settings.syncFolder.trim();
    if (!folder) return true; // entire vault
    return vaultPath.startsWith(normalizePath(folder) + "/");
  }
}

// ---------------------------------------------------------------------------
// Settings tab
// ---------------------------------------------------------------------------

class SupabaseSyncSettingTab extends PluginSettingTab {
  plugin: SupabaseSyncPlugin;

  constructor(app: App, plugin: SupabaseSyncPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Supabase RAG Sync" });

    // --- Connection ---
    containerEl.createEl("h3", { text: "Connection" });

    new Setting(containerEl)
      .setName("Supabase URL")
      .setDesc("Your Supabase project URL (https://xxx.supabase.co)")
      .addText((text) =>
        text
          .setPlaceholder("https://xxx.supabase.co")
          .setValue(this.plugin.settings.supabaseUrl)
          .onChange(async (value) => {
            this.plugin.settings.supabaseUrl = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Supabase anon key")
      .setDesc("Public anon key from your Supabase project settings")
      .addText((text) => {
        text
          .setPlaceholder("eyJ…")
          .setValue(this.plugin.settings.supabaseAnonKey)
          .onChange(async (value) => {
            this.plugin.settings.supabaseAnonKey = value.trim();
            await this.plugin.saveSettings();
          });
        text.inputEl.type = "password";
      });

    new Setting(containerEl)
      .setName("OpenAI API key")
      .setDesc("Used to generate text-embedding-3-small embeddings")
      .addText((text) => {
        text
          .setPlaceholder("sk-…")
          .setValue(this.plugin.settings.openaiApiKey)
          .onChange(async (value) => {
            this.plugin.settings.openaiApiKey = value.trim();
            await this.plugin.saveSettings();
          });
        text.inputEl.type = "password";
      });

    // --- Sync behaviour ---
    containerEl.createEl("h3", { text: "Sync behaviour" });

    new Setting(containerEl)
      .setName("Vault folder to sync")
      .setDesc(
        "Vault-relative folder to watch (e.g. Notes). Leave blank to sync the entire vault."
      )
      .addText((text) =>
        text
          .setPlaceholder("Notes")
          .setValue(this.plugin.settings.syncFolder)
          .onChange(async (value) => {
            this.plugin.settings.syncFolder = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Output folder for MCP thoughts")
      .setDesc(
        "Folder where thoughts created via MCP (not Obsidian) will be written as .md files"
      )
      .addText((text) =>
        text
          .setPlaceholder("OB1 Thoughts")
          .setValue(this.plugin.settings.outputFolder)
          .onChange(async (value) => {
            this.plugin.settings.outputFolder = value.trim() || "OB1 Thoughts";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Sync interval (minutes)")
      .setDesc("How often the background sync runs. Minimum 1 minute.")
      .addSlider((slider) =>
        slider
          .setLimits(1, 60, 1)
          .setValue(this.plugin.settings.syncIntervalMinutes)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.syncIntervalMinutes = value;
            await this.plugin.saveSettings();
          })
      );

    // --- Manual trigger ---
    containerEl.createEl("h3", { text: "Actions" });

    new Setting(containerEl)
      .setName("Sync now")
      .setDesc("Trigger an immediate full sync")
      .addButton((btn) =>
        btn
          .setButtonText("Sync now")
          .setCta()
          .onClick(() => this.plugin.runSync(true))
      );
  }
}
