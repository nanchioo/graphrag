export const mockDashboardMetricCards = [
  {
    label: "知识图谱",
    value: "12",
    suffix: "",
    trendLabel: "+ 2 本月",
    tone: "brand" as const,
  },
  {
    label: "实体总数",
    value: "248,931",
    suffix: "",
    trendLabel: "+ 4.2%",
    tone: "info" as const,
  },
  {
    label: "关系总数",
    value: "612,405",
    suffix: "",
    trendLabel: "+ 5.8%",
    tone: "neutral" as const,
  },
  {
    label: "本月 Token",
    value: "42.8",
    suffix: "M",
    trendLabel: "预算 55%",
    tone: "success" as const,
  },
];

export const mockEntityGrowthPoints = [38, 41, 40, 47, 49, 46, 54, 58, 57, 63, 62, 71, 73, 78];

export const mockEntityGrowthPeriods = ["7天", "14天", "30天"];

export const mockTokenBars = [16, 22, 12, 18, 36, 31, 17, 25, 33, 40, 49, 45, 33, 42, 52, 61, 49];

export const mockTokenSummary = {
  todayLabel: "1.84M tokens",
  costLabel: "$24.18",
};

export const mockRecentJobs = [
  {
    graph: "金融年报 2024",
    stage: "GenerateReports",
    progress: "82%",
    progressValue: 82,
    duration: "12m 04s",
    status: "运行中",
  },
  {
    graph: "医疗文献 Q2",
    stage: "ExtractGraph",
    progress: "100%",
    progressValue: 100,
    duration: "41m 22s",
    status: "完成",
  },
  {
    graph: "客服对话数据",
    stage: "ChunkDocuments",
    progress: "100%",
    progressValue: 100,
    duration: "2m 18s",
    status: "完成",
  },
  {
    graph: "法律合同库",
    stage: "EmbedChunks",
    progress: "45%",
    progressValue: 45,
    duration: "8m 50s",
    status: "运行中",
  },
];

export const mockDifyStatus = {
  label: "已连接",
  description: "Endpoint 正常 · 上次同步 2 分钟前",
};

export const mockQuickActions = ["上传数据源", "新建查询"];

export const mockRecentQueries = [
  "2024 年 AI 领域最重要的三个技术突破是什么？",
  "英伟达与特斯拉的关系是什么？",
  "医疗文献中常见的副作用类型",
];

export const mockRecentDifyCalls = [
  {
    title: "2024 年英伟达的主要竞争对手",
    status: "成功",
    time: "12s 前",
  },
  {
    title: "特斯拉 FSD 的技术路线演进",
    status: "成功",
    time: "48s 前",
  },
  {
    title: "GraphRAG 如何处理增量更新",
    status: "超时",
    time: "2m 前",
  },
];

export const mockTaskOverview = [
  {
    label: "运行中",
    value: "3",
    hint: "2 个排队",
  },
  {
    label: "今日完成",
    value: "12",
    hint: "+4 vs 昨天",
  },
  {
    label: "失败",
    value: "1",
    hint: "上次 · 5 小时前",
  },
  {
    label: "平均耗时",
    value: "18:42",
    hint: "-12%",
  },
];
