import fs from "fs";
import path from "path";
import { theme, chalk, logger, setPluginTotal } from "./hillz-logger.js";
import { apakahPluginMati, daftarPluginMati, ambilStatistikPlugin } from "./hillz-plugin-state.js";
/**
 * @typedef {Object} PluginConfig
 * @property {string} name - Nama command (tanpa prefix)
 * @property {string[]} alias - Array alias untuk command
 * @property {string} category - Kategori plugin (owner, main, utility, fun, dll)
 * @property {string} description - Deskripsi singkat command
 * @property {string} usage - Cara penggunaan command
 * @property {string} example - Contoh penggunaan command
 * @property {boolean} isOwner - Apakah command khusus owner
 * @property {boolean} isPremium - Apakah command khusus premium user
 * @property {boolean} isGroup - Apakah command hanya untuk group
 * @property {boolean} isPrivate - Apakah command hanya untuk private chat
 * @property {boolean} isAdmin - Apakah command memerlukan admin group
 * @property {boolean} isBotAdmin - Apakah bot harus jadi admin
 * @property {number} cooldown - Cooldown dalam detik
 * @property {number} limit - Jumlah limit yang digunakan per eksekusi
 * @property {boolean} isEnabled - Apakah plugin aktif
 */

/**
 * @typedef {Object} Plugin
 * @property {PluginConfig} config - Konfigurasi plugin
 * @property {PluginHandler} handler - Fungsi handler plugin
 */

/**
 * @callback PluginHandler
 * @param {Object} m - Serialized message object
 * @param {Object} params - Parameter tambahan
 * @param {Object} params.sock - Socket connection Baileys
 * @param {Object} params.store - Data store
 * @param {Object} params.config - Bot configuration
 * @param {Object} params.plugins - All loaded plugins
 * @returns {Promise<void>}
 */

/**
 * @typedef {Object} PluginStore
 * @property {Map<string, Plugin>} commands - Map command name ke plugin
 * @property {Map<string, string>} aliases - Map alias ke command name
 * @property {Map<string, Plugin[]>} categories - Map category ke array plugins
 */

/**
 * Collection untuk menyimpan semua plugins
 * @type {PluginStore}
 */
const pluginStore = {
  commands: new Map(),
  aliases: new Map(),
  categories: new Map(),
};

/**
 * Default config untuk plugin
 * @type {PluginConfig}
 */
const defaultConfig = {
  name: "",
  alias: [],
  category: "uncategorized",
  description: "No description",
  usage: "",
  example: "",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  isAdmin: false,
  isBotAdmin: false,
  cooldown: 3,
  limit: 1,
  isEnabled: true,
};

// Catatan tabrakan nama command antar-plugin, diisi saat registrasi.
const duplicateCommands = [];
// Tabrakan ALIAS — sebelumnya tidak dilacak sama sekali.
const duplicateAliases = [];
// Kepemilikan nama per plugin, dipakai menghitung plugin yang tidak
// terjangkau setelah seluruh muatan selesai.
const pluginOwnership = [];
// alias → { filePath, primaryName } pendeklarasinya. Dipakai mendeteksi alias
// yang dibajak: masih hidup, tapi mengeksekusi plugin lain.
const aliasOrigin = new Map();
// Catatan berkas yang gagal dimuat (load error)
const loadErrorsMap = new Map();

const normalizePluginNames = (name) => {
  const values = Array.isArray(name) ? name : [name];
  return values
    .map((item) =>
      String(item || "")
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean);
};

const normalizePluginAliases = (alias) => {
  const values = Array.isArray(alias) ? alias : alias ? [alias] : [];
  return values
    .map((item) =>
      String(item || "")
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean);
};

const findRegisteredPluginByFilePath = (filePath) => {
  if (!filePath) {
    return null;
  }
  const resolvedFilePath = path.resolve(filePath);
  for (const plugin of new Set(pluginStore.commands.values())) {
    if (
      plugin?.filePath &&
      path.resolve(plugin.filePath) === resolvedFilePath
    ) {
      return plugin;
    }
  }
  return null;
};

const removePluginFromStore = (plugin) => {
  if (!plugin?.config) {
    return false;
  }
  const names = normalizePluginNames(plugin.config.name);
  const aliases = normalizePluginAliases(plugin.config.alias);
  const category = String(plugin.config.category || "").toLowerCase();
  for (const name of names) {
    pluginStore.commands.delete(name);
  }
  for (const alias of aliases) {
    pluginStore.aliases.delete(alias);
  }
  const categoryPlugins = pluginStore.categories.get(category);
  if (categoryPlugins) {
    const index = categoryPlugins.findIndex((item) => item === plugin);
    if (index !== -1) {
      categoryPlugins.splice(index, 1);
    }
  }
  return true;
};

