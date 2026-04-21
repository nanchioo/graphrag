export type NavGlyph =
  | "dashboard"
  | "graphs"
  | "viz"
  | "sources"
  | "query"
  | "browse"
  | "jobs"
  | "dify"
  | "settings";

type NavItem = {
  id: string;
  label: string;
  to: string;
  icon: NavGlyph;
  count?: string;
};

type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

export const navSections: NavSection[] = [
  {
    id: "core",
    label: "",
    items: [
      { id: "dashboard", label: "概览", to: "/dashboard", icon: "dashboard" },
      { id: "graphs", label: "知识图谱", to: "/graphs", icon: "graphs", count: "12" },
      {
        id: "graph-viz",
        label: "图谱可视化",
        to: "/graphs/demo-001/viz",
        icon: "viz",
      },
      { id: "sources", label: "数据源", to: "/sources", icon: "sources", count: "28" },
      { id: "query", label: "查询测试台", to: "/query", icon: "query" },
    ],
  },
  {
    id: "ops",
    label: "运维",
    items: [
      { id: "browse", label: "实体 / 关系", to: "/browse", icon: "browse" },
      { id: "jobs", label: "任务监控", to: "/jobs", icon: "jobs", count: "3" },
    ],
  },
  {
    id: "integration",
    label: "集成",
    items: [
      { id: "dify", label: "Dify 对接", to: "/dify", icon: "dify" },
      { id: "settings", label: "系统设置", to: "/settings", icon: "settings" },
    ],
  },
];
