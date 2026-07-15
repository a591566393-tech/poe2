(function () {
  const Core = window.CraftingCore;
  const I18N = window.POE2DB_I18N_DATA || { bases: {}, actions: {}, modifiers: {} };

  const state = {
    item: null,
    undoStack: [],
    lastMessage: "",
    lockedOmenId: null,
    baseCategory: "all",
    lang: readStoredLanguage(),
    market: {
      loading: false,
      error: "",
      league: null,
      rates: [],
      updatedAt: null,
    },
  };

  const els = {};

  function readStoredLanguage() {
    try {
      return localStorage.getItem("poe2CraftLang") || "zh-Hans";
    } catch (error) {
      return "zh-Hans";
    }
  }

  const SEARCH_FOLD_MAP = {
    藍: "蓝",
    紅: "红",
    寶: "宝",
    鑽: "钻",
    時: "时",
    空: "空",
    珠: "珠",
    劑: "剂",
    質: "质",
    預: "预",
    徵: "征",
    褻: "亵",
    瀆: "渎",
    緒: "绪",
    華: "华",
    髓: "髓",
    詞: "词",
    前: "前",
    後: "后",
    綴: "缀",
    閃: "闪",
    電: "电",
    冰: "冰",
    火: "火",
    燄: "焰",
    傷: "伤",
    害: "害",
    稀: "稀",
    有: "有",
    魔: "魔",
    法: "法",
    普: "普",
    通: "通",
    攻: "攻",
    击: "擊",
    基: "基",
    础: "礎",
    增: "增",
    减: "減",
    额: "額",
    暴: "暴",
    范: "範",
    围: "圍",
    敌: "敵",
    攻: "攻",
    击: "擊",
    基: "基",
    础: "礎",
    增: "增",
    减: "減",
    额: "額",
    外: "外",
    暴: "暴",
    移: "移",
    速: "速",
    效: "效",
    果: "果",
    范: "範",
    围: "圍",
    对: "對",
    敌: "敵",
    人: "人",
    造: "造",
    成: "成",
    更: "更",
    少: "少",
    多: "多",
    吸: "吸",
    取: "取",
    击中: "擊中",
    命中: "命中",
    速度: "速度",
  };

  const TRADITIONAL_PHRASE_MAP = {
    "液化情感": "液化情緒",
    "稀释的": "稀釋的",
    "浓缩的": "濃縮的",
    "强效的": "強效的",
    "远古": "遠古",
    "愤怒": "憤怒",
    "内疚": "內疚",
    "贪婪": "貪婪",
    "偏执": "偏執",
    "憎恶": "憎惡",
    "绝望": "絕望",
    "恐惧": "恐懼",
    "孤独": "孤獨",
    "凶残": "兇殘",
    "轻蔑": "輕蔑",
    "闪电": "閃電",
    "伤害": "傷害",
    "能量护盾": "能量護盾",
    "闪避": "閃避",
    "护甲": "護甲",
    "显示": "顯示",
    "可用": "可用",
    "数据加载失败": "數據載入失敗",
    "数据": "數據",
    "加载": "載入",
    "载入": "載入",
    "词缀": "詞綴",
    "当前": "當前",
    "随机": "隨機",
    "品质": "品質",
    "通货": "通貨",
    "底材": "底材",
    "物品": "物品",
    "等级": "等級",
    "前缀": "前綴",
    "后缀": "後綴",
    "亵渎": "褻瀆",
    "深渊": "深淵",
    "回响": "回響",
    "预兆": "預兆",
    "符文": "符文",
    "插槽": "插槽",
    "腐化": "腐化",
    "破溃": "破潰",
    "锁定": "鎖定",
    "自定义": "自訂",
    "开局": "開局",
    "筛选": "篩選",
    "清空": "清空",
    "应用": "套用",
    "撤销": "復原",
    "复制": "複製",
    "搜索": "搜尋",
    "生命": "生命",
    "魔力": "魔力",
    "火焰": "火焰",
    "冰霜": "冰霜",
    "抗性": "抗性",
    "速度": "速度",
    "暴击": "暴擊",
    "命中": "命中",
    "攻击": "攻擊",
    "法术": "法術",
    "近战": "近戰",
    "施法": "施法",
    "提高": "提高"
  };

  const TRADITIONAL_MAP = {
    攻: "攻",
    击: "擊",
    基: "基",
    础: "礎",
    增: "增",
    减: "減",
    额: "額",
    暴: "暴",
    范: "範",
    围: "圍",
    敌: "敵",
    蓝: "藍",
    红: "紅",
    宝: "寶",
    钻: "鑽",
    时: "時",
    语: "語",
    言: "言",
    做: "做",
    装: "裝",
    模: "模",
    拟: "擬",
    器: "器",
    编: "編",
    年: "年",
    史: "史",
    字: "字",
    段: "段",
    对: "對",
    齐: "齊",
    样: "樣",
    例: "例",
    数: "數",
    据: "據",
    词: "詞",
    缀: "綴",
    底: "底",
    材: "材",
    搜: "搜",
    索: "索",
    类: "類",
    型: "型",
    英: "英",
    文: "文",
    名: "名",
    物: "物",
    品: "品",
    等: "等",
    级: "級",
    随: "隨",
    机: "機",
    种: "種",
    子: "子",
    锁: "鎖",
    定: "定",
    用: "用",
    于: "於",
    复: "複",
    现: "現",
    同: "同",
    一: "一",
    条: "條",
    路: "路",
    线: "線",
    货: "貨",
    阶: "階",
    普: "普",
    高: "高",
    完: "完",
    美: "美",
    重: "重",
    置: "置",
    撤: "撤",
    销: "銷",
    复制: "複製",
    自: "自",
    定: "定",
    义: "義",
    开: "開",
    局: "局",
    稀: "稀",
    有: "有",
    度: "度",
    筛: "篩",
    选: "選",
    缀: "綴",
    后: "後",
    应: "應",
    清: "清",
    空: "空",
    当前: "當前",
    全部: "全部",
    合: "合",
    金: "金",
    符: "符",
    只: "只",
    看: "看",
    可: "可",
    未: "未",
    操: "操",
    作: "作",
    历: "歷",
    深: "深",
    渊: "淵",
    回: "回",
    响: "響",
    选: "選",
    择: "擇",
    揭: "揭",
    露: "露",
    移: "移",
    除: "除",
    添: "添",
    加: "加",
    概: "概",
    率: "率",
    插: "插",
    槽: "槽",
    镜: "鏡",
    像: "像",
    腐: "腐",
    化: "化",
    破: "破",
    溃: "潰",
    预: "預",
    兆: "兆",
    亵: "褻",
    渎: "瀆",
    精: "精",
    髓: "髓",
    液: "液",
    情: "情",
    感: "感",
    催: "催",
    剂: "劑",
    质: "質",
    伤: "傷",
    焰: "焰",
    抗: "抗",
    性: "性",
    冰: "冰",
    霜: "霜",
    闪: "閃",
    电: "電",
    生: "生",
    命: "命",
    护: "護",
    甲: "甲",
    能: "能",
    量: "量",
    盾: "盾",
    闪避: "閃避",
  };

  const MARKET_CACHE_URL = "./data/market-rates.json?v=20260715-market-items1";
  const MARKET_COST_ACTION_API_IDS = {
    alchemy: "alch",
    annulment: "annul",
    arcanist_etcher: "etcher",
    artificer: "artificers",
    armour_scrap: "scrap",
    augmentation: "aug",
    chance: "chance",
    chaos: "chaos",
    exalted: "exalted",
    divine: "divine",
    fracturing: "fracturing-orb",
    mirror: "mirror",
    regal: "regal",
    transmutation: "transmute",
    vaal: "vaal",
    vaal_arcanists_etcher: "vaal-arcanists-infuser",
    vaal_armour_infuser: "vaal-armourers-infuser",
    vaal_catalysing_infuser: "vaal-catalysing-infuser",
    vaal_whetstone: "vaal-blacksmiths-infuser",
    whetstone: "whetstone",
  };

  const MARKET_COST_TIER_API_IDS = {
    augmentation: {
      normal: "aug",
      greater: "greater-orb-of-augmentation",
      perfect: "perfect-orb-of-augmentation",
    },
    chaos: {
      normal: "chaos",
      greater: "greater-chaos-orb",
      perfect: "perfect-chaos-orb",
    },
    exalted: {
      normal: "exalted",
      greater: "greater-exalted-orb",
      perfect: "perfect-exalted-orb",
    },
    regal: {
      normal: "regal",
      greater: "greater-regal-orb",
      perfect: "perfect-regal-orb",
    },
    transmutation: {
      normal: "transmute",
      greater: "greater-orb-of-transmutation",
      perfect: "perfect-orb-of-transmutation",
    },
  };

  const MARKET_COST_OMEN_API_IDS = {
    omen_alchemy_prefixes: "omen-of-sinistral-alchemy",
    omen_alchemy_suffixes: "omen-of-dextral-alchemy",
    omen_annulment_powerful: "omen-of-greater-annulment",
    omen_annulment_prefix: "omen-of-sinistral-annulment",
    omen_annulment_suffix: "omen-of-dextral-annulment",
    omen_bright: "omen-of-light",
    omen_catalysing_exaltation: "omen-of-catalysing-exaltation",
    omen_chance_ancient: "omen-of-the-ancients",
    omen_chance_safe: "omen-of-chance",
    omen_chaos_lowest: "omen-of-whittling",
    omen_chaos_prefix: "omen-of-sinistral-erasure",
    omen_chaos_suffix: "omen-of-dextral-erasure",
    omen_desecration_amanamu: "omen-of-the-liege",
    omen_desecration_kurgal: "omen-of-the-blackblooded",
    omen_desecration_prefix: "omen-of-sinistral-necromancy",
    omen_desecration_reroll: "omen-of-abyssal-echoes",
    omen_desecration_rotting: "omen-of-putrefaction",
    omen_desecration_suffix: "omen-of-dextral-necromancy",
    omen_desecration_ulaman: "omen-of-the-sovereign",
    omen_essence_prefix: "omen-of-sinistral-crystallisation",
    omen_essence_suffix: "omen-of-dextral-crystallisation",
    omen_exalted_homogenising: "omen-of-homogenising-exaltation",
    omen_exalted_powerful: "omen-of-greater-exaltation",
    omen_exalted_prefix: "omen-of-sinistral-exaltation",
    omen_exalted_suffix: "omen-of-dextral-exaltation",
    omen_regal_homogenising: "omen-of-homogenising-coronation",
    omen_regal_prefix: "omen-of-sinistral-coronation",
    omen_regal_suffix: "omen-of-dextral-coronation",
  };

  const MARKET_COST_DESECRATION_API_IDS = {
    abyssal_echoes: "omen-of-abyssal-echoes",
    altered_lockbone: "altered-collarbone",
    ancient_jawbone: "ancient-jawbone",
    ancient_lockbone: "ancient-collarbone",
    ancient_rib: "ancient-rib",
    gnawing_jawbone: "gnawed-jawbone",
    gnawing_lockbone: "gnawed-collarbone",
    gnawing_rib: "gnawed-rib",
    preserved_cranium: "preserved-cranium",
    preserved_jawbone: "preserved-jawbone",
    preserved_lockbone: "preserved-collarbone",
    preserved_rib: "preserved-rib",
    preserved_vertebrae: "preserved-vertebrae",
  };

  const MARKET_COST_RUNE_API_IDS = {
    rune_cold: "glacial-rune",
    rune_fire: "desert-rune",
    rune_iron: "iron-rune",
    rune_lightning: "storm-rune",
    serles_triumph: "serles-triumph",
  };

  const ACTION_CATEGORY_ORDER = [
    "currency",
    "omen",
    "essence",
    "alloy",
    "liquid_emotion",
    "catalyst",
    "desecration",
    "soul_core",
    "rune",
  ];

  const BASE_CATEGORY_ORDER = [
    "weapon",
    "armour",
    "offhand",
    "jewellery",
    "jewel",
    "other",
  ];

  const BASE_CATEGORY_CLASSES = {
    weapon: new Set([
      "bow",
      "claw",
      "crossbow",
      "dagger",
      "flail",
      "one_hand_axe",
      "one_hand_mace",
      "one_hand_sword",
      "quarterstaff",
      "sceptre",
      "spear",
      "staff",
      "trap",
      "two_hand_axe",
      "two_hand_mace",
      "two_hand_sword",
      "wand",
    ]),
    armour: new Set([
      "body_armour",
      "boots",
      "gloves",
      "helmet",
    ]),
    offhand: new Set([
      "buckler",
      "focus",
      "quiver",
      "shield",
    ]),
    jewellery: new Set([
      "amulet",
      "belt",
      "ring",
      "talisman",
    ]),
    jewel: new Set([
      "jewel",
    ]),
  };

  const TEXT = {
    "zh-Hans": {
      language: "语言",
      appTitle: "PoE2 做装模拟器",
      subtitle: "编年史字段对齐样例数据 · ",
      base: "底材",
      baseSearchPlaceholder: "搜索底材、类型、英文名",
      itemLevel: "物品等级",
      seed: "随机种子",
      seedLock: "锁定种子，用于复现同一条做装路线",
      tier: "通货等阶",
      normalTier: "普通",
      greaterTier: "高级",
      perfectTier: "完美",
      reset: "重置底材",
      undo: "撤销",
      copy: "复制 JSON",
      customStart: "自定义开局",
      rarity: "稀有度",
      normalRarity: "普通",
      magicRarity: "魔法",
      rareRarity: "稀有",
      customSearch: "筛选词缀",
      customSearchPlaceholder: "火焰伤害、T1、抗性、group",
      prefix: "前缀",
      suffix: "后缀",
      prefix1: "前缀 1",
      prefix2: "前缀 2",
      prefix3: "前缀 3",
      prefix4: "前缀 4",
      suffix1: "后缀 1",
      suffix2: "后缀 2",
      suffix3: "后缀 3",
      suffix4: "后缀 4",
      applyCustom: "应用自定义开局",
      clearCustom: "清空选择",
      currency: "通货",
      currencySearchPlaceholder: "搜索通货、预兆、规则",
      all: "全部",
      omen: "预兆",
      essence: "精髓",
      alloy: "合金",
      liquidEmotion: "液化情感",
      catalyst: "催化剂",
      desecration: "亵渎",
      rune: "符文",
      lockOmen: "锁定预兆",
      clearOmen: "清除预兆",
      usableOnly: "只看可用",
      unlockedOmen: "未锁定预兆",
      marketRates: "市场汇率",
      refreshMarket: "刷新",
      history: "操作历史",
      pool: "当前词缀池",
      poolSearchPlaceholder: "搜索生命、移速、抗性、group",
    },
    en: {
      language: "Language",
      appTitle: "PoE2 Crafting Simulator",
      subtitle: "PoE2DB-aligned data · ",
      base: "Base",
      baseSearchPlaceholder: "Search base, class, English name",
      itemLevel: "Item level",
      seed: "Random seed",
      seedLock: "Lock seed to reproduce the same craft route",
      tier: "Currency tier",
      normalTier: "Normal",
      greaterTier: "Greater",
      perfectTier: "Perfect",
      reset: "Reset base",
      undo: "Undo",
      copy: "Copy JSON",
      customStart: "Custom start",
      rarity: "Rarity",
      normalRarity: "Normal",
      magicRarity: "Magic",
      rareRarity: "Rare",
      customSearch: "Filter modifiers",
      customSearchPlaceholder: "fire damage, T1, resistance, group",
      prefix: "Prefix",
      suffix: "Suffix",
      prefix1: "Prefix 1",
      prefix2: "Prefix 2",
      prefix3: "Prefix 3",
      prefix4: "Prefix 4",
      suffix1: "Suffix 1",
      suffix2: "Suffix 2",
      suffix3: "Suffix 3",
      suffix4: "Suffix 4",
      applyCustom: "Apply custom start",
      clearCustom: "Clear selection",
      currency: "Currency",
      currencySearchPlaceholder: "Search currency, omen, rule",
      all: "All",
      omen: "Omen",
      essence: "Essence",
      alloy: "Alloy",
      liquidEmotion: "Liquid Emotion",
      catalyst: "Catalyst",
      desecration: "Desecration",
      rune: "Rune",
      lockOmen: "Lock omen",
      clearOmen: "Clear omen",
      usableOnly: "Usable only",
      unlockedOmen: "No omen locked",
      marketRates: "Market Rates",
      refreshMarket: "Refresh",
      history: "History",
      pool: "Current mod pool",
      poolSearchPlaceholder: "Search life, speed, resistance, group",
    },
  };

  TEXT["zh-Hant"] = Object.keys(TEXT["zh-Hans"]).reduce(function (map, key) {
    map[key] = toTraditional(TEXT["zh-Hans"][key]);
    return map;
  }, {});

  document.addEventListener("DOMContentLoaded", function () {
    bindElements();
    moveTierControlToCurrencyPanel();
    localizeDocument();
    populateBaseSelect();
    populateActionButtons();
    populatePoolActionSelect();
    attachEvents();
    resetItem();
    renderMarketRates();
    loadMarketRates(false);
  });

  function bindElements() {
    [
      "baseSelect",
      "baseSearch",
      "baseCategoryTabs",
      "baseStats",
      "itemLevel",
      "seedInput",
      "seedLock",
      "tierSelect",
      "customRarity",
      "customPrefix1",
      "customPrefix2",
      "customPrefix3",
      "customPrefix4",
      "customSuffix1",
      "customSuffix2",
      "customSuffix3",
      "customSuffix4",
      "customModSearch",
      "customStats",
      "applyCustomButton",
      "clearCustomButton",
      "currencySearch",
      "currencyCategory",
      "currencyCategoryTabs",
      "currencyStats",
      "usableOnly",
      "lockOmen",
      "clearOmenButton",
      "lockedOmenStatus",
      "marketRates",
      "refreshMarketButton",
      "poolAction",
      "poolSearch",
      "resetButton",
      "undoButton",
      "copyButton",
      "toast",
      "itemPanel",
      "currencyGrid",
      "historyList",
      "historyStats",
      "poolStats",
      "poolList",
      "dataVersion",
      "languageSelect",
    ].forEach(function (id) {
      els[id] = document.getElementById(id);
    });
  }

  function moveTierControlToCurrencyPanel() {
    const tierSelect = document.getElementById("tierSelect");
    const currencyTools = document.querySelector(".currency-tools");
    const tierLabel = tierSelect && tierSelect.closest("label");
    if (!tierSelect || !currencyTools || !tierLabel || tierLabel.parentElement === currencyTools) return;

    const oldFieldGrid = tierLabel.parentElement;
    tierLabel.classList.add("currency-tier-control");
    const omenLockRow = currencyTools.querySelector(".omen-lock-row");
    if (omenLockRow) currencyTools.insertBefore(tierLabel, omenLockRow);
    else currencyTools.appendChild(tierLabel);
    if (oldFieldGrid && oldFieldGrid.children.length === 0) oldFieldGrid.remove();
  }

  function populateBaseSelect() {
    const defaultBase = Core.getBase("boots_ornate_greaves") ? "boots_ornate_greaves" : (Core.BASES[0] && Core.BASES[0].id);
    renderBaseCategoryTabs();
    renderBaseOptions(defaultBase);
    els.itemLevel.value = "82";
    els.seedInput.value = makeSeed();
    els.dataVersion.textContent = Core.DATA_VERSION;
  }

  function renderBaseOptions(preferredValue) {
    els.baseSelect.innerHTML = "";
    const previousValue = preferredValue || els.baseSelect.value;
    const query = normalizeSearchText(els.baseSearch ? els.baseSearch.value : "");
    const categoryFilter = state.baseCategory || "all";
    const counts = baseCategoryCounts(query);
    const bases = Core.BASES.filter(function (base) {
      return baseMatchesCategory(base, categoryFilter) && baseMatchesSearch(base, query);
    });
    refreshBaseCategoryTabs(counts);

    if (bases.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = state.lang === "en" ? "No matching bases" : uiText("没有匹配底材");
      els.baseSelect.appendChild(option);
      els.baseSelect.disabled = true;
      if (els.baseStats) {
        const total = categoryFilter === "all" ? Core.BASES.length : (counts.totalByCategory[categoryFilter] || 0);
        els.baseStats.textContent = baseCategoryLabel(categoryFilter) + " · 0 / " + total + (state.lang === "en" ? " bases" : uiText(" 个底材"));
      }
      return;
    }

    els.baseSelect.disabled = false;
    const grouped = bases.reduce(function (map, base) {
      const label = displayClassLabel(base);
      if (!map[label]) map[label] = [];
      map[label].push(base);
      return map;
    }, {});

    Object.keys(grouped).forEach(function (label) {
      const group = document.createElement("optgroup");
      group.label = label;
      grouped[label].forEach(function (base) {
        const option = document.createElement("option");
        option.value = base.id;
        option.textContent = displayBaseName(base) + (state.lang === "en" || !base.english ? "" : " / " + base.english);
        group.appendChild(option);
      });
      els.baseSelect.appendChild(group);
    });

    if (bases.some(function (base) { return base.id === previousValue; })) {
      els.baseSelect.value = previousValue;
    } else {
      els.baseSelect.value = bases[0].id;
    }
    if (els.baseStats) {
      const total = categoryFilter === "all" ? Core.BASES.length : (counts.totalByCategory[categoryFilter] || 0);
      els.baseStats.textContent = [
        baseCategoryLabel(categoryFilter),
        bases.length + " / " + total + (state.lang === "en" ? " bases" : uiText(" 个底材")),
      ].join(" · ");
    }
  }

  function baseCategoryOptions() {
    const counts = baseCategoryCounts("");
    return [{ id: "all", label: baseCategoryLabel("all") }].concat(BASE_CATEGORY_ORDER.map(function (category) {
      return { id: category, label: baseCategoryLabel(category) };
    }).filter(function (option) {
      return (counts.totalByCategory[option.id] || 0) > 0;
    }));
  }

  function renderBaseCategoryTabs() {
    if (!els.baseCategoryTabs) return;
    els.baseCategoryTabs.innerHTML = "";
    baseCategoryOptions().forEach(function (option) {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "base-category-tab";
      tab.dataset.category = option.id;
      tab.setAttribute("aria-pressed", option.id === state.baseCategory ? "true" : "false");

      const label = document.createElement("span");
      label.className = "base-category-tab-label";
      label.textContent = option.label;

      const count = document.createElement("span");
      count.className = "base-category-tab-count";

      tab.append(label, count);
      tab.addEventListener("click", function () {
        const previousValue = els.baseSelect ? els.baseSelect.value : "";
        state.baseCategory = option.id;
        renderBaseOptions(previousValue);
        resetIfBaseSelectionChanged(previousValue);
      });
      els.baseCategoryTabs.appendChild(tab);
    });
    refreshBaseCategoryTabs(baseCategoryCounts(els.baseSearch ? els.baseSearch.value : ""));
  }

  function refreshBaseCategoryTabs(counts) {
    if (!els.baseCategoryTabs) return;
    const totalByCategory = counts && counts.totalByCategory ? counts.totalByCategory : baseCategoryCounts("").totalByCategory;
    const visibleByCategory = counts && counts.visibleByCategory ? counts.visibleByCategory : totalByCategory;
    els.baseCategoryTabs.querySelectorAll(".base-category-tab").forEach(function (tab) {
      const category = tab.dataset.category || "all";
      const isActive = category === (state.baseCategory || "all");
      const count = tab.querySelector(".base-category-tab-count");
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-pressed", isActive ? "true" : "false");
      if (count) count.textContent = (visibleByCategory[category] || 0) + "/" + (totalByCategory[category] || 0);
    });
  }

  function baseCategoryCounts(queryValue) {
    const query = normalizeSearchText(queryValue || "");
    return Core.BASES.reduce(function (counts, base) {
      const category = baseCategoryId(base);
      counts.totalByCategory[category] = (counts.totalByCategory[category] || 0) + 1;
      counts.totalByCategory.all += 1;
      if (baseMatchesSearch(base, query)) {
        counts.visibleByCategory[category] = (counts.visibleByCategory[category] || 0) + 1;
        counts.visibleByCategory.all += 1;
      }
      return counts;
    }, {
      totalByCategory: { all: 0 },
      visibleByCategory: { all: 0 },
    });
  }

  function baseMatchesCategory(base, category) {
    return !category || category === "all" || baseCategoryId(base) === category;
  }

  function baseCategoryId(base) {
    const classId = base && base.classId;
    const matched = BASE_CATEGORY_ORDER.find(function (category) {
      const classes = BASE_CATEGORY_CLASSES[category];
      return classes && classes.has(classId);
    });
    return matched || "other";
  }

  function baseCategoryLabel(category) {
    if (category === "weapon") return state.lang === "en" ? "Weapons" : uiText("武器");
    if (category === "armour") return state.lang === "en" ? "Armour" : uiText("防具");
    if (category === "offhand") return state.lang === "en" ? "Offhands" : uiText("副手");
    if (category === "jewellery") return state.lang === "en" ? "Jewellery" : uiText("饰品");
    if (category === "jewel") return state.lang === "en" ? "Jewels" : uiText("珠宝");
    if (category === "other") return state.lang === "en" ? "Other" : uiText("其他");
    return t("all");
  }

  function resetIfBaseSelectionChanged(previousValue) {
    if (!els.baseSelect || !els.baseSelect.value || els.baseSelect.value === previousValue) return;
    const base = Core.getBase(els.baseSelect.value);
    if (base && Number(els.itemLevel.value) < base.requiredLevel) {
      els.itemLevel.value = String(base.requiredLevel);
    }
    resetItem();
  }

  function normalizeSearchText(value) {
    return String(value || "")
      .normalize("NFKC")
      .replace(/[藍紅寶鑽時劑質預徵褻瀆緒華詞綴後閃電燄傷]/g, function (char) {
        return SEARCH_FOLD_MAP[char] || char;
      })
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function toTraditional(value) {
    let text = String(value || "");
    Object.keys(TRADITIONAL_PHRASE_MAP)
      .sort(function (a, b) { return b.length - a.length; })
      .forEach(function (phrase) {
        text = text.split(phrase).join(TRADITIONAL_PHRASE_MAP[phrase]);
      });
    const chars = Object.keys(TRADITIONAL_MAP).filter(function (key) { return key.length === 1; }).join("");
    const pattern = new RegExp("[" + chars.replace(/[\\\]\[\^-]/g, "\\$&") + "]", "g");
    return text.replace(pattern, function (char) {
      return TRADITIONAL_MAP[char] || char;
    });
  }

  function t(key) {
    const langTable = TEXT[state.lang] || TEXT["zh-Hans"];
    return langTable[key] || TEXT["zh-Hans"][key] || key;
  }

  function uiText(value) {
    if (state.lang === "zh-Hant") return toTraditional(value);
    return String(value || "");
  }

  function englishFromId(value) {
    return String(value || "")
      .replace(/^poe2db_/i, "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, function (char) { return char.toUpperCase(); })
      .trim();
  }

  function displayBaseName(base) {
    if (!base) return "";
    const localized = localizedEntry(I18N.bases, base.id);
    if (localized && localized.name) return localized.name;
    if (state.lang === "en") return base.english || englishFromId(base.id);
    return uiText(base.name);
  }

  function displayClassLabel(base) {
    if (!base) return "";
    if (state.lang === "en") return englishFromId(base.classId);
    return uiText(base.classLabel);
  }

  function displayRarity(rarityId) {
    if (state.lang === "en") {
      const labels = { normal: "Normal", magic: "Magic", rare: "Rare", unique: "Unique" };
      return labels[rarityId] || englishFromId(rarityId);
    }
    const rarity = Core.RARITIES[rarityId] || {};
    return uiText(rarity.label || rarityId);
  }

  function displayActionName(action, tier) {
    if (!action) return "";
    const localized = localizedEntry(I18N.actions, action.id);
    if (localized && localized.name) return localized.name;
    if (state.lang === "en") return englishFromId(action.id);
    return uiText(Core.currencyNameFor(action.id, tier || "normal"));
  }

  function displayActionRule(action, fallback) {
    if (!action) return uiText(fallback || "");
    if (fallback && fallback !== action.sourceRule) return displayValidationReason(fallback);
    if (state.lang === "en") return englishActionRule(action);
    return uiText(action.sourceRule);
  }

  function displayValidationReason(reason) {
    if (state.lang === "en") return "Unavailable for the current item state.";
    return uiText(reason || "");
  }

  function englishActionRule(action) {
    if (!action) return "";
    const category = categoryLabel(action.category);
    if (/^vaal_(armour_infuser|whetstone|arcanists_etcher|catalysing_infuser)$/.test(action.id)) {
      return "Improves quality above the current maximum by up to 10%; PoE2DB does not expose the corruption chance.";
    }
    if (action.category === "catalyst") return "Adds catalyst quality to supported item classes.";
    if (action.category === "liquid_emotion") return "Removes one modifier and adds the matching crafted modifier.";
    if (action.category === "desecration") return "Adds a hidden desecrated modifier, then reveal it with Abyssal Echoes.";
    if (action.category === "essence") return "Upgrades or replaces modifiers with an Essence-guaranteed modifier.";
    if (action.category === "alloy") return "Removes one modifier and adds an Alloy-guaranteed modifier.";
    if (action.category === "omen") return "Prepares an omen for the next matching craft action.";
    if (action.category === "soul_core") return "Applies or rerolls the matching Soul Core modifier.";
    if (action.category === "rune") return "Socket this rune or soul core into an open socket.";
    return category + " crafting action.";
  }

  function renderRangeText(mod) {
    const localized = localizedEntry(I18N.modifiers, mod.id);
    if (localized && localized.template) return formatLocalizedTemplate(localized.template, rangeValues(mod));
    if (state.lang === "en") {
      return [
        englishFromId(mod.group || mod.baseId || mod.id),
        mod.tier,
        "Lv " + mod.level,
        rollSummary(mod),
      ].filter(Boolean).join(" · ");
    }
    return uiText(Core.renderRange(mod));
  }

  function renderModText(mod, item) {
    const localized = localizedEntry(I18N.modifiers, mod.id);
    if (localized && localized.template) return [
      localized.name || "",
      formatLocalizedTemplate(localized.template, modValues(mod)),
    ].filter(Boolean).join(" · ");
    if (state.lang === "en") {
      return [
        mod.name ? englishFromId(mod.name) : "",
        englishFromId(mod.group || mod.baseId || mod.id),
        mod.tier,
        rollSummary(mod),
      ].filter(Boolean).join(" · ");
    }
    return uiText(Core.renderMod(mod, item));
  }

  function currentI18nKey() {
    if (state.lang === "en") return "en";
    if (state.lang === "zh-Hant") return "zhHant";
    return null;
  }

  function localizedEntry(collection, id) {
    const key = currentI18nKey();
    if (!key || !collection || !collection[id]) return null;
    return collection[id][key] || null;
  }

  function allLocalizedText(collection, id) {
    const entry = collection && collection[id];
    if (!entry) return "";
    return [
      entry.en && entry.en.name,
      entry.en && entry.en.template,
      entry.zhHant && entry.zhHant.name,
      entry.zhHant && entry.zhHant.template,
    ].filter(Boolean).join(" ");
  }

  function rangeValues(mod) {
    return (mod.rolls || []).map(function (roll) {
      return roll.min === roll.max ? String(roll.min) : roll.min + "-" + roll.max;
    });
  }

  function modValues(mod) {
    if (Array.isArray(mod.values) && mod.values.length > 0) return mod.values.map(String);
    return rangeValues(mod);
  }

  function formatLocalizedTemplate(template, values) {
    let index = 0;
    return String(template || "").replace(/#/g, function () {
      const value = values[index];
      index += 1;
      return value == null ? "#" : String(value);
    });
  }

  function rollSummary(mod) {
    if (!mod || !Array.isArray(mod.rolls) || mod.rolls.length === 0) return "";
    return mod.rolls.map(function (roll) {
      return roll.min === roll.max ? String(roll.min) : roll.min + "-" + roll.max;
    }).join(", ");
  }

  function localizeDocument() {
    document.documentElement.lang = state.lang === "en" ? "en" : (state.lang === "zh-Hant" ? "zh-Hant" : "zh-Hans");
    document.querySelectorAll("[data-i18n]").forEach(function (node) {
      node.textContent = t(node.dataset.i18n);
    });
    const title = document.querySelector(".topbar h1");
    const subtitle = document.querySelector(".topbar p");
    if (title) title.textContent = t("appTitle");
    if (subtitle) subtitle.innerHTML = escapeHtml(t("subtitle")) + '<span id="dataVersion">' + escapeHtml(Core.DATA_VERSION) + "</span>";
    if (els.dataVersion) els.dataVersion = document.getElementById("dataVersion");
    if (els.baseSearch) els.baseSearch.placeholder = t("baseSearchPlaceholder");
    if (els.customModSearch) els.customModSearch.placeholder = t("customSearchPlaceholder");
    if (els.currencySearch) els.currencySearch.placeholder = t("currencySearchPlaceholder");
    if (els.poolSearch) els.poolSearch.placeholder = t("poolSearchPlaceholder");
    if (els.languageSelect) els.languageSelect.value = state.lang;
    renderBaseCategoryTabs();
    renderCurrencyCategoryTabs();
  }

  function compactSearchText(value) {
    return normalizeSearchText(value).replace(/[\s·/|,，、:：;；()（）\[\]【】"'“”‘’\-_]+/g, "");
  }

  function searchTextMatches(searchText, query) {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return true;
    const normalizedText = normalizeSearchText(searchText);
    if (normalizedText.includes(normalizedQuery)) return true;
    const compactQuery = compactSearchText(normalizedQuery);
    const compactText = compactSearchText(normalizedText);
    if (compactQuery && compactText.includes(compactQuery)) return true;
    const queryParts = normalizedQuery.split(" ").filter(Boolean);
    if (queryParts.length > 1) {
      return queryParts.every(function (part) {
        return normalizedText.includes(part) || compactText.includes(compactSearchText(part));
      });
    }
    return false;
  }

  function baseMatchesSearch(base, query) {
    if (!query) return true;
    const queryIsClass = Core.BASES.some(function (entry) {
      return normalizeSearchText(entry.classId) === query || normalizeSearchText(entry.classLabel) === query;
    });
    if (queryIsClass) {
      return normalizeSearchText(base.classId) === query || normalizeSearchText(base.classLabel) === query;
    }
    const fields = [
      base.classLabel,
      base.classId,
      base.name,
      base.english,
      base.id,
      allLocalizedText(I18N.bases, base.id),
      baseSearchAliases(base),
    ].map(normalizeSearchText);
    if (!/^[a-z0-9_ -]+$/.test(query) || query.includes(" ")) {
      return fields.some(function (field) { return searchTextMatches(field, query); });
    }
    return fields.some(function (field) {
      return field.split(/[^a-z0-9]+/).some(function (token) {
        return token.startsWith(query);
      }) || searchTextMatches(field, query);
    });
  }

  function baseSearchAliases(base) {
    const identityText = [base.id, base.name, base.english, base.classId].join(" ");
    const aliases = [];
    const isJewel = base.classId === "jewel";
    const isSapphire = /sapphire|jewel_sapphire/i.test(identityText);
    const isRuby = /ruby|jewel_ruby/i.test(identityText);
    const isEmerald = /emerald|jewel_emerald/i.test(identityText);
    const isDiamond = /diamond|jewel_diamond/i.test(identityText);
    const isTimeLost = /time_lost|time-lost/i.test(identityText);
    if (isSapphire) aliases.push("蓝玉 藍玉 sapphire blue");
    if (isRuby) aliases.push("红玉 紅玉 ruby red");
    if (isEmerald) aliases.push("翡翠 emerald green");
    if (isDiamond) aliases.push("宝钻 寶鑽 diamond");
    if (isJewel && isSapphire) aliases.push("蓝玉珠宝 藍玉珠寶 sapphire jewel");
    if (isJewel && isRuby) aliases.push("红玉珠宝 紅玉珠寶 ruby jewel");
    if (isJewel && isEmerald) aliases.push("翡翠珠宝 翡翠珠寶 emerald jewel");
    if (isJewel && isDiamond) aliases.push("宝钻珠宝 寶鑽珠寶 diamond jewel");
    if (isTimeLost) aliases.push("失落时空 失落時空 time lost timelost");
    if (isJewel) aliases.push("珠宝 珠寶 jewel");
    if (isTimeLost && isSapphire) aliases.push("失落时空蓝玉珠宝 失落時空藍玉珠寶 time lost sapphire jewel");
    if (isTimeLost && isRuby) aliases.push("失落时空红玉珠宝 失落時空紅玉珠寶 time lost ruby jewel");
    if (isTimeLost && isEmerald) aliases.push("失落时空翡翠珠宝 失落時空翡翠珠寶 time lost emerald jewel");
    if (isTimeLost && isDiamond) aliases.push("失落时空宝钻珠宝 失落時空寶鑽珠寶 time lost diamond jewel");
    return aliases.join(" ");
  }

  function populateActionButtons() {
    els.currencyGrid.innerHTML = "";
    const grouped = Core.CURRENCIES.reduce(function (map, action) {
      const category = actionCategoryId(action);
      if (!map[category]) map[category] = [];
      map[category].push(action);
      return map;
    }, {});

    currencyCategoryOptions().forEach(function (option) {
      if (option.id === "all") return;
      const actions = grouped[option.id] || [];
      if (actions.length === 0) return;

      const section = document.createElement("section");
      section.className = "currency-category-section category-section-" + option.id;
      section.dataset.category = option.id;

      const heading = document.createElement("div");
      heading.className = "currency-category-heading";

      const title = document.createElement("span");
      title.className = "currency-category-title";
      title.textContent = option.label;

      const count = document.createElement("span");
      count.className = "currency-category-count";
      count.textContent = String(actions.length);

      const grid = document.createElement("div");
      grid.className = "currency-category-grid";

      actions.forEach(function (action) {
        grid.appendChild(createCurrencyButton(action));
      });

      heading.append(title, count);
      section.append(heading, grid);
      els.currencyGrid.appendChild(section);
    });

    const empty = document.createElement("div");
    empty.className = "currency-empty is-hidden";
    els.currencyGrid.appendChild(empty);
    renderCurrencyCategoryTabs();
  }

  function createCurrencyButton(action) {
    const category = actionCategoryId(action);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "currency-button category-" + category;
    button.dataset.action = action.id;
    button.dataset.category = category;
    button.dataset.search = [
      action.id,
      action.label,
      toTraditional(action.label),
      englishFromId(action.id),
      action.sourceRule,
      toTraditional(action.sourceRule),
      allLocalizedText(I18N.actions, action.id),
      categoryLabel(category),
      actionSearchAliases(action),
    ].join(" ");

    const nameLine = document.createElement("span");
    nameLine.className = "currency-name-line";

    const kind = document.createElement("span");
    kind.className = "currency-kind";
    kind.textContent = categoryLabel(category);

    const name = document.createElement("span");
    name.className = "currency-name";
    name.textContent = displayActionName(action, "normal");

    const rule = document.createElement("span");
    rule.className = "currency-rule";
    rule.textContent = displayActionRule(action);

    nameLine.append(kind, name);
    button.append(nameLine, rule);
    button.addEventListener("click", function () {
      useAction(action);
    });
    return button;
  }

  function actionCategoryId(actionOrCategory) {
    const category = typeof actionOrCategory === "string"
      ? actionOrCategory
      : (actionOrCategory && actionOrCategory.category);
    return category || "currency";
  }

  function currencyCategoryOptions() {
    const totals = currencyCategoryTotals();
    return [{ id: "all", label: t("all") }].concat(ACTION_CATEGORY_ORDER.map(function (category) {
      return { id: category, label: categoryLabel(category) };
    }).filter(function (option) {
      return (totals[option.id] || 0) > 0;
    }));
  }

  function currencyCategoryTotals() {
    return Core.CURRENCIES.reduce(function (map, action) {
      const category = actionCategoryId(action);
      map[category] = (map[category] || 0) + 1;
      map.all = (map.all || 0) + 1;
      return map;
    }, { all: 0 });
  }

  function renderCurrencyCategoryTabs() {
    if (!els.currencyCategoryTabs) return;
    const current = els.currencyCategory ? (els.currencyCategory.value || "all") : "all";
    els.currencyCategoryTabs.innerHTML = "";
    currencyCategoryOptions().forEach(function (option) {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "currency-category-tab";
      tab.dataset.category = option.id;
      tab.setAttribute("aria-pressed", option.id === current ? "true" : "false");

      const label = document.createElement("span");
      label.className = "currency-category-tab-label";
      label.textContent = option.label;

      const count = document.createElement("span");
      count.className = "currency-category-tab-count";
      count.textContent = String(currencyCategoryTotals()[option.id] || 0);

      tab.append(label, count);
      tab.addEventListener("click", function () {
        if (els.currencyCategory) els.currencyCategory.value = option.id;
        renderActionButtons();
      });
      els.currencyCategoryTabs.appendChild(tab);
    });
    refreshCurrencyCategoryTabs();
  }

  function refreshCurrencyCategoryTabs(counts) {
    if (!els.currencyCategoryTabs) return;
    const totals = counts && counts.totalByCategory ? counts.totalByCategory : currencyCategoryTotals();
    const visibleByCategory = counts && counts.visibleByCategory ? counts.visibleByCategory : totals;
    const visibleAll = counts && counts.visibleByCategory
      ? Object.keys(visibleByCategory).reduce(function (sum, category) { return sum + (visibleByCategory[category] || 0); }, 0)
      : (totals.all || 0);
    const current = els.currencyCategory ? (els.currencyCategory.value || "all") : "all";

    els.currencyCategoryTabs.querySelectorAll(".currency-category-tab").forEach(function (tab) {
      const category = tab.dataset.category || "all";
      const isActive = category === current;
      const count = tab.querySelector(".currency-category-tab-count");
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-pressed", isActive ? "true" : "false");
      if (count) {
        const visible = category === "all" ? visibleAll : (visibleByCategory[category] || 0);
        const total = totals[category] || 0;
        count.textContent = visible + "/" + total;
      }
    });
  }

  function updateCurrencySections(counts) {
    const current = els.currencyCategory ? (els.currencyCategory.value || "all") : "all";
    els.currencyGrid.querySelectorAll(".currency-category-section").forEach(function (section) {
      const category = section.dataset.category || "currency";
      const visible = counts.visibleByCategory[category] || 0;
      const matched = counts.matchedByCategory[category] || 0;
      const total = counts.totalByCategory[category] || 0;
      const shouldShow = (current === "all" || current === category) && visible > 0;
      const count = section.querySelector(".currency-category-count");
      section.classList.toggle("is-hidden", !shouldShow);
      section.classList.toggle("is-single-category", current !== "all");
      if (count) count.textContent = visible + "/" + (matched || total);
    });
  }

  function populatePoolActionSelect() {
    const entries = [
      ["", state.lang === "en" ? "Show next action" : uiText("按下一步显示")],
      ["transmutation", state.lang === "en" ? "Transmutation add" : uiText("蜕变新增")],
      ["augmentation", state.lang === "en" ? "Augmentation add" : uiText("增幅新增")],
      ["alchemy", state.lang === "en" ? "Alchemy add" : uiText("点金新增")],
      ["regal", state.lang === "en" ? "Regal add" : uiText("富豪新增")],
      ["exalted", state.lang === "en" ? "Exalted add" : uiText("崇高新增")],
      ["chaos", state.lang === "en" ? "Chaos add" : uiText("混沌新增")],
      ["preserved_lockbone", state.lang === "en" ? "Lockbone desecration" : uiText("锁骨亵渎")],
      ["preserved_rib", state.lang === "en" ? "Rib desecration" : uiText("肋骨亵渎")],
      ["preserved_jawbone", state.lang === "en" ? "Jawbone desecration" : uiText("颚骨亵渎")],
      ["preserved_cranium", state.lang === "en" ? "Cranium desecration" : uiText("头骨亵渎")],
      ["preserved_vertebrae", state.lang === "en" ? "Vertebrae desecration" : uiText("椎骨亵渎")],
    ];

    Core.CURRENCIES.forEach(function (action) {
      if (!["essence", "alloy", "liquid_emotion", "desecration", "soul_core"].includes(action.category)) return;
      if (entries.some(function (entry) { return entry[0] === action.id; })) return;
      entries.push([action.id, categoryLabel(action.category) + " / " + displayActionName(action, "normal")]);
    });

    els.poolAction.innerHTML = "";
    entries.forEach(function (entry) {
      const option = document.createElement("option");
      option.value = entry[0];
      option.textContent = entry[1];
      els.poolAction.appendChild(option);
    });
  }

  function attachEvents() {
    els.resetButton.addEventListener("click", resetItem);
    els.undoButton.addEventListener("click", undo);
    els.copyButton.addEventListener("click", copyItemJson);
    els.tierSelect.addEventListener("change", render);
    els.customRarity.addEventListener("change", renderCustomPanel);
    els.customModSearch.addEventListener("input", renderCustomPanel);
    els.applyCustomButton.addEventListener("click", applyCustomStart);
    els.clearCustomButton.addEventListener("click", clearCustomStart);
    customModSelects().forEach(function (select) {
      select.addEventListener("change", renderCustomPanel);
    });
    els.baseSearch.addEventListener("input", function () {
      const previousValue = els.baseSelect.value;
      renderBaseOptions();
      resetIfBaseSelectionChanged(previousValue);
    });
    els.currencySearch.addEventListener("input", renderActionButtons);
    els.currencyCategory.addEventListener("change", renderActionButtons);
    els.usableOnly.addEventListener("change", renderActionButtons);
    if (els.clearOmenButton) els.clearOmenButton.addEventListener("click", clearCurrentOmen);
    if (els.refreshMarketButton) els.refreshMarketButton.addEventListener("click", function () {
      loadMarketRates(true);
    });
    if (els.languageSelect) {
      els.languageSelect.addEventListener("change", function () {
        state.lang = els.languageSelect.value || "zh-Hans";
        try {
          localStorage.setItem("poe2CraftLang", state.lang);
        } catch (error) {
          // Ignore storage failures; the switch still works for this session.
        }
        localizeDocument();
        renderBaseOptions(els.baseSelect.value);
        populateActionButtons();
        populatePoolActionSelect();
        renderMarketRates();
        render();
      });
    }
    els.lockOmen.addEventListener("change", handleOmenLockChange);
    els.poolAction.addEventListener("change", renderPool);
    els.poolSearch.addEventListener("input", renderPool);
    els.itemLevel.addEventListener("change", resetItem);
    els.baseSelect.addEventListener("change", function () {
      const base = Core.getBase(els.baseSelect.value);
      if (base && Number(els.itemLevel.value) < base.requiredLevel) {
        els.itemLevel.value = String(base.requiredLevel);
      }
      resetItem();
    });
  }

  function customModSelects() {
    return [
      els.customPrefix1,
      els.customPrefix2,
      els.customPrefix3,
      els.customPrefix4,
      els.customSuffix1,
      els.customSuffix2,
      els.customSuffix3,
      els.customSuffix4,
    ].filter(Boolean);
  }

  function resetItem() {
    const base = Core.getBase(els.baseSelect.value);
    if (!base) {
      state.lastMessage = "没有可用底材";
      render();
      return;
    }
    const itemLevel = Math.max(Number(els.itemLevel.value) || 1, base.requiredLevel);
    if (!els.seedLock.checked) {
      els.seedInput.value = makeSeed();
    }
    els.itemLevel.value = String(itemLevel);
    state.item = Core.makeItem(base.id, itemLevel, els.seedInput.value);
    state.undoStack = [];
    state.lastMessage = "已生成新的普通底材。";
    render();
  }

  function applyCustomStart() {
    const base = Core.getBase(els.baseSelect.value);
    if (!base) {
      state.lastMessage = "没有可用底材";
      render();
      return;
    }
    const itemLevel = Math.max(Number(els.itemLevel.value) || 1, base.requiredLevel);
    if (!els.seedLock.checked) {
      els.seedInput.value = makeSeed();
    }
    els.itemLevel.value = String(itemLevel);

    const result = Core.makeCustomItem(base.id, itemLevel, els.seedInput.value, {
      rarity: els.customRarity.value,
      explicitModIds: selectedCustomModIds(),
    });

    if (!result.ok) {
      state.lastMessage = result.reason;
      render();
      return;
    }

    state.item = result.item;
    state.undoStack = [];
    state.lastMessage = state.lang === "en"
      ? "Custom start generated: " + displayRarity(state.item.rarity) + ", explicit modifiers " + Core.countExplicit(state.item)
      : uiText("已生成自定义开局：") + displayRarity(state.item.rarity) + uiText("，显式词缀 ") + Core.countExplicit(state.item);
    render();
  }

  function clearCustomStart() {
    els.customRarity.value = "normal";
    customModSelects().forEach(function (select) {
      select.value = "";
    });
    renderCustomPanel();
  }

  function selectedCustomModIds() {
    return customModSelects().map(function (select) {
      return select.disabled ? "" : select.value;
    }).filter(Boolean);
  }

  function undo() {
    if (state.undoStack.length === 0) return;
    const currentRngState = state.item && state.item.rngState;
    const restored = state.undoStack.pop();
    if (typeof currentRngState === "number") {
      restored.rngState = currentRngState;
    }
    state.item = restored;
    state.lastMessage = "已撤销上一手。";
    render();
  }

  function useAction(action) {
    const tier = action.supportsTiers ? els.tierSelect.value : "normal";
    const hinekoraMessage = handleHinekoraPreview(action, tier);
    if (hinekoraMessage) {
      state.lastMessage = hinekoraMessage;
      render();
      return;
    }

    const result = Core.applyCurrency(state.item, action.id, tier);

    if (!result.ok) {
      state.lastMessage = result.reason;
      render();
      return;
    }

    state.undoStack.push(clone(state.item));
    state.item = result.item;
    const messages = [summarizeStep(result.step)];

    if (action.category === "omen" && els.lockOmen.checked) {
      state.lockedOmenId = action.id;
      messages.push((state.lang === "en" ? "Locked " : uiText("已锁定 ")) + displayActionName(action, "normal"));
    } else if (action.category !== "omen") {
      const refreshMessage = reapplyLockedOmen(result.step);
      if (refreshMessage) messages.push(refreshMessage);
    }

    state.lastMessage = messages.join("；");
    render();
  }

  function handleHinekoraPreview(action, tier) {
    if (!state.item || !state.item.hinekoraLock) return "";
    if (action.id === "hinekoras_lock" || action.category === "omen") return "";

    const preview = state.item.hinekoraPreview;
    if (preview && preview.actionId === action.id && preview.tier === tier) {
      state.undoStack.push(clone(state.item));
      state.item = clone(preview.item);
      state.item.hinekoraLock = false;
      state.item.hinekoraPreview = null;
      return "已执行发辫预示结果：" + summarizeStep(preview.step);
    }

    const result = Core.previewCurrency(state.item, action.id, tier);
    if (!result.ok) return result.reason;
    state.item.hinekoraPreview = {
      actionId: action.id,
      tier,
      item: result.item,
      step: result.step,
    };
    return "发辫预示：" + summarizeStep(result.step) + "。再次点击同一通货执行。";
  }

  function omenComponentIds(omen) {
    if (!omen) return [];
    if (Array.isArray(omen.components) && omen.components.length > 0) {
      return omen.components.map(function (component) { return component.id; }).filter(Boolean);
    }
    return omen.id ? [omen.id] : [];
  }

  function handleOmenLockChange() {
    if (!els.lockOmen.checked) {
      state.lockedOmenId = null;
      state.lastMessage = "已关闭预兆锁定。";
      render();
      return;
    }

    if (state.item && state.item.pendingOmen) {
      state.lockedOmenId = omenComponentIds(state.item.pendingOmen)[0] || null;
      state.lastMessage = state.lang === "en"
        ? "Locked " + uiText(state.item.pendingOmen.label) + "; it will refresh after triggering."
        : uiText("已锁定 ") + uiText(state.item.pendingOmen.label) + uiText("，触发后会自动续上。");
    } else {
      state.lastMessage = state.lang === "en"
        ? "Lock is on: click an omen and it will refresh after triggering."
        : uiText("锁定已开启：点击一个预兆后，会在触发后自动续上。");
    }
    render();
  }

  function clearCurrentOmen() {
    if (!state.item) return;
    const hadOmen = Boolean(state.item.pendingOmen || state.lockedOmenId || (els.lockOmen && els.lockOmen.checked));
    state.item.pendingOmen = null;
    state.lockedOmenId = null;
    if (els.lockOmen) els.lockOmen.checked = false;
    state.lastMessage = hadOmen
      ? (state.lang === "en" ? "Cleared current omen." : "已清除当前预兆。")
      : (state.lang === "en" ? "No omen to clear." : "当前没有预兆。");
    render();
  }

  function reapplyLockedOmen(step) {
    if (!els.lockOmen.checked || !step || !step.omenConsumed) return "";

    const consumedIds = omenComponentIds(step.omenConsumed);
    const consumedId = consumedIds[0] || step.omenConsumed.id;
    if (!state.lockedOmenId) state.lockedOmenId = consumedId;
    if (!consumedIds.includes(state.lockedOmenId)) return "";

    const lockedAction = Core.getAction(state.lockedOmenId);
    if (!lockedAction || lockedAction.category !== "omen") {
      state.lockedOmenId = null;
      return "预兆已触发，但锁定目标不存在，已取消锁定。";
    }

    const validation = Core.validateCurrency(state.item, lockedAction.id, "normal");
    if (!validation.ok) {
      return state.lang === "en"
        ? "Omen triggered, but could not refresh: " + uiText(validation.reason)
        : uiText("预兆已触发，但无法自动续上：") + uiText(validation.reason);
    }

    const omenResult = Core.applyCurrency(state.item, lockedAction.id, "normal");
    if (!omenResult.ok) {
      return state.lang === "en"
        ? "Omen triggered, but could not refresh: " + uiText(omenResult.reason)
        : uiText("预兆已触发，但无法自动续上：") + uiText(omenResult.reason);
    }

    const targetValidation = validateLockedOmenTarget(omenResult.item, lockedAction);
    if (targetValidation && !targetValidation.ok) {
      return state.lang === "en"
        ? "Omen triggered; the next " + targetLabelForOmen(lockedAction) + " is unavailable, so it was not refreshed."
        : uiText("预兆已触发；下一次") + targetLabelForOmen(lockedAction) + uiText("暂时不可用，未自动续上。");
    }

    state.item = omenResult.item;
    return state.lang === "en"
      ? "Auto-refreshed " + displayActionName(lockedAction, "normal")
      : uiText("已自动续上 ") + displayActionName(lockedAction, "normal");
  }

  function validateLockedOmenTarget(item, omenAction) {
    const targetId = omenAction && omenAction.omen && omenAction.omen.target;
    const targetAction = targetId ? Core.getAction(targetId) : null;
    if (!targetAction) return null;
    const targetTier = targetAction.supportsTiers ? els.tierSelect.value : "normal";
    return Core.validateCurrency(item, targetAction.id, targetTier);
  }

  function targetLabelForOmen(omenAction) {
    const targetId = omenAction && omenAction.omen && omenAction.omen.target;
    const targetAction = targetId ? Core.getAction(targetId) : null;
    return targetAction ? displayActionName(targetAction, "normal") : (state.lang === "en" ? "target material" : uiText("目标材料"));
  }

  function copyItemJson() {
    const text = JSON.stringify(state.item, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        state.lastMessage = "已复制当前物品 JSON。";
        render();
      }).catch(function () {
        fallbackCopy(text);
      });
      return;
    }
    fallbackCopy(text);
  }

  function fallbackCopy(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    state.lastMessage = "已复制当前物品 JSON。";
    render();
  }

  function renderCustomPanel() {
    if (!els.customRarity) return;
    const draft = customDraftItem();
    if (!draft) return;

    const customQuery = normalizeSearchText(els.customModSearch ? els.customModSearch.value : "");
    const prefixFullPool = customPoolFor(draft, "prefix");
    const suffixFullPool = customPoolFor(draft, "suffix");
    const prefixPool = filterCustomPool(prefixFullPool, customQuery);
    const suffixPool = filterCustomPool(suffixFullPool, customQuery);
    const prefixCap = Core.capFor(draft, "prefix");
    const suffixCap = Core.capFor(draft, "suffix");

    updateCustomSelect(els.customPrefix1, prefixPool, prefixFullPool, prefixCap >= 1);
    updateCustomSelect(els.customPrefix2, prefixPool, prefixFullPool, prefixCap >= 2);
    updateCustomSelect(els.customPrefix3, prefixPool, prefixFullPool, prefixCap >= 3);
    updateCustomSelect(els.customPrefix4, prefixPool, prefixFullPool, prefixCap >= 4);
    updateCustomSelect(els.customSuffix1, suffixPool, suffixFullPool, suffixCap >= 1);
    updateCustomSelect(els.customSuffix2, suffixPool, suffixFullPool, suffixCap >= 2);
    updateCustomSelect(els.customSuffix3, suffixPool, suffixFullPool, suffixCap >= 3);
    updateCustomSelect(els.customSuffix4, suffixPool, suffixFullPool, suffixCap >= 4);

    els.customStats.textContent = [
      t("prefix") + " " + prefixPool.length + "/" + prefixFullPool.length,
      t("suffix") + " " + suffixPool.length + "/" + suffixFullPool.length,
      (state.lang === "en" ? "Slots " : uiText("槽位 ")) + prefixCap + "/" + suffixCap,
    ].join(" · ");
  }

  function customDraftItem() {
    const base = Core.getBase(els.baseSelect.value);
    if (!base) return null;
    const itemLevel = Math.max(Number(els.itemLevel.value) || 1, base.requiredLevel);
    const draft = Core.makeItem(base.id, itemLevel, els.seedInput.value || "custom-preview");
    draft.rarity = els.customRarity.value;
    return draft;
  }

  function customPoolFor(draft, type) {
    if (Core.capFor(draft, type) === 0) return [];
    return Core.eligibleMods(draft, { type }).slice().sort(compareCustomMods);
  }

  function filterCustomPool(pool, query) {
    if (!query) return pool;
    return pool.filter(function (mod) {
      return searchTextMatches(customModSearchText(mod), query);
    });
  }

  function customModSearchText(mod) {
    return [
      renderRangeText(mod),
      mod.tier,
      String(mod.level),
      mod.name,
      mod.group,
      allLocalizedText(I18N.modifiers, mod.id),
      (mod.tags || []).join(" "),
    ].join(" ");
  }

  function updateCustomSelect(select, pool, fullPool, enabled) {
    if (!select) return;
    const currentValue = select.value;
    const fullPoolWeight = totalModWeight(fullPool);
    select.innerHTML = "";
    select.disabled = !enabled;

    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = enabled ? (state.lang === "en" ? "None" : uiText("不选择")) : (state.lang === "en" ? "Unavailable" : uiText("不可用"));
    select.appendChild(empty);

    if (!enabled) {
      select.value = "";
      return;
    }

    const selectedGroups = selectedCustomGroups(select);
    const optionPool = pool.slice();
    const selectedMod = currentValue
      ? fullPool.find(function (mod) { return mod.id === currentValue; })
      : null;
    if (selectedMod && !optionPool.some(function (mod) { return mod.id === selectedMod.id; })) {
      optionPool.unshift(selectedMod);
    }

    optionPool.forEach(function (mod) {
      const option = document.createElement("option");
      option.value = mod.id;
      option.textContent = customModLabel(mod, fullPoolWeight);
      if (selectedGroups.has(mod.group) && mod.id !== currentValue) option.disabled = true;
      select.appendChild(option);
    });

    const selectedOption = Array.from(select.options).find(function (option) {
      return option.value === currentValue && !option.disabled;
    });
    select.value = selectedOption ? currentValue : "";
  }

  function selectedCustomGroups(exceptSelect) {
    const groups = new Set();
    customModSelects().forEach(function (select) {
      if (select === exceptSelect || select.disabled || !select.value) return;
      const mod = Core.MODIFIERS.find(function (entry) { return entry.id === select.value; });
      if (mod) groups.add(mod.group);
    });
    return groups;
  }

  function compareCustomMods(a, b) {
    const tierA = tierNumber(a.tier);
    const tierB = tierNumber(b.tier);
    if (tierA !== tierB) return tierA - tierB;
    if (b.level !== a.level) return b.level - a.level;
    if (a.name !== b.name) return a.name.localeCompare(b.name, "zh-Hans");
    return renderRangeText(a).localeCompare(renderRangeText(b), state.lang === "en" ? "en" : "zh-Hans");
  }

  function tierNumber(tier) {
    const match = String(tier || "").match(/\d+/);
    return match ? Number(match[0]) : 999;
  }

  function customModLabel(mod, typeTotalWeight) {
    const chance = modChanceTextFromTotal(mod, typeTotalWeight);
    return [
      renderRangeText(mod) + (state.lang === "en" ? " (chance " + chance + ")" : uiText("（出现 ") + chance + uiText("）")),
      mod.tier,
      (state.lang === "en" ? "Level " : uiText("等级 ")) + mod.level,
      modWeightLabel(mod),
      (state.lang === "en" ? "Group " + englishFromId(mod.group) : uiText("组 ") + uiText(mod.group)),
    ].join(" · ");
  }

  function modWeightValue(mod) {
    const weight = mod && mod.effectiveWeight != null ? mod.effectiveWeight : mod && mod.weight;
    return Number(weight) || 0;
  }

  function formatWeight(value) {
    const numeric = Number(value) || 0;
    return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(3).replace(/\.?0+$/, "");
  }

  function modWeightLabel(mod) {
    const label = state.lang === "en" ? "Weight " : uiText("权重 ");
    if (mod && mod.effectiveWeight != null && Number(mod.effectiveWeight) !== Number(mod.weight)) {
      return label + formatWeight(mod.weight) + " -> " + formatWeight(mod.effectiveWeight);
    }
    return label + formatWeight(mod && mod.weight);
  }

  function totalModWeight(mods) {
    return mods.reduce(function (sum, mod) {
      return sum + modWeightValue(mod);
    }, 0);
  }

  function modWeightTotalsByType(mods) {
    return mods.reduce(function (totals, mod) {
      const key = mod.type === "prefix" ? "prefix" : "suffix";
      totals[key] += modWeightValue(mod);
      return totals;
    }, { prefix: 0, suffix: 0 });
  }

  function modChanceText(mod, typeTotals) {
    const typeTotal = typeTotals[mod.type === "prefix" ? "prefix" : "suffix"];
    return modChanceTextFromTotal(mod, typeTotal);
  }

  function modChanceTextFromTotal(mod, typeTotal) {
    if (!typeTotal) return "0%";
    const percent = (modWeightValue(mod) / typeTotal) * 100;
    if (percent > 0 && percent < 0.001) return "<0.001%";
    return percent.toFixed(3).replace(/\.?0+$/, "") + "%";
  }

  function render() {
    renderItem();
    renderCustomPanel();
    renderActionButtons();
    renderCostSummary();
    renderHistory();
    renderPool();
    renderLockedOmenStatus();
    renderToast();
    els.undoButton.disabled = state.undoStack.length === 0;
  }

  function currentRemovalPreview(item) {
    if (!item || !Core.removalPreview) return { keys: [] };
    const actionId = previewActionForItem(item);
    if (!actionId) return { keys: [] };
    return Core.removalPreview(item, actionId, els.tierSelect.value);
  }

  function previewActionForItem(item) {
    if (item.pendingOmen && ["chaos", "annulment"].includes(item.pendingOmen.target)) {
      return item.pendingOmen.target;
    }
    if (els.poolAction && els.poolAction.value) return els.poolAction.value;
    return defaultPoolAction(item);
  }

  function renderItem() {
    const item = state.item;
    const base = Core.getBase(item.baseId);
    const rarity = Core.RARITIES[item.rarity];
    const prefixCap = Core.capFor(item, "prefix");
    const suffixCap = Core.capFor(item, "suffix");
    const rarityClass = "rarity-" + item.rarity;
    const removalPreview = currentRemovalPreview(item);
    const removalPreviewKeys = new Set(removalPreview.keys || []);
    const prefixMods = item.prefixes.concat((item.desecratedMods || []).filter(function (mod) { return mod.type === "prefix"; }));
    const suffixMods = item.suffixes.concat((item.desecratedMods || []).filter(function (mod) { return mod.type === "suffix"; }));

    els.itemPanel.innerHTML = "";
    els.itemPanel.classList.toggle("has-removal-preview", removalPreviewKeys.size > 0);

    const header = document.createElement("div");
    header.className = "item-header";
    header.innerHTML = [
      "<div>",
      '<div class="item-name ' + rarityClass + '">' + escapeHtml(displayRarity(item.rarity) + " " + displayBaseName(base)) + "</div>",
      '<div class="item-subtitle">' + escapeHtml(state.lang === "en" ? base.id : base.english) + "</div>",
      "</div>",
      '<div class="item-badges">',
      '<span class="badge">' + escapeHtml(state.lang === "en" ? "Item level " : uiText("物等 ")) + item.itemLevel + "</span>",
      '<span class="badge">' + escapeHtml(displayClassLabel(base)) + "</span>",
      item.quality ? '<span class="badge">' + escapeHtml(state.lang === "en" ? "Quality " : uiText("品质 ")) + item.quality + "%</span>" : "",
      item.catalyst && item.catalyst.quality ? '<span class="badge">' + escapeHtml(t("catalyst") + " " + uiText(item.catalyst.name) + " " + item.catalyst.quality + "%") + "</span>" : "",
      item.sockets.length ? '<span class="badge">' + escapeHtml(state.lang === "en" ? "Sockets " : uiText("插槽 ")) + item.sockets.length + "</span>" : "",
      item.pendingOmen ? '<span class="badge badge-omen">' + escapeHtml(t("omen") + ": " + uiText(item.pendingOmen.label)) + "</span>" : "",
      item.desecratedMods.length ? '<span class="badge badge-desecrated">' + escapeHtml(t("desecration") + " " + item.desecratedMods.length) + "</span>" : "",
      item.vaalInfuserCorruptionRisk && !item.corrupted ? '<span class="badge badge-omen">' + escapeHtml(state.lang === "en" ? "Vaal infuser corruption risk" : uiText("瓦尔注能腐化风险")) + "</span>" : "",
      item.corrupted ? '<span class="badge badge-desecrated">' + escapeHtml(state.lang === "en" ? "Corrupted" : uiText("腐化")) + "</span>" : "",
      item.mirrored ? '<span class="badge">' + escapeHtml(state.lang === "en" ? "Mirrored" : uiText("镜像")) + "</span>" : "",
      item.destroyed ? '<span class="badge badge-desecrated">' + escapeHtml(state.lang === "en" ? "Destroyed" : uiText("已摧毁")) + "</span>" : "",
      "</div>",
    ].join("");
    els.itemPanel.appendChild(header);

    if (item.hinekoraLock) {
      const lines = [state.lang === "en" ? "Hinekora's Lock: waiting to preview the next currency result" : uiText("辛格拉的发辫：等待预示下一次通货结果")];
      if (item.hinekoraPreview && item.hinekoraPreview.step) {
        lines.push((state.lang === "en" ? "Preview: " : uiText("预示：")) + summarizeStep(item.hinekoraPreview.step));
      }
      els.itemPanel.appendChild(sectionBlock(state.lang === "en" ? "Preview" : uiText("预示"), lines.map(escapeHtml)));
    }

    const baseStatLines = Core.baseStatLines ? Core.baseStatLines(item) : base.defenses.map(function (line) {
      return { text: line, original: line, qualityAdjusted: false };
    });
    if (baseStatLines.length > 0) {
      els.itemPanel.appendChild(sectionBlock(state.lang === "en" ? "Base stats" : uiText("基础数值"), baseStatLines.map(function (line) {
        const suffix = line.qualityAdjusted ? (state.lang === "en" ? " (quality " + item.quality + "%)" : uiText(" （品质 ") + item.quality + "%）") : "";
        return escapeHtml(uiText(line.text) + suffix);
      })));
    }

    if (false && base.defenses.length > 0) {
      els.itemPanel.appendChild(sectionBlock("基础防御", base.defenses.map(escapeHtml)));
    }

    if (item.implicits.length > 0) {
      els.itemPanel.appendChild(sectionBlock(state.lang === "en" ? "Implicit modifiers" : uiText("固定词缀"), item.implicits.map(function (implicit) {
        return escapeHtml(state.lang === "en" ? uiText(Core.renderImplicit(implicit)) : uiText(Core.renderImplicit(implicit)));
      })));
    }

    if (item.pendingDesecrationChoice) {
      els.itemPanel.appendChild(renderDesecrationChoicePanel(item.pendingDesecrationChoice));
    }

    const slotSummary = document.createElement("div");
    slotSummary.className = "slot-summary";
    slotSummary.innerHTML = [
      '<span>' + escapeHtml(t("prefix")) + " " + Core.countByType(item, "prefix") + "/" + prefixCap + "</span>",
      '<span>' + escapeHtml(t("suffix")) + " " + Core.countByType(item, "suffix") + "/" + suffixCap + "</span>",
      '<span>' + escapeHtml(state.lang === "en" ? "Explicit modifiers " : uiText("显式词缀 ")) + Core.countExplicit(item) + "</span>",
    ].join("");
    els.itemPanel.appendChild(slotSummary);

    const explicitGrid = document.createElement("div");
    explicitGrid.className = "explicit-grid";
    explicitGrid.appendChild(renderSlotColumn(t("prefix"), prefixMods, prefixCap, "prefix", removalPreviewKeys));
    explicitGrid.appendChild(renderSlotColumn(t("suffix"), suffixMods, suffixCap, "suffix", removalPreviewKeys));
    els.itemPanel.appendChild(explicitGrid);

    if (item.sockets.length > 0) {
      els.itemPanel.appendChild(sectionBlock(state.lang === "en" ? "Rune sockets" : uiText("符文插槽"), item.sockets.map(function (socket, index) {
        const socketLabel = (state.lang === "en" ? "Socket " : uiText("插槽 ")) + (index + 1) + (socket.corrupted ? (state.lang === "en" ? " (corrupted extra)" : uiText("（腐化额外）")) : "");
        if (!socket.rune) return escapeHtml(socketLabel + ": " + (state.lang === "en" ? "Empty" : uiText("空")));
        return escapeHtml(socketLabel + ": " + uiText(socket.rune.label) + " - " + uiText(socket.rune.effectText));
      })));
    }

    if (false && item.sockets.length > 0) {
      els.itemPanel.appendChild(sectionBlock("符文插槽", item.sockets.map(function (socket, index) {
        if (!socket.rune) return escapeHtml("插槽 " + (index + 1) + ": 空");
        return escapeHtml("插槽 " + (index + 1) + ": " + socket.rune.label + " - " + socket.rune.effectText);
      })));
    }
  }

  function sectionBlock(title, lines) {
    const section = document.createElement("section");
    section.className = "item-section";
    const heading = document.createElement("h3");
    heading.textContent = title;
    const list = document.createElement("div");
    list.className = "item-lines";
    lines.forEach(function (line) {
      const div = document.createElement("div");
      div.innerHTML = line;
      list.appendChild(div);
    });
    section.append(heading, list);
    return section;
  }

  function renderDesecrationChoicePanel(pending) {
    const section = document.createElement("section");
    section.className = "desecration-choice-panel";

    const heading = document.createElement("h3");
    heading.textContent = state.lang === "en" ? "Abyssal Echoes: choose 1 desecrated modifier" : uiText("深渊回响：选择 1 条亵渎词缀");
    section.appendChild(heading);

    const list = document.createElement("div");
    list.className = "desecration-choice-list";
    (pending.choices || []).forEach(function (choice) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "desecration-choice-button";
      button.dataset.choiceId = choice.choiceId || choice.id;
      button.innerHTML = [
        '<span class="choice-text">' + escapeHtml(renderModText(choice)) + "</span>",
        '<span class="choice-meta">' + escapeHtml(modMetaText(choice)) + "</span>",
      ].join("");
      button.addEventListener("click", function () {
        chooseDesecration(choice.choiceId || choice.id);
      });
      list.appendChild(button);
    });
    section.appendChild(list);
    return section;
  }

  function chooseDesecration(choiceId) {
    const result = Core.chooseDesecrationChoice(state.item, choiceId);
    if (!result.ok) {
      state.lastMessage = result.reason;
      render();
      return;
    }

    state.undoStack.push(clone(state.item));
    state.item = result.item;
    const messages = [summarizeStep(result.step)];
    const refreshMessage = reapplyLockedOmen(result.step);
    if (refreshMessage) messages.push(refreshMessage);
    state.lastMessage = messages.join("；");
    render();
  }

  function renderSlotColumn(title, mods, cap, type, removalPreviewKeys) {
    const column = document.createElement("section");
    column.className = "slot-column";

    const heading = document.createElement("h3");
    heading.textContent = title;
    column.appendChild(heading);

    if (cap === 0 && mods.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-slot";
      empty.textContent = state.lang === "en" ? "No " + title.toLowerCase() + " slots at this rarity" : uiText("当前稀有度无") + title;
      column.appendChild(empty);
      return column;
    }

    const visibleSlotCount = Math.max(cap, mods.length);
    for (let index = 0; index < visibleSlotCount; index += 1) {
      const mod = mods[index];
      const row = document.createElement("div");
      row.className = mod
        ? modRowClass(mod, type, removalPreviewKeys) + (index >= cap ? " is-over-cap" : "")
        : "empty-slot";
      if (mod) {
        row.innerHTML = [
          '<div class="mod-text">' + escapeHtml(renderModText(mod, state.item)) + "</div>",
          '<div class="mod-meta">' + escapeHtml(modMetaText(mod)) + "</div>",
        ].join("");
      } else {
        row.textContent = state.lang === "en" ? "Empty slot" : uiText("空槽");
      }
      column.appendChild(row);
    }

    return column;
  }

  function modRowClass(mod, type, removalPreviewKeys) {
    const classes = ["mod-row", "mod-" + type];
    if (mod.desecrated) classes.push("is-desecrated");
    if (mod.desecrated && mod.revealed === false) classes.push("is-unrevealed");
    if (mod.fractured) classes.push("is-fractured");
    if (removalPreviewKeys && removalPreviewKeys.has(Core.modKey(mod))) classes.push("is-removal-candidate");
    return classes.join(" ");
  }

  function modMetaText(mod) {
    if (mod.desecrated && mod.revealed === false) return "亵渎 · 未揭露";
    return [
      mod.desecrated ? "亵渎" : "显式",
      mod.tier,
      "等级 " + mod.level,
      mod.name,
      mod.fractured ? "破溃" : "",
    ].filter(Boolean).join(" · ");
  }

  function renderActionButtons() {
    const tier = els.tierSelect.value;
    const categoryFilter = els.currencyCategory.value;
    const query = normalizeSearchText(els.currencySearch.value);
    const usableOnly = !!(els.usableOnly && els.usableOnly.checked);
    const counts = {
      totalByCategory: currencyCategoryTotals(),
      matchedByCategory: {},
      visibleByCategory: {},
      usableByCategory: {},
      matchedCount: 0,
      visibleCount: 0,
      usableCount: 0,
    };
    let matchedCount = 0;
    let visibleCount = 0;
    let usableCount = 0;

    els.currencyGrid.querySelectorAll(".currency-button").forEach(function (button) {
      const action = button.dataset.action;
      const entry = Core.CURRENCIES.find(function (item) { return item.id === action; });
      const actionCategory = button.dataset.category || "currency";
      const dynamicName = entry ? [
        Core.currencyNameFor(action, entry.supportsTiers ? tier : "normal"),
        toTraditional(Core.currencyNameFor(action, entry.supportsTiers ? tier : "normal")),
        displayActionName(entry, entry.supportsTiers ? tier : "normal"),
      ].join(" ") : "";
      const searchText = button.dataset.search + " " + dynamicName;
      const actualTier = entry && entry.supportsTiers ? tier : "normal";
      const validation = entry ? Core.validateCurrency(state.item, action, actualTier) : { ok: false, reason: "" };
      const categoryMatches = categoryFilter === "all" || actionCategory === categoryFilter;
      const searchMatches = searchTextMatches(searchText, query);
      const matches = categoryMatches && searchMatches;

      if (searchMatches) counts.matchedByCategory[actionCategory] = (counts.matchedByCategory[actionCategory] || 0) + 1;
      if (searchMatches && validation.ok) counts.usableByCategory[actionCategory] = (counts.usableByCategory[actionCategory] || 0) + 1;
      if (matches) matchedCount += 1;
      if (matches && validation.ok) usableCount += 1;
      const visible = matches && (!usableOnly || validation.ok);
      if (visible) visibleCount += 1;
      if (searchMatches && (!usableOnly || validation.ok)) {
        counts.visibleByCategory[actionCategory] = (counts.visibleByCategory[actionCategory] || 0) + 1;
      }

      button.classList.toggle("is-hidden", !visible);
      if (!entry) return;
      const name = button.querySelector(".currency-name");
      const rule = button.querySelector(".currency-rule");
      if (name) name.textContent = displayActionName(entry, actualTier);
      if (rule) rule.textContent = validation.ok ? displayActionRule(entry) : displayValidationReason(validation.reason);
      button.disabled = !validation.ok;
      button.classList.toggle("is-unusable", !validation.ok);
      button.classList.toggle("is-locked-omen", els.lockOmen.checked && state.lockedOmenId === action);
      button.title = validation.ok ? displayActionRule(entry) : displayValidationReason(validation.reason);
    });

    counts.matchedCount = matchedCount;
    counts.visibleCount = visibleCount;
    counts.usableCount = usableCount;
    updateCurrencySections(counts);
    refreshCurrencyCategoryTabs(counts);

    const empty = els.currencyGrid.querySelector(".currency-empty");
    if (empty) {
      empty.classList.toggle("is-hidden", visibleCount !== 0);
      empty.textContent = state.lang === "en" ? "No matching currencies" : uiText("没有匹配通货");
    }

    if (els.currencyStats) {
      const currentCategoryLabel = categoryFilter === "all" ? t("all") : categoryLabel(categoryFilter);
      els.currencyStats.textContent = [
        currentCategoryLabel,
        (state.lang === "en" ? "Shown " : uiText("显示 ")) + visibleCount + "/" + matchedCount,
        (state.lang === "en" ? "Usable " : uiText("可用 ")) + usableCount,
      ].join(" · ");
    }
  }

  function renderLockedOmenStatus() {
    if (!els.lockedOmenStatus) return;

    const enabled = els.lockOmen.checked;
    const lockedAction = state.lockedOmenId ? Core.getAction(state.lockedOmenId) : null;
    const pending = state.item && state.item.pendingOmen;
    els.lockedOmenStatus.classList.toggle("is-active", enabled && Boolean(lockedAction));
    els.lockedOmenStatus.classList.toggle("is-waiting", enabled && !lockedAction);

    if (!enabled) {
      els.lockedOmenStatus.textContent = t("unlockedOmen");
      return;
    }

    if (!lockedAction) {
      els.lockedOmenStatus.textContent = state.lang === "en" ? "Click an omen to lock it" : uiText("开启后点击一个预兆即可锁定");
      return;
    }

    const readyText = pending && pending.id === lockedAction.id
      ? (state.lang === "en" ? "Ready" : uiText("已准备"))
      : pending
        ? (state.lang === "en" ? "Another omen is ready" : uiText("当前已准备其他预兆"))
        : (state.lang === "en" ? "Not ready" : uiText("未准备"));
    els.lockedOmenStatus.textContent = (state.lang === "en" ? "Locked: " : uiText("锁定：")) + displayActionName(lockedAction, "normal") + " / " + readyText;
  }

  function renderHistory() {
    els.historyList.innerHTML = "";
    if (state.item.history.length === 0) {
      const empty = document.createElement("li");
      empty.className = "history-empty";
      empty.textContent = state.lang === "en" ? "No actions yet" : uiText("暂无操作");
      els.historyList.appendChild(empty);
      return;
    }

    state.item.history.slice().reverse().forEach(function (step, reverseIndex) {
      const realIndex = state.item.history.length - reverseIndex;
      const item = document.createElement("li");
      item.className = "history-entry";

      const title = document.createElement("div");
      title.className = "history-title";
      title.textContent = realIndex + ". " + (state.lang === "en" ? "Use " : uiText("使用 ")) + displayStepCurrency(step);
      item.appendChild(title);

      if (step.note) item.appendChild(noteLine(uiText(step.note)));
      if (step.omenSet) item.appendChild(noteLine((state.lang === "en" ? "Prepare omen: " : uiText("准备预兆: ")) + uiText(step.omenSet.label)));
      if (step.omenConsumed) item.appendChild(noteLine((state.lang === "en" ? "Trigger omen: " : uiText("触发预兆: ")) + uiText(step.omenConsumed.label)));

      step.removed.forEach(function (mod) {
        item.appendChild(historyLine(state.lang === "en" ? "Remove" : uiText("移除"), mod));
      });
      step.added.forEach(function (mod) {
        item.appendChild(historyLine(state.lang === "en" ? "Add" : uiText("添加"), mod));
      });
      (step.revealed || []).forEach(function (mod) {
        item.appendChild(historyLine(state.lang === "en" ? "Reveal" : uiText("揭露"), mod));
      });
      if (step.rerolled > 0) {
        item.appendChild(noteLine(state.lang === "en" ? "Rerolled values on " + step.rerolled + " modifiers" : uiText("重置 ") + step.rerolled + uiText(" 条词缀的数值")));
      }

      els.historyList.appendChild(item);
    });
  }

  function costableHistorySteps() {
    if (!state.item || !Array.isArray(state.item.history)) return [];
    return state.item.history.filter(function (step) {
      return step && step.currencyName && step.actionId !== "custom_item" && step.tier !== "custom";
    });
  }

  function renderCostSummary() {
    if (!els.historyStats) return;
    const steps = costableHistorySteps();
    if (steps.length === 0) {
      els.historyStats.innerHTML = [
        '<div class="cost-total">' + escapeHtml(state.lang === "en" ? "Total cost 0 actions" : uiText("总消耗 0 手")) + "</div>",
        '<div class="cost-empty">' + escapeHtml(state.lang === "en" ? "No currency spent yet" : uiText("暂无通货消耗")) + "</div>",
      ].join("");
      return;
    }

    const counts = steps.reduce(function (map, step) {
      const key = [step.actionId || "", step.tier || "normal", step.currencyName || ""].join("|");
      if (!map[key]) {
        map[key] = {
          label: displayStepCurrency(step),
          actionId: step.actionId || "",
          tier: step.tier || "normal",
          count: 0,
        };
      }
      map[key].count += 1;
      return map;
    }, {});

    const entries = Object.keys(counts).map(function (key) {
      return counts[key];
    }).sort(function (a, b) {
      return b.count - a.count || a.label.localeCompare(b.label, "zh-Hans-CN");
    });

    entries.forEach(function (entry) {
      entry.market = costMarketValue(entry);
    });

    const pricedEntries = entries.filter(function (entry) { return entry.market; });
    const unpricedCount = entries.length - pricedEntries.length;
    const totalRelativePrice = pricedEntries.reduce(function (sum, entry) {
      return sum + entry.market.relativePrice;
    }, 0);
    const marketSummary = costMarketSummaryText(totalRelativePrice, pricedEntries.length, unpricedCount);

    els.historyStats.innerHTML = [
      '<div class="cost-total">' + escapeHtml((state.lang === "en" ? "Total cost " + steps.length + " actions · " + entries.length + " types" : uiText("总消耗 ") + steps.length + uiText(" 手 · ") + entries.length + uiText(" 种")) + (marketSummary ? " · " + marketSummary : "")) + "</div>",
      '<div class="cost-list">',
      entries.map(function (entry) {
        const marketText = entry.market ? costMarketEntryText(entry.market.relativePrice) : "";
        return [
          '<span class="cost-chip" title="' + escapeHtml(entry.label) + '">',
          '<span class="cost-name">' + escapeHtml(entry.label) + "</span>",
          '<span class="cost-count">x' + entry.count + "</span>",
          marketText ? '<span class="cost-price">' + escapeHtml(marketText) + "</span>" : "",
          "</span>",
        ].join("");
      }).join(""),
      "</div>",
    ].join("");
  }

  function costMarketValue(entry) {
    const apiId = costMarketApiId(entry);
    if (!apiId) return null;
    const rate = marketCurrency(apiId);
    const relativePrice = Number(rate && rate.RelativePrice);
    if (!Number.isFinite(relativePrice) || relativePrice <= 0) return null;
    return {
      apiId,
      relativePrice: relativePrice * entry.count,
    };
  }

  function costMarketApiId(entry) {
    if (!entry) return "";
    const tierMap = MARKET_COST_TIER_API_IDS[entry.actionId];
    if (tierMap && tierMap[entry.tier || "normal"]) return tierMap[entry.tier || "normal"];

    const directApiId = MARKET_COST_ACTION_API_IDS[entry.actionId];
    if (directApiId && (!entry.tier || entry.tier === "normal")) return directApiId;

    const action = Core.getAction(entry.actionId);
    if (!action) return "";
    if (action.category === "omen") return MARKET_COST_OMEN_API_IDS[action.id] || "";
    if (action.category === "desecration") return MARKET_COST_DESECRATION_API_IDS[action.id] || "";
    if (action.category === "rune") return MARKET_COST_RUNE_API_IDS[action.id] || slugMarketId(action.id);
    if (action.category === "soul_core") return slugMarketId(action.soulCore && action.soulCore.importedId || action.id.replace(/_modifier$/, ""));
    if (action.category === "essence") return slugMarketId(action.essence && action.essence.importedId || action.id);
    if (action.category === "alloy") return slugMarketId(action.alloy && action.alloy.importedId || action.id);
    if (action.category === "liquid_emotion") return slugMarketId(action.liquidEmotion && action.liquidEmotion.importedId || action.id);
    if (action.category === "catalyst") return slugMarketId(action.catalyst && action.catalyst.importedId || action.id);
    return "";
  }

  function slugMarketId(value) {
    return String(value || "")
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/['’]/g, "")
      .replace(/_/g, "-")
      .replace(/[^a-zA-Z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
  }

  function costMarketSummaryText(totalRelativePrice, pricedTypes, unpricedTypes) {
    if (!pricedTypes || !Number.isFinite(totalRelativePrice) || totalRelativePrice <= 0) return "";
    const parts = ["chaos", "exalted", "divine"].map(function (apiId) {
      const amount = marketAmountFromRelative(totalRelativePrice, apiId);
      if (!Number.isFinite(amount)) return "";
      return formatMarketNumber(amount) + " " + marketUnitName(apiId);
    }).filter(Boolean);
    if (parts.length === 0) return "";
    const unpriced = unpricedTypes > 0
      ? (state.lang === "en" ? " · " + unpricedTypes + " unpriced" : uiText(" · ") + unpricedTypes + uiText(" 种未估价"))
      : "";
    return (state.lang === "en" ? "market value " : uiText("折合 ")) + parts.join(" / ") + unpriced;
  }

  function costMarketEntryText(relativePrice) {
    const amount = marketAmountFromRelative(relativePrice, "chaos");
    if (!Number.isFinite(amount)) return "";
    return "≈ " + formatMarketNumber(amount) + " " + marketUnitName("chaos");
  }

  async function loadMarketRates(force) {
    if (!els.marketRates || !window.fetch) return;
    if (state.market.loading && !force) return;
    state.market.loading = true;
    state.market.error = "";
    renderMarketRates();

    try {
      const cache = await fetchJson(MARKET_CACHE_URL);
      const league = cache && cache.league;
      const rates = cache && cache.rates;
      if (!league || !Array.isArray(rates) || rates.length === 0) throw new Error("Market cache is incomplete.");
      state.market = {
        loading: false,
        error: "",
        league,
        rates,
        updatedAt: cache.generatedAt ? new Date(cache.generatedAt) : new Date(),
      };
    } catch (error) {
      state.market.loading = false;
      state.market.error = error && error.message ? error.message : "Market source unavailable.";
    }
    renderMarketRates();
    renderCostSummary();
  }

  function fetchJson(url) {
    return fetch(url, {
      headers: { "Accept": "application/json" },
      cache: "no-store",
    }).then(function (response) {
      const contentType = response.headers.get("content-type") || "";
      if (!response.ok) throw new Error("HTTP " + response.status);
      if (!contentType.includes("application/json")) throw new Error("Response is not JSON.");
      return response.json();
    });
  }

  function renderMarketRates() {
    if (!els.marketRates) return;
    if (state.market.loading) {
      els.marketRates.classList.add("is-loading");
      els.marketRates.classList.remove("is-error");
      els.marketRates.textContent = state.lang === "en" ? "Loading POE2 Scout market rates..." : "正在读取 POE2 Scout 今日市场汇率...";
      return;
    }

    if (state.market.error) {
      els.marketRates.classList.remove("is-loading");
      els.marketRates.classList.add("is-error");
      els.marketRates.innerHTML = '<span class="market-source">' + escapeHtml(state.lang === "en"
        ? "POE2 Scout market source is unavailable."
        : "POE2 Scout 市场数据暂不可用。") + "</span>";
      return;
    }

    const chaos = marketCurrency("chaos");
    const exalted = marketCurrency("exalted");
    const divine = marketCurrency("divine");
    if (!chaos || !exalted || !divine) {
      els.marketRates.classList.remove("is-loading");
      els.marketRates.classList.add("is-error");
      els.marketRates.textContent = state.lang === "en" ? "Market rates missing chaos/exalted/divine." : "市场数据缺少混沌/崇高/神圣汇率。";
      return;
    }

    els.marketRates.classList.remove("is-loading", "is-error");
    const oneChaosInExalted = relativeExchange(chaos, exalted);
    const oneChaosInDivine = relativeExchange(chaos, divine);
    const oneDivineInChaos = relativeExchange(divine, chaos);
    const leagueName = state.market.league && (state.market.league.Value || state.market.league.ShortName) || "";
    const updated = state.market.updatedAt ? marketReferenceTimeText(state.market.updatedAt) : "";
    els.marketRates.innerHTML = [
      '<span class="market-source">' + escapeHtml("POE2 Scout · " + leagueName + (updated ? " · " + updated : "")) + "</span>",
      '<span class="market-chip">1 Chaos = ' + escapeHtml(formatMarketNumber(oneChaosInExalted)) + " Exalted</span>",
      '<span class="market-chip">1 Chaos = ' + escapeHtml(formatMarketNumber(oneChaosInDivine)) + " Divine</span>",
      '<span class="market-chip">1 Divine = ' + escapeHtml(formatMarketNumber(oneDivineInChaos)) + " Chaos</span>",
    ].join("");
  }

  function marketCurrency(apiId) {
    const normalized = String(apiId || "").toLowerCase();
    return (state.market.rates || []).find(function (entry) {
      return String(entry.ApiId || "").toLowerCase() === normalized;
    });
  }

  function relativeExchange(from, to) {
    const fromPrice = Number(from && from.RelativePrice);
    const toPrice = Number(to && to.RelativePrice);
    if (!Number.isFinite(fromPrice) || !Number.isFinite(toPrice) || toPrice <= 0) return NaN;
    return fromPrice / toPrice;
  }

  function marketAmountFromRelative(relativePrice, apiId) {
    const unit = marketCurrency(apiId);
    const unitPrice = Number(unit && unit.RelativePrice);
    if (!Number.isFinite(relativePrice) || !Number.isFinite(unitPrice) || unitPrice <= 0) return NaN;
    return relativePrice / unitPrice;
  }

  function marketUnitName(apiId) {
    if (state.lang === "en") {
      const english = { chaos: "Chaos", exalted: "Exalted", divine: "Divine" };
      return english[apiId] || englishFromId(apiId);
    }
    const chinese = { chaos: "混沌", exalted: "崇高", divine: "神圣" };
    return uiText(chinese[apiId] || apiId);
  }

  function formatMarketNumber(value) {
    if (!Number.isFinite(value)) return "-";
    if (value >= 100) return value.toFixed(1);
    if (value >= 10) return value.toFixed(2);
    if (value >= 1) return value.toFixed(3);
    return value.toFixed(5);
  }

  function formatMarketTime(date) {
    try {
      if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return "";
      const pad = function (value) { return String(value).padStart(2, "0"); };
      return date.getFullYear() + "." + (date.getMonth() + 1) + "." + date.getDate() + "." + pad(date.getHours()) + ":" + pad(date.getMinutes());
    } catch (error) {
      return "";
    }
  }

  function marketReferenceTimeText(date) {
    const value = formatMarketTime(date);
    if (!value) return "";
    return state.lang === "en" ? "Market reference " + value : uiText("市场价格参考时间 ") + value;
  }

  function noteLine(text) {
    const line = document.createElement("div");
    line.className = "history-note";
    line.textContent = text;
    return line;
  }

  function displayStepCurrency(step) {
    const action = step && step.actionId ? Core.getAction(step.actionId) : null;
    if (action) {
      if (state.lang === "en") return englishStepCurrencyName(action, step.tier || "normal");
      return displayActionName(action, step.tier || "normal");
    }
    if (state.lang === "en") return englishFromId(step.currencyName);
    return uiText(step.currencyName);
  }

  function englishStepCurrencyName(action, tier) {
    const baseName = displayActionName(action, "normal");
    const prefix = { greater: "Greater", perfect: "Perfect" }[tier || "normal"];
    return prefix ? prefix + " " + baseName : baseName;
  }

  function historyLine(label, mod) {
    const line = document.createElement("div");
    line.className = "history-line";
    const typeLabel = mod.desecrated
      ? (state.lang === "en" ? "Desecrated " + mod.type : uiText("亵渎") + (mod.type === "prefix" ? t("prefix") : t("suffix")))
      : (mod.type === "prefix" ? t("prefix") : t("suffix"));
    line.innerHTML = [
      '<span class="history-label">' + label + "</span>",
      '<span>' + escapeHtml(typeLabel + ": " + renderModText(mod)) + "</span>",
    ].join("");
    return line;
  }

  function renderPool() {
    const item = state.item;
    const action = els.poolAction.value || defaultPoolAction(item);
    const tier = els.tierSelect.value;
    const actionEntry = Core.getAction(action);
    const isDesecrationPool = !!(actionEntry && actionEntry.category === "desecration");
    const actualPool = Core.summarizePool(item, tier, action || null);
    const pool = isDesecrationPool
      ? Core.summarizePool(item, tier, action || null, { ignoreItemState: true })
      : actualPool;
    const actualModIds = new Set(actualPool.mods.map(function (mod) { return mod.id; }));
    const query = normalizeSearchText(els.poolSearch.value);
    const filtered = pool.mods.filter(function (mod) {
      if (!query) return true;
      return searchTextMatches([
        mod.name,
        mod.tier,
        mod.group,
        mod.tags.join(" "),
        Core.renderRange(mod),
        toTraditional(Core.renderRange(mod)),
        renderRangeText(mod),
        allLocalizedText(I18N.modifiers, mod.id),
      ].join(" "), query);
    });

    const minLevelText = pool.minLevel > 0
      ? (state.lang === "en" ? "Minimum modifier level " + pool.minLevel : uiText("最低词缀等级 ") + pool.minLevel)
      : (state.lang === "en" ? "No minimum modifier level" : uiText("无最低词缀等级限制"));
    els.poolStats.textContent = [
      (state.lang === "en" ? "Available " : uiText("可选 ")) + filtered.length + "/" + pool.mods.length,
      minLevelText,
      t("prefix") + " " + pool.prefixCount,
      t("suffix") + " " + pool.suffixCount,
      (state.lang === "en" ? "Total weight " : uiText("总权重 ")) + pool.totalWeight,
    ].join(" · ");

    if (isDesecrationPool) {
      els.poolStats.textContent = els.poolStats.textContent.replace(minLevelText, (state.lang === "en" ? "Actually rollable " : uiText("当前可抽 ")) + actualPool.mods.length + (state.lang === "en" ? " routes " : uiText(" 路 ")) + minLevelText);
    }

    const typeTotals = modWeightTotalsByType(pool.mods);
    els.poolList.innerHTML = "";
    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "pool-empty";
      empty.textContent = state.lang === "en" ? "No available modifiers" : uiText("无可用词缀");
      els.poolList.appendChild(empty);
      return;
    }

    filtered.forEach(function (mod) {
      const row = document.createElement("div");
      const isActual = !isDesecrationPool || actualModIds.has(mod.id);
      row.className = "pool-row" + (isActual ? "" : " is-unavailable");
      const chance = modChanceText(mod, typeTotals);
      const kindText = mod.desecrated
        ? (state.lang === "en" ? "Desecrated " + (mod.type === "prefix" ? "prefix" : "suffix") : uiText(mod.type === "prefix" ? "亵渎前" : "亵渎后"))
        : (mod.type === "prefix" ? t("prefix") : t("suffix"));
      row.innerHTML = [
        '<div class="pool-main">',
        '<span class="pool-kind ' + mod.type + '">' + kindText + "</span>",
        '<span class="pool-text">' + escapeHtml(renderRangeText(mod)) + "</span>",
        '<span class="pool-chance">' + escapeHtml((state.lang === "en" ? "Chance " : uiText("出现 ")) + chance) + "</span>",
        "</div>",
        '<div class="pool-meta">' + escapeHtml(mod.tier + " · " + (state.lang === "en" ? "Level " : uiText("等级 ")) + mod.level + " · " + modWeightLabel(mod) + " · " + (state.lang === "en" ? "Group " + englishFromId(mod.group) : uiText("组 ") + uiText(mod.group))) + "</div>",
      ].join("");
      els.poolList.appendChild(row);
    });
  }

  function defaultPoolAction(item) {
    const base = Core.getBase(item.baseId);
    if (item.rarity === "rare" && base && base.classId === "jewel") return "preserved_cranium";
    if (item.rarity === "rare" && base && base.classId === "waystone") return "preserved_vertebrae";
    if (item.rarity === "normal") return "transmutation";
    if (item.rarity === "magic") return "augmentation";
    if (item.rarity === "rare") return "exalted";
    return "";
  }

  function renderToast() {
    const warning = dataLoadWarning();
    els.toast.textContent = warning || uiText(state.lastMessage) || "";
    els.toast.classList.toggle("is-empty", !warning && !state.lastMessage);
    els.toast.classList.toggle("is-warning", Boolean(warning));
  }

  function dataLoadWarning() {
    const status = Core.DATA_STATUS || {};
    const missing = [];
    if (!status.modDataLoaded) missing.push(state.lang === "en" ? "modifier data" : uiText("词缀数据"));
    if (!status.craftingDataLoaded) missing.push(state.lang === "en" ? "currency/desecration data" : uiText("通货/亵渎数据"));
    if (!status.soulCoreDataLoaded) missing.push("Soul Core 数据");
    if (missing.length === 0) return "";
    return state.lang === "en"
      ? "Data load failed: " + missing.join(", ") + " missing. Fallback sample data is unreliable; re-upload dist/data/*.js."
      : uiText("数据加载失败：") + missing.join("、") + uiText(" 未载入，当前会使用备用样例数据，做装结果不可信。请重新上传 dist/data/*.js。");
  }

  function summarizeStep(step) {
    const parts = [displayStepCurrency(step)];
    if (step.note) parts.push(uiText(step.note));
    if (step.omenSet) parts.push((state.lang === "en" ? "Prepare " : uiText("准备 ")) + uiText(step.omenSet.label));
    if (step.omenConsumed) parts.push((state.lang === "en" ? "Trigger " : uiText("触发 ")) + uiText(step.omenConsumed.label));
    if (step.removed.length) parts.push((state.lang === "en" ? "Remove " : uiText("移除 ")) + step.removed.map(function (mod) { return renderModText(mod); }).join("、"));
    if (step.added.length) parts.push((state.lang === "en" ? "Add " : uiText("添加 ")) + step.added.map(function (mod) { return renderModText(mod); }).join("、"));
    if (step.revealed && step.revealed.length) parts.push((state.lang === "en" ? "Reveal " : uiText("揭露 ")) + step.revealed.map(function (mod) { return renderModText(mod); }).join("、"));
    if (step.rerolled) parts.push(state.lang === "en" ? "Reroll " + step.rerolled + " values" : uiText("重置 ") + step.rerolled + uiText(" 条数值"));
    return parts.join("；");
  }

  function categoryLabel(category) {
    if (category === "omen") return t("omen");
    if (category === "desecration") return t("desecration");
    if (category === "essence") return t("essence");
    if (category === "alloy") return t("alloy");
    if (category === "liquid_emotion") return t("liquidEmotion");
    if (category === "catalyst") return t("catalyst");
    if (category === "rune") return t("rune");
    if (category === "soul_core") return "Soul Core";
    return t("currency");
  }

  function actionSearchAliases(action) {
    const aliases = [];
    const category = action.category || "";
    if (category === "essence") aliases.push("精华 精髓 精華 精髓 essence");
    if (category === "liquid_emotion") aliases.push("液化情感 液化情緒 情感 情緒 emotion liquid distilled");
    if (category === "catalyst") aliases.push("催化剂 催化劑 catalyst quality 品质 品質");
    if (/^vaal_(armour_infuser|whetstone|arcanists_etcher|catalysing_infuser)$/.test(action.id)) aliases.push("瓦尔 瓦爾 注能装置 注能裝置 催化注能 瓦尔催化 Vaal Infuser Catalysing Quality");
    if (category === "omen") aliases.push("预兆 預兆 征兆 徵兆 omen");
    if (category === "desecration") aliases.push("亵渎 褻瀆 desecrated abyssal");
    if (category === "essence") aliases.push("精华 精髓 essence");
    if (category === "liquid_emotion") aliases.push("液化情感 液化情緒 情感 emotion liquid distilled");
    if (category === "catalyst") aliases.push("催化剂 催化劑 catalyst quality 品质 品質");
    if (/^vaal_(armour_infuser|whetstone|arcanists_etcher|catalysing_infuser)$/.test(action.id)) aliases.push("瓦尔 瓦爾 注能装置 注能裝置 催化注能 瓦尔催化 Vaal Infuser Catalysing Quality");
    if (category === "omen") aliases.push("预兆 預兆 征兆 徵兆 omen");
    if (category === "desecration") aliases.push("亵渎 褻瀆 desecrated abyssal");
    return aliases.join(" ");
  }

  function makeSeed() {
    const bytes = new Uint32Array(2);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      bytes[0] = Math.floor(Math.random() * 0xffffffff);
      bytes[1] = Date.now() >>> 0;
    }
    return "craft-" + Date.now().toString(36) + "-" + bytes[0].toString(36) + bytes[1].toString(36);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[char];
    });
  }
})();