/**
 * Memuat satu plugin dari file
 * @param {string} filePath - Path ke file plugin
 * @returns {Plugin|null} Plugin object atau null jika gagal
 * @example
 * const plugin = await loadPlugin('./plugins/main/ping.js');
 */
import { pathToFileURL } from "url";

async function loadPlugin(filePath, bustCache = false) {
  try {
    const fileUrl =
      pathToFileURL(path.resolve(filePath)).href +
      (bustCache ? "?t=" + Date.now() : "");
    let plugin = await import(fileUrl);

    if ((!plugin.config || !plugin.handler) && plugin.default) {
      plugin = plugin.default;
    }

    if (!plugin.config || !plugin.handler) {
      loadErrorsMap.set(path.resolve(filePath), "No valid config or handler exported");
      return null;
    }

    if (typeof plugin.handler !== "function") {
      loadErrorsMap.set(path.resolve(filePath), "Exported handler is not a function");
      return null;
    }

    let pInfo = {
      config: { ...defaultConfig, ...plugin.config },
      handler: plugin.handler,
      filePath: filePath,
    };

    if (!pInfo.config.name) {
      pInfo.config.name = path.basename(filePath, path.extname(filePath));
    }

    loadErrorsMap.delete(path.resolve(filePath));
    return pInfo;
  } catch (error) {
    const fileName = path.basename(filePath);
    loadErrorsMap.set(path.resolve(filePath), error.message);
    if (process.env.DEBUG_PLUGINS === "true" || true) {
      logger.error("plugin", `failed ${fileName} - ${error.message}`);
    }
    return null;
  }
}

/**
 * Mendaftarkan plugin ke store
 * @param {Plugin} plugin - Plugin untuk didaftarkan
 * @returns {boolean} True jika berhasil
 */
function registerPlugin(plugin) {
  if (!plugin || !plugin.config || !plugin.config.name) {
    return false;
  }

  const { name, alias, category } = plugin.config;

  const names = normalizePluginNames(name);
  const aliases = normalizePluginAliases(alias);
  const primaryName = names[0];
  if (!primaryName) {
    return false;
  }

  // Dua plugin dengan nama utama sama saling menimpa tanpa suara — yang dimuat
  // terakhir menang dan yang lain jadi tidak bisa dipanggil sama sekali.
  // Perilaku tidak diubah (menimpa tetap menimpa, supaya tidak ada command yang
  // mendadak hilang), tapi sekarang dicatat supaya ketahuan saat boot.
  for (const n of names) {
    const prev = pluginStore.commands.get(n);
    if (prev && prev.filePath !== plugin.filePath) {
      duplicateCommands.push({ command: n, kept: plugin.filePath, shadowed: prev.filePath });
    }
    pluginStore.commands.set(n, plugin);
  }

  // Alias juga saling menimpa, dan SEBELUM INI tidak dicatat sama sekali —
  // hanya tabrakan `name` yang terlacak. Akibatnya panel bisa melaporkan
  // "14 tabrakan" padahal ada plugin yang seluruh nama DAN aliasnya direbut
  // plugin lain, jadi benar-benar tidak bisa dipanggil. Contoh nyata:
  // plugins/cek/cekcupu.js (.cupu, .noob) dua-duanya direbut fun/siapa.js.
  for (const a of aliases) {
    const prev = pluginStore.aliases.get(a);
    if (prev && prev !== primaryName) {
      duplicateAliases.push({ alias: a, kept: primaryName, shadowed: prev });
    }
    pluginStore.aliases.set(a, primaryName);
  }
  // Alias dipetakan ke NAMA, bukan ke plugin. Itu sumber bug diam yang lebih
  // buruk daripada plugin mati: kalau `primaryName` nanti direbut plugin lain,
  // alias di sini tetap hidup tapi mengeksekusi plugin PEREBUT. Pengguna
  // mengetik `.howgay` (hanya ada di fun/gay.js) dan mendapat fun/siapa.js
  // tanpa pesan galat apa pun.
  //
  // Karena itu jalur asal alias disimpan terpisah, supaya keadaan akhir bisa
  // divonis setelah semua plugin dimuat (lihat getHijackedAliases).
  for (const a of aliases) {
    aliasOrigin.set(a, { filePath: plugin.filePath, primaryName });
  }
  // Dicatat untuk hitung keterjangkauan setelah SEMUA plugin dimuat. Tidak bisa
  // diputuskan di sini: plugin yang sekarang menang bisa direbut plugin
  // berikutnya, jadi vonis hanya sah setelah muatan selesai.
  pluginOwnership.push({ filePath: plugin.filePath, names, aliases, primaryName });

  const categoryLower = String(
    category || defaultConfig.category,
  ).toLowerCase();
  if (!pluginStore.categories.has(categoryLower)) {
    pluginStore.categories.set(categoryLower, []);
  }
  pluginStore.categories.get(categoryLower).push(plugin);

  return true;
}

