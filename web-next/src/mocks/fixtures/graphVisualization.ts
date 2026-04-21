export type VizCommunityId =
  | "macro"
  | "ai"
  | "finance"
  | "energy"
  | "health";

export type VizEntityType =
  | "organization"
  | "person"
  | "concept"
  | "product";

export type VizNode = {
  id: string;
  label: string;
  communityId: VizCommunityId;
  entityType: VizEntityType;
  radius: number;
  featured?: boolean;
  force: [number, number];
  community: [number, number];
};

export type VizEdge = {
  id: string;
  source: string;
  target: string;
};

export type VizCommunity = {
  id: VizCommunityId;
  label: string;
  color: string;
  block: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

function createNode(
  id: string,
  label: string,
  communityId: VizCommunityId,
  entityType: VizEntityType,
  radius: number,
  force: [number, number],
  community: [number, number],
  featured = false,
): VizNode {
  return {
    id,
    label,
    communityId,
    entityType,
    radius,
    force,
    community,
    featured,
  };
}

function createEdge(source: string, target: string): VizEdge {
  return {
    id: `${source}-${target}`,
    source,
    target,
  };
}

export const graphVizCommunities: VizCommunity[] = [
  {
    id: "macro",
    label: "资本市场 · 宏观",
    color: "#2d6df6",
    block: { x: 70, y: 150, width: 220, height: 150 },
  },
  {
    id: "ai",
    label: "AI · 科技巨头",
    color: "#5b62e8",
    block: { x: 330, y: 150, width: 220, height: 150 },
  },
  {
    id: "finance",
    label: "中国金融 · 汇率",
    color: "#ef4b9a",
    block: { x: 590, y: 150, width: 220, height: 150 },
  },
  {
    id: "energy",
    label: "新能源产业链",
    color: "#ff7a18",
    block: { x: 210, y: 400, width: 220, height: 150 },
  },
  {
    id: "health",
    label: "公共卫生",
    color: "#19b883",
    block: { x: 470, y: 400, width: 220, height: 150 },
  },
];

export const graphVizNodes: VizNode[] = [
  createNode("blackrock", "贝莱德", "macro", "organization", 15, [210, 255], [120, 205], true),
  createNode("vanguard", "先锋基金", "macro", "organization", 12, [205, 295], [180, 205], true),
  createNode("sp500", "标普500", "macro", "concept", 11, [175, 330], [240, 205], true),
  createNode("fed", "美联储", "macro", "organization", 10, [135, 255], [120, 255]),
  createNode("cpi", "CPI", "macro", "concept", 8, [90, 280], [180, 255]),
  createNode("treasury", "美债", "macro", "product", 8, [130, 210], [240, 255]),
  createNode("usd", "美元指数", "macro", "product", 8, [172, 185], [120, 285]),
  createNode("etf", "ETF", "macro", "product", 8, [225, 195], [180, 285]),
  createNode("spacex", "SpaceX", "ai", "organization", 11, [405, 330], [382, 205], true),
  createNode("musk", "马斯克", "ai", "person", 11, [445, 295], [442, 205], true),
  createNode("tesla", "特斯拉", "ai", "organization", 15, [438, 255], [502, 205], true),
  createNode("nvidia", "英伟达", "ai", "organization", 10, [355, 255], [382, 255]),
  createNode("cuda", "CUDA", "ai", "product", 8, [315, 280], [442, 255]),
  createNode("openai", "OpenAI", "ai", "organization", 8, [352, 210], [502, 255]),
  createNode("chip", "AI 芯片", "ai", "product", 8, [405, 185], [382, 285]),
  createNode("xai", "xAI", "ai", "organization", 8, [455, 195], [442, 285]),
  createNode("pingan", "中国平安", "finance", "organization", 15, [710, 255], [640, 205], true),
  createNode("cmb", "招商银行", "finance", "organization", 11, [708, 298], [700, 205], true),
  createNode("icbc", "工商银行", "finance", "organization", 10, [662, 332], [760, 205], true),
  createNode("boc", "中国银行", "finance", "organization", 8, [662, 210], [640, 255]),
  createNode("cny", "人民币", "finance", "product", 8, [598, 255], [700, 255]),
  createNode("fx", "汇率波动", "finance", "concept", 8, [605, 212], [760, 255]),
  createNode("hkex", "港交所", "finance", "organization", 8, [662, 185], [700, 285]),
  createNode("catl", "宁德时代", "energy", "organization", 15, [318, 455], [260, 455], true),
  createNode("byd", "比亚迪", "energy", "organization", 11, [312, 505], [320, 455], true),
  createNode("lithium", "锂电池", "energy", "product", 10, [262, 535], [380, 455], true),
  createNode("ev", "电动车", "energy", "product", 8, [220, 490], [260, 505]),
  createNode("solar", "光伏", "energy", "product", 8, [220, 430], [320, 505]),
  createNode("storage", "储能", "energy", "concept", 8, [262, 395], [380, 505]),
  createNode("grid", "电网", "energy", "organization", 8, [310, 410], [260, 545]),
  createNode("battery", "电池材料", "energy", "product", 8, [352, 445], [320, 545]),
  createNode("pfizer", "辉瑞", "health", "organization", 11, [462, 525], [520, 455], true),
  createNode("covid", "新冠", "health", "concept", 15, [555, 455], [580, 455], true),
  createNode("vaccine", "疫苗", "health", "product", 10, [540, 510], [640, 455], true),
  createNode("who", "WHO", "health", "organization", 8, [555, 375], [520, 505]),
  createNode("mrna", "mRNA", "health", "product", 8, [465, 395], [580, 505]),
  createNode("cdc", "中国 CDC", "health", "organization", 8, [505, 435], [640, 505]),
  createNode("antibody", "抗体", "health", "product", 8, [600, 395], [520, 545]),
  createNode("trial", "临床试验", "health", "concept", 8, [600, 455], [580, 545]),
];

export const graphVizEdges: VizEdge[] = [
  createEdge("blackrock", "vanguard"),
  createEdge("blackrock", "sp500"),
  createEdge("blackrock", "etf"),
  createEdge("vanguard", "sp500"),
  createEdge("vanguard", "etf"),
  createEdge("fed", "usd"),
  createEdge("usd", "treasury"),
  createEdge("treasury", "cpi"),
  createEdge("fed", "cpi"),
  createEdge("spacex", "musk"),
  createEdge("musk", "tesla"),
  createEdge("tesla", "nvidia"),
  createEdge("nvidia", "cuda"),
  createEdge("nvidia", "chip"),
  createEdge("tesla", "chip"),
  createEdge("openai", "nvidia"),
  createEdge("openai", "cuda"),
  createEdge("xai", "musk"),
  createEdge("pingan", "cmb"),
  createEdge("pingan", "icbc"),
  createEdge("pingan", "boc"),
  createEdge("cmb", "cny"),
  createEdge("cny", "fx"),
  createEdge("fx", "hkex"),
  createEdge("icbc", "cny"),
  createEdge("boc", "fx"),
  createEdge("catl", "byd"),
  createEdge("catl", "lithium"),
  createEdge("catl", "battery"),
  createEdge("byd", "ev"),
  createEdge("byd", "battery"),
  createEdge("lithium", "storage"),
  createEdge("storage", "grid"),
  createEdge("solar", "grid"),
  createEdge("pfizer", "covid"),
  createEdge("pfizer", "vaccine"),
  createEdge("vaccine", "trial"),
  createEdge("trial", "covid"),
  createEdge("who", "covid"),
  createEdge("who", "cdc"),
  createEdge("mrna", "vaccine"),
  createEdge("antibody", "trial"),
  createEdge("antibody", "covid"),
  createEdge("cdc", "covid"),
  createEdge("sp500", "nvidia"),
  createEdge("sp500", "pingan"),
  createEdge("usd", "cny"),
  createEdge("tesla", "catl"),
  createEdge("tesla", "byd"),
  createEdge("chip", "battery"),
  createEdge("fx", "usd"),
  createEdge("covid", "fx"),
  createEdge("who", "pingan"),
  createEdge("grid", "cpi"),
];

export const graphVizEntityFilterOptions = [
  { value: "all", label: "全部 (48,291)" },
  { value: "organization", label: "组织 (22,840)" },
  { value: "person", label: "人物 (3,610)" },
  { value: "concept", label: "概念 (11,204)" },
  { value: "product", label: "产品 (10,637)" },
];
