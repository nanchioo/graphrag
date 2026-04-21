import type { QueryResponsePayload } from "../../shared/types/api";

export const mockQueryResults: Record<string, QueryResponsePayload> = {
  "demo-001:global": {
    graph_id: "demo-001",
    mode: "global",
    answer:
      "基于对《金融年报 2024》图谱中 142 份社区报告的综合分析，2024 年 AI 领域最重要的三个技术突破包括：\n\n1. 大规模推理模型的成熟，例如 OpenAI o1 与 Anthropic Claude 3.5，让复杂任务的规划、拆解与多步推理能力显著提升。\n\n2. 多模态统一架构逐步走向原生融合，文本、图像、音频与视频处理不再依赖拼接式工作流，而是共享统一表征空间。\n\n3. Agent 框架开始商业化落地，MCP、Operator 等模式推动 AI Agent 从 demo 阶段走向生产环境。",
    context: {
      communities: ["C-12 · AI 科技巨头", "C-45 · 推理模型", "C-31 · Agent 生态"],
      references: ["C-12", "C-45", "C-31", "report-2024-ai-summary"],
      parameters: {
        communityLevel: "0（叶子）",
        responseType: "multi-paragraph",
        maxContextTokens: 12000,
        temperature: 0,
      },
    },
    latency_label: "3.42s",
    token_count_label: "12.8K tokens",
    hit_context_count: 8,
    hit_community_count: 5,
    response_type: "Global Search",
    execution_chain: ["Select communities", "Assemble reports", "Synthesize answer"],
    recent_queries: [
      "特斯拉与英伟达的关系是什么？",
      "医疗文献中常见的副作用类型",
      "Microsoft 近三年的主要收购",
    ],
  },
  "demo-001:local": {
    graph_id: "demo-001",
    mode: "local",
    answer:
      "围绕英伟达实体展开的 Local Search 显示，其最强关联节点来自 H100、CUDA、黄仁勋以及核心客户集群。这个模式更适合回答“某个实体与谁相关、关系为什么成立”这类精确问题。",
    context: {
      communities: ["C-12 · AI 科技巨头"],
      references: ["entity-nvda", "claim-cuda-02", "edge-h100-11"],
      parameters: {
        communityLevel: "0（叶子）",
        responseType: "precise",
        maxContextTokens: 6000,
        temperature: 0,
      },
    },
    latency_label: "1.18s",
    token_count_label: "4.9K tokens",
    hit_context_count: 12,
    hit_community_count: 1,
    response_type: "Local Search",
    execution_chain: ["Select root entity", "Expand neighbors", "Ground answer"],
    recent_queries: [
      "英伟达与特斯拉的共同供应商有哪些？",
      "黄仁勋在图谱中的高频关系是什么？",
      "H100 芯片与哪些社区联系最强？",
    ],
  },
  "demo-001:drift": {
    graph_id: "demo-001",
    mode: "drift",
    answer:
      "Drift Search 会先从英伟达和 H100 芯片所在社区出发，再逐步漂移到算力供给与新能源需求两个更大的主题，最后汇总出市场竞争和供应链约束两个核心结论。它适合探索跨主题、跨社区的问题。",
    context: {
      communities: ["C-12 · AI 科技巨头", "C-7 · 新能源", "C-3 · 宏观市场"],
      references: ["claim-881", "claim-910", "report-energy-03"],
      parameters: {
        communityLevel: "1（社区）",
        responseType: "narrative",
        maxContextTokens: 9000,
        temperature: 0.3,
      },
    },
    latency_label: "2.64s",
    token_count_label: "9.3K tokens",
    hit_context_count: 10,
    hit_community_count: 3,
    response_type: "Drift Search",
    execution_chain: ["Start local", "Drift to adjacent communities", "Merge into narrative"],
    recent_queries: [
      "特斯拉 FSD 的技术路线演进？",
      "GraphRAG 如何处理增量更新？",
      "医疗领域的主要风险事件？",
    ],
  },
};