function printPluginTable(plugins) {
  if (plugins.length === 0) return;

  const safeStr = (str) => {
    if (Array.isArray(str)) return str[0] || "";
    return String(str || "");
  };

  const grouped = {};
  plugins.forEach((p) => {
    const cat = safeStr(p.category);
    if (!grouped[cat]) grouped[cat] = 0;
    grouped[cat]++;
  });

  const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  const catCount = sorted.length;
  const TOP = 8;
  const top = sorted.slice(0, TOP);
  const rest = sorted.slice(TOP);
  const restTotal = rest.reduce((s, [, c]) => s + c, 0);

  const COL_W = 25;
  const pad = (cat, count, index) => {
    const label = String(cat).padEnd(12);
    return `${theme.colorizeCategory(label, index)} ${theme.pill(String(count), "accent")}`.padEnd(
      COL_W + 12,
    );
  };

  console.log("");
  console.log(
    `  ${theme.pill("plugins", "primary")} ${theme.rainbow(String(plugins.length))} ${theme.dim("total")} ${theme.border("│")} ${chalk.whiteBright(`${catCount} kategori`)}`,
  );
  console.log(`  ${theme.borderFx("─".repeat(58))}`);

  for (let i = 0; i < top.length; i += 2) {
    const left = pad(top[i][0], top[i][1], i);
    const right =
      i + 1 < top.length ? pad(top[i + 1][0], top[i + 1][1], i + 1) : "";
    console.log(`  ${left}  ${theme.border("│")}  ${right}`);
  }

  if (rest.length > 0) {
    console.log(
      `  ${theme.dim(`+${rest.length} lainnya`.padEnd(14))}${theme.pill(String(restTotal), "system")}`,
    );
  }

  // Peringatkan kalau ada command yang tertimpa: sebelumnya ini diam total,
  // jadi plugin yang kalah tampak "terpasang" padahal tidak akan pernah jalan.
  if (duplicateCommands.length > 0) {
    console.log("");
    console.log(
      `  ${theme.pill("duplikat", "system")} ${chalk.yellowBright(String(duplicateCommands.length))} ${theme.dim("command tertimpa (yang lama tidak aktif)")}`,
    );
    for (const d of duplicateCommands.slice(0, 10)) {
      const keep = path.relative(process.cwd(), d.kept);
      const lost = path.relative(process.cwd(), d.shadowed);
      console.log(`  ${theme.dim("·")} .${d.command} ${theme.dim("aktif:")} ${keep} ${theme.dim("mati:")} ${lost}`);
    }
    if (duplicateCommands.length > 10) {
      console.log(`  ${theme.dim(`+${duplicateCommands.length - 10} lainnya`)}`);
    }
  }

  // Ini yang benar-benar penting, dan sebelumnya tidak pernah dilaporkan:
  // plugin yang SELURUH nama dan aliasnya direbut plugin lain. Berkasnya
  // dimuat dan memakan memori, tapi tidak ada satu pun cara memanggilnya.
  const mati = getUnreachablePlugins();
  if (mati.length > 0) {
    console.log("");
    console.log(
      `  ${theme.pill("mati", "system")} ${chalk.redBright(String(mati.length))} ${theme.dim("plugin tak bisa dipanggil (semua namanya direbut)")}`,
    );
    for (const p of mati.slice(0, 10)) {
      const rel = path.relative(process.cwd(), p.filePath);
      console.log(`  ${theme.dim("·")} ${rel} ${theme.dim("nama:")} ${p.names.map((n) => "." + n).join(" ")}`);
    }
    if (mati.length > 10) {
      console.log(`  ${theme.dim(`+${mati.length - 10} lainnya`)}`);
    }
  }

  console.log("");
}

/**
 * Memuat semua plugins dari directory
 * @param {string} pluginsDir - Path ke directory plugins
 * @returns {number} Jumlah plugin yang berhasil dimuat
 * @example
 * const count = loadPlugins('./plugins');
 * console.log(`Loaded ${count} plugins`);
 */
async function loadPlugins(pluginsDir) {
  pluginStore.commands.clear();
  pluginStore.aliases.clear();
  pluginStore.categories.clear();
  duplicateCommands.length = 0;
  // Wajib direset bersama yang lain: `loadPlugins` bisa dipanggil ulang (hot
  // reload), dan array yang tidak dikosongkan akan menumpuk hasil muatan lama
  // sehingga hitungan duplikat/plugin-mati membengkak tiap reload.
  duplicateAliases.length = 0;
  pluginOwnership.length = 0;
  aliasOrigin.clear();

  let loadedCount = 0;
  const loadedPlugins = [];

  if (!fs.existsSync(pluginsDir)) {
    logger.warn("plugin", `directory not found: ${pluginsDir}`);
    return 0;
  }

  const categories = fs.readdirSync(pluginsDir);

  for (const category of categories) {
    const categoryPath = path.join(pluginsDir, category);

    if (!fs.statSync(categoryPath).isDirectory()) {
      if (category.endsWith(".js") && category !== "_index.js") {
        const plugin = await loadPlugin(categoryPath);
        if (plugin && registerPlugin(plugin)) {
          loadedCount++;
          loadedPlugins.push({
            name: plugin.config.name,
            category: "uncategorized",
          });
        }
      }
      continue;
    }

    const files = fs.readdirSync(categoryPath);

    for (const file of files) {
      if (!file.endsWith(".js") || file.startsWith("_")) continue;

      const filePath = path.join(categoryPath, file);
      const plugin = await loadPlugin(filePath);

      if (plugin) {
        if (
          !plugin.config.category ||
          plugin.config.category === "uncategorized"
        ) {
          plugin.config.category = category;
        }

        if (registerPlugin(plugin)) {
          loadedCount++;
          loadedPlugins.push({
            name: plugin.config.name,
            category: plugin.config.category,
          });
        }
      }
    }
  }

  printPluginTable(loadedPlugins);
  // Kasih tahu logger jumlah plugin asli supaya boot summary tidak salah hitung.
  setPluginTotal(loadedCount);
  return loadedCount;
}

/**
 * Mendapatkan plugin berdasarkan nama atau alias
 * @param {string} name - Nama command atau alias
 * @returns {Plugin|null} Plugin object atau null jika tidak ditemukan
 * @example
 * const plugin = getPlugin('menu');
 * if (plugin) {
 *   await plugin.handler(m, { sock, config });
 * }
 */
function getPlugin(name) {
  if (!name) return null;

  const nameLower = name.toLowerCase();

  if (pluginStore.commands.has(nameLower)) {
    return pluginStore.commands.get(nameLower);
  }

  if (pluginStore.aliases.has(nameLower)) {
    const commandName = pluginStore.aliases.get(nameLower);
    return pluginStore.commands.get(commandName);
  }

  return null;
}

/**
 * Mendapatkan semua plugins dalam kategori tertentu
 * @param {string} category - Nama kategori
 * @returns {Plugin[]} Array plugins dalam kategori
 * @example
 * const ownerPlugins = getPluginsByCategory('owner');
 */
function getPluginsByCategory(category) {
  if (!category) return [];
  return pluginStore.categories.get(category.toLowerCase()) || [];
}

/**
 * Mendapatkan semua kategori yang ada
 * @returns {string[]} Array nama kategori
 * @returns {string[]} Array nama kategori
 */
function getCategories() {
  return Array.from(pluginStore.categories.keys());
}

/**
 * Mendapatkan semua plugins
 * @returns {Plugin[]} Array semua plugins
 */
function getAllPlugins() {
  return Array.from(pluginStore.commands.values());
}

/**
 * Mendapatkan total jumlah plugins
 * @returns {number} Total plugins
 */
function getPluginCount() {
  return pluginStore.commands.size;
}

/**
 * Mendapatkan semua nama command dan alias as array (Cached)
 * @returns {string[]}
 */
function getAllCommandNames() {
  return [...pluginStore.commands.keys(), ...pluginStore.aliases.keys()];
}

/**
 * Mendapatkan daftar command per kategori untuk menu
 * @returns {Object<string, string[]>} Object dengan key kategori dan value array command names
 */
function getCommandsByCategory() {
  const result = {};

  for (const [category, plugins] of pluginStore.categories.entries()) {
    result[category] = [];
    for (const p of plugins) {
      if (!p.config.isEnabled) continue;
      const names = Array.isArray(p.config.name)
        ? p.config.name
        : [p.config.name];
      result[category].push(...names);
    }
  }

  return result;
}

/**
 * Mendapatkan info plugin untuk help
 * @param {string} name - Nama command
 * @returns {Object|null} Info plugin atau null
 */
function getPluginInfo(name) {
  const plugin = getPlugin(name);
  if (!plugin) return null;

  const { config } = plugin;

  return {
    name: config.name,
    alias: config.alias,
    category: config.category,
    description: config.description,
    usage: config.usage,
    example: config.example,
    isOwner: config.isOwner,
    isPremium: config.isPremium,
    cooldown: config.cooldown,
  };
}

/**
 * Reload single plugin
 * @param {string} name - Nama command untuk reload
 * @returns {boolean} True jika berhasil
 */
async function reloadPlugin(name) {
  const plugin = getPlugin(name);
  if (!plugin || !plugin.filePath) return false;

  const category = plugin.config.category;

  pluginStore.commands.delete(name.toLowerCase());

  for (const alias of plugin.config.alias || []) {
    pluginStore.aliases.delete(alias.toLowerCase());
  }

  const categoryPlugins = pluginStore.categories.get(category.toLowerCase());
  if (categoryPlugins) {
    const index = categoryPlugins.findIndex((p) => p.config.name === name);
    if (index !== -1) {
      categoryPlugins.splice(index, 1);
    }
  }

  const newPlugin = await loadPlugin(plugin.filePath);
  if (newPlugin && registerPlugin(newPlugin)) {
    logger.success("plugin", `reloaded: ${name}`);
    return true;
  }

  return false;
}

/**
 * Disable plugin
 * @param {string} name - Nama command untuk disable
 * @returns {boolean} True jika berhasil
 */
function disablePlugin(name) {
  const plugin = getPlugin(name);
  if (!plugin) return false;

  plugin.config.isEnabled = false;
  return true;
}

/**
 * Enable plugin
 * @param {string} name - Nama command untuk enable
 * @returns {boolean} True jika berhasil
 */
function enablePlugin(name) {
  const plugin = getPlugin(name);
  if (!plugin) return false;

  plugin.config.isEnabled = true;
  return true;
}

/**
 * Cek apakah plugin aktif
 * @param {string} name - Nama command
 * @returns {boolean} True jika plugin aktif
 */
function isPluginEnabled(name) {
  const plugin = getPlugin(name);
  return plugin ? plugin.config.isEnabled : false;
}

async function hotReloadPlugin(filePath) {
  let primaryName = "";
  try {
    const plugin = await loadPlugin(filePath, true);
    if (!plugin) {
      return { success: false, error: "Failed to load plugin" };
    }

    const names = normalizePluginNames(plugin.config.name);
    primaryName = names[0] || "";

    const existingPlugin =
      findRegisteredPluginByFilePath(filePath) ||
      (primaryName ? pluginStore.commands.get(primaryName) : null);
    if (existingPlugin) {
      removePluginFromStore(existingPlugin);
    }

    if (registerPlugin(plugin)) {
      logger.success("plugin", `hot reloaded: ${primaryName}`);
      return { success: true, name: primaryName };
    }

    return { success: false, error: "Failed to register plugin" };
  } catch (error) {
    logger.error("plugin", `hot reload error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

function unloadPlugin(name) {
  try {
    const nameLower = name.toLowerCase();
    let plugin = pluginStore.commands.get(nameLower);

    if (!plugin) {
      const commandName = pluginStore.aliases.get(nameLower);
      if (commandName) {
        plugin = pluginStore.commands.get(commandName);
      }
    }

    if (!plugin && /[\\/]/.test(name)) {
      plugin = findRegisteredPluginByFilePath(name);
    }

    if (!plugin) {
      return { success: false, error: "Plugin not found" };
    }

    const names = normalizePluginNames(plugin.config.name);
    const primaryName = names[0] || nameLower;

    removePluginFromStore(plugin);

    if (plugin.filePath) {
      try {
        // require.cache removed
      } catch (e) { /* cleanup */ }
    }

    logger.warn("plugin", `unloaded: ${primaryName}`);
    return { success: true, name: primaryName };
  } catch (error) {
    logger.error("plugin", `unload error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Daftar command yang tertimpa plugin lain (nama utama sama). Dipakai untuk
// melaporkan tabrakan setelah semua plugin dimuat.
function getDuplicateCommands() {
  return duplicateCommands.slice();
}

// Plugin yang SELURUH nama + aliasnya dimenangkan plugin lain, jadi tidak ada
// satu pun cara memanggilnya. Dihitung dari keadaan akhir pluginStore (bukan
// dari urutan muat) supaya vonisnya mencerminkan apa yang benar-benar aktif.
//
// Bedanya dengan getDuplicateCommands: satu nama bertabrakan belum tentu
// masalah — plugin yang kalah mungkin masih punya nama lain yang lolos. Yang
// dilaporkan di sini hanya plugin yang benar-benar mati total.
function getUnreachablePlugins() {
  const mati = [];
  for (const p of pluginOwnership) {
    const semua = [...p.names, ...p.aliases];
    if (semua.length === 0) continue;
    const hidup = semua.some((n) => {
      const lewatNama = pluginStore.commands.get(n);
      if (lewatNama && lewatNama.filePath === p.filePath) return true;
      const utama = pluginStore.aliases.get(n);
      if (!utama) return false;
      const lewatAlias = pluginStore.commands.get(utama);
      return !!lewatAlias && lewatAlias.filePath === p.filePath;
    });
    if (!hidup) {
      mati.push({ filePath: p.filePath, names: p.names, aliases: p.aliases });
    }
  }
  return mati;
}

// Tabrakan alias antar-plugin.
function getDuplicateAliases() {
  return duplicateAliases.slice();
}

// Alias DIBAJAK: alias `a` ditulis di berkas X, tapi `getPlugin(a)` mengembalikan
// berkas Y. Terjadi karena alias dipetakan ke nama, dan nama itu direbut plugin
// lain setelahnya.
//
// Kenapa dipisah dari duplicateAliases: tabrakan alias biasa (dua plugin sama-sama
// mendeklarasikan `.fb`) memang harus ada yang menang — itu bukan bug. Yang di
// sini adalah alias yang pemiliknya tunggal tapi tetap menjalankan plugin lain,
// dan itu selalu salah.
function getHijackedAliases() {
  const hasil = [];
  for (const [alias, asal] of aliasOrigin.entries()) {
    const utama = pluginStore.aliases.get(alias);
    // Alias direbut plugin lain yang juga mendeklarasikannya: tabrakan wajar.
    if (utama !== asal.primaryName) continue;
    const tujuan = pluginStore.commands.get(utama);
    if (!tujuan) continue;
    if (tujuan.filePath !== asal.filePath) {
      hasil.push({ alias, declaredIn: asal.filePath, executes: tujuan.filePath });
    }
  }
  return hasil;
}

/**
 * Mengambil daftar seluruh plugin secara detail untuk dashboard montir admin
 */
function getDetailedPluginsList() {
  const stats = ambilStatistikPlugin();
  const disabledSet = daftarPluginMati();
  const unreachables = new Set(getUnreachablePlugins().map((p) => path.resolve(p.filePath)));
  const list = [];
  const visitedPaths = new Set();

  for (const [cmd, plugin] of pluginStore.commands.entries()) {
    const filePath = plugin.filePath ? path.resolve(plugin.filePath) : null;
    if (!filePath || visitedPaths.has(filePath)) continue;
    visitedPaths.add(filePath);

    const relPath = path.relative(process.cwd(), plugin.filePath).replace(/\\/g, "/");
    const rawName = Array.isArray(plugin.config?.name) ? plugin.config.name[0] : plugin.config?.name;
    const name = String(rawName || path.basename(plugin.filePath, ".js")).trim();
    const isOff = apakahPluginMati(name) || apakahPluginMati(relPath) || disabledSet.has(name);
    const isUnreachable = unreachables.has(filePath);
    const loadErr = loadErrorsMap.get(filePath) || null;
    const pStat = stats[name.toLowerCase()] || { runs: 0, success: 0, errors: 0, lastRun: 0, lastError: null };

    let status = "online";
    if (loadErr) {
      status = "error";
    } else if (isOff) {
      status = "disabled";
    } else if (isUnreachable) {
      status = "shadowed";
    } else if (pStat.errors > 0 && pStat.errors >= pStat.runs) {
      status = "error";
    }

    list.push({
      name,
      aliases: normalizePluginAliases(plugin.config?.alias),
      category: plugin.config?.category || "uncategorized",
      description: plugin.config?.description || "",
      usage: plugin.config?.usage || "",
      example: plugin.config?.example || "",
      filePath: relPath,
      isOwner: !!plugin.config?.isOwner,
      isPremium: !!plugin.config?.isPremium,
      isGroup: !!plugin.config?.isGroup,
      isAdmin: !!plugin.config?.isAdmin,
      cooldown: plugin.config?.cooldown || 0,
      limit: plugin.config?.limit || 0,
      isEnabled: !isOff,
      status, // 'online' | 'error' | 'disabled' | 'shadowed'
      runs: pStat.runs || 0,
      success: pStat.success || 0,
      errors: pStat.errors || 0,
      lastRun: pStat.lastRun || 0,
      lastError: pStat.lastError || (loadErr ? { message: loadErr, time: Date.now() } : null),
    });
  }

  // Tambahkan file-file yang gagal di-load
  for (const [errPath, errMsg] of loadErrorsMap.entries()) {
    if (!visitedPaths.has(errPath)) {
      const relPath = path.relative(process.cwd(), errPath).replace(/\\/g, "/");
      const name = path.basename(errPath, ".js");
      list.push({
        name,
        aliases: [],
        category: "error",
        description: "Gagal dimuat saat startup / import",
        usage: "",
        example: "",
        filePath: relPath,
        isOwner: false,
        isPremium: false,
        isGroup: false,
        isAdmin: false,
        cooldown: 0,
        limit: 0,
        isEnabled: false,
        status: "error",
        runs: 0,
        success: 0,
        errors: 1,
        lastRun: 0,
        lastError: { message: errMsg, time: Date.now() },
      });
    }
  }

  // Sort by category then name
  list.sort((a, b) => {
    if (a.status === "error" && b.status !== "error") return -1;
    if (b.status === "error" && a.status !== "error") return 1;
    const catComp = a.category.localeCompare(b.category);
    return catComp !== 0 ? catComp : a.name.localeCompare(b.name);
  });

  return {
    ok: true,
    total: list.length,
    onlineCount: list.filter((p) => p.status === "online").length,
    errorCount: list.filter((p) => p.status === "error").length,
    disabledCount: list.filter((p) => p.status === "disabled").length,
    shadowedCount: list.filter((p) => p.status === "shadowed").length,
    categoriesCount: new Set(list.map((p) => p.category)).size,
    plugins: list,
  };
}

/**
 * Diagnostic & Audit menyeluruh semua file plugin di folder plugins/
 */
async function auditAllPlugins(pluginsDir = "./plugins") {
  const root = path.resolve(pluginsDir);
  const files = [];

  function scan(dir) {
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, f.name);
      if (f.isDirectory()) {
        scan(full);
      } else if (f.name.endsWith(".js") && !f.name.startsWith("_")) {
        files.push(full);
      }
    }
  }
  scan(root);

  const commandMap = new Map();
  const aliasMap = new Map();
  const errors = [];
  const results = [];
  const duplicateCmds = [];
  const duplicateAlis = [];

  for (const file of files) {
    const rel = path.relative(process.cwd(), file).replace(/\\/g, "/");
    try {
      const fileUrl = pathToFileURL(file).href + "?audit=" + Date.now();
      let mod = await import(fileUrl);
      let p = mod;
      if ((!p.config || !p.handler) && p.default) p = p.default;

      if (!p.config && !p.handler) {
        errors.push({ file: rel, error: "Tidak mengekspor config maupun handler" });
        results.push({ file: rel, status: "error", error: "Missing config & handler" });
        continue;
      }

      if (!p.handler || typeof p.handler !== "function") {
        errors.push({ file: rel, error: "Handler bukan merupakan fungsi yang valid" });
        results.push({ file: rel, status: "error", error: "Invalid handler function" });
        continue;
      }

      const cfg = p.config || {};
      const name = cfg.name || path.basename(file, ".js");
      const names = normalizePluginNames(name);
      const aliases = normalizePluginAliases(cfg.alias);

      for (const n of names) {
        if (commandMap.has(n)) {
          duplicateCmds.push({ command: n, kept: rel, shadowed: commandMap.get(n) });
        } else {
          commandMap.set(n, rel);
        }
      }

      for (const a of aliases) {
        if (aliasMap.has(a)) {
          duplicateAlis.push({ alias: a, kept: rel, shadowed: aliasMap.get(a) });
        } else {
          aliasMap.set(a, rel);
        }
      }

      results.push({
        file: rel,
        name,
        category: cfg.category || "uncategorized",
        aliases,
        status: "ok",
      });
    } catch (err) {
      errors.push({ file: rel, error: err.message });
      results.push({ file: rel, status: "error", error: err.message });
    }
  }

  return {
    ok: true,
    scannedFiles: files.length,
    validCount: results.filter((r) => r.status === "ok").length,
    errorCount: errors.length,
    errors,
    duplicateCommandsCount: duplicateCmds.length,
    duplicateCommands: duplicateCmds,
    duplicateAliasesCount: duplicateAlis.length,
    duplicateAliases: duplicateAlis,
    timestamp: Date.now(),
  };
}

/**
 * Hot-reload satu file plugin dari disk
 */
async function reloadSinglePlugin(filePathOrName) {
  if (!filePathOrName) return { success: false, error: "Nama atau file path wajib diisi" };

  let targetPath = null;
  const clean = String(filePathOrName).trim();

  if (fs.existsSync(clean)) {
    targetPath = path.resolve(clean);
  } else if (fs.existsSync(path.join(process.cwd(), clean))) {
    targetPath = path.resolve(path.join(process.cwd(), clean));
  } else {
    // Cari di pluginStore berdasarkan nama atau alias
    const p = getPlugin(clean);
    if (p && p.filePath) {
      targetPath = path.resolve(p.filePath);
    }
  }

  if (!targetPath || !fs.existsSync(targetPath)) {
    return { success: false, error: `File plugin tidak ditemukan: ${clean}` };
  }

  try {
    // Hapus plugin lama dari store jika ada
    const oldPlugin = findRegisteredPluginByFilePath(targetPath);
    if (oldPlugin) {
      removePluginFromStore(oldPlugin);
    }

    // Muat ulang dengan cache busting
    const newPlugin = await loadPlugin(targetPath, true);
    if (!newPlugin) {
      const errMsg = loadErrorsMap.get(targetPath) || "Format plugin tidak valid";
      return { success: false, error: errMsg };
    }

    const reg = registerPlugin(newPlugin);
    if (!reg) {
      return { success: false, error: "Gagal mendaftarkan plugin ke registry" };
    }

    return {
      success: true,
      name: newPlugin.config.name,
      category: newPlugin.config.category,
      filePath: path.relative(process.cwd(), targetPath).replace(/\\/g, "/"),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Hot-reload seluruh plugin tanpa merestart koneksi WhatsApp
 */
async function reloadAllPlugins(pluginsDir = "./plugins") {
  try {
    const count = await loadPlugins(pluginsDir);
    return {
      success: true,
      count,
      unreachable: getUnreachablePlugins().length,
      duplicates: getDuplicateCommands().length,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Uji syntax dan validitas ekspor plugin
 */
async function testPlugin(filePathOrName) {
  if (!filePathOrName) return { valid: false, error: "Path atau nama plugin wajib diisi" };
  let targetPath = null;
  const clean = String(filePathOrName).trim();

  if (fs.existsSync(clean)) {
    targetPath = path.resolve(clean);
  } else if (fs.existsSync(path.join(process.cwd(), clean))) {
    targetPath = path.resolve(path.join(process.cwd(), clean));
  } else {
    const p = getPlugin(clean);
    if (p && p.filePath) targetPath = path.resolve(p.filePath);
  }

  if (!targetPath || !fs.existsSync(targetPath)) {
    return { valid: false, error: `Berkas tidak ditemukan: ${clean}` };
  }

  try {
    const fileUrl = pathToFileURL(targetPath).href + "?test=" + Date.now();
    let mod = await import(fileUrl);
    let p = mod;
    if ((!p.config || !p.handler) && p.default) p = p.default;

    if (!p.config && !p.handler) {
      return { valid: false, error: "Tidak mengekspor config maupun handler" };
    }
    if (!p.handler || typeof p.handler !== "function") {
      return { valid: false, error: "Exported handler bukan fungsi" };
    }

    return {
      valid: true,
      name: p.config?.name || path.basename(targetPath, ".js"),
      category: p.config?.category || "uncategorized",
      aliases: normalizePluginAliases(p.config?.alias),
      description: p.config?.description || "",
      filePath: path.relative(process.cwd(), targetPath).replace(/\\/g, "/"),
    };
  } catch (err) {
    return { valid: false, error: err.message, stack: err.stack };
  }
}

export {
  loadPlugin,
  loadPlugins,
  registerPlugin,
  getPlugin,
  getPluginsByCategory,
  getCategories,
  getAllPlugins,
  getPluginCount,
  getCommandsByCategory,
  getPluginInfo,
  reloadPlugin,
  disablePlugin,
  enablePlugin,
  isPluginEnabled,
  hotReloadPlugin,
  unloadPlugin,
  pluginStore,
  defaultConfig,
  getAllCommandNames,
  getDuplicateCommands,
  getDuplicateAliases,
  getHijackedAliases,
  getUnreachablePlugins,
  getDetailedPluginsList,
  auditAllPlugins,
  reloadSinglePlugin,
  reloadAllPlugins,
  testPlugin,
};
