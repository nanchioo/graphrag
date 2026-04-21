import { useState } from "react";

import { Card } from "../../shared/ui/Card";
import { PageHeader } from "../../shared/ui/PageHeader";

const tabs: ReadonlyArray<{
  id: "files" | "reader" | "chunk" | "vector";
  label: string;
  count?: string;
}> = [
  { id: "files", label: "文件", count: "5" },
  { id: "reader", label: "Input Reader" },
  { id: "chunk", label: "分片配置" },
  { id: "vector", label: "向量化" },
] as const;

type SourceTab = (typeof tabs)[number]["id"];
type FileStatusTone = "success" | "pending" | "failed";

const sourceFiles = [
  {
    name: "annual_report_2024.pdf",
    summary: "上市公司年报 · 2024 Q1",
    type: "pdf",
    size: "12.4 MB",
    chunks: "482",
    status: "已索引",
    statusTone: "success" as FileStatusTone,
    uploadedAt: "2025-04-12",
  },
  {
    name: "market_brief_mar.txt",
    summary: "市场快报 · 3 月摘要",
    type: "text",
    size: "340 KB",
    chunks: "28",
    status: "已索引",
    statusTone: "success" as FileStatusTone,
    uploadedAt: "2025-04-12",
  },
  {
    name: "analyst_notes_q1.md",
    summary: "分析师纪要 · Q1",
    type: "text",
    size: "1.1 MB",
    chunks: "54",
    status: "已索引",
    statusTone: "success" as FileStatusTone,
    uploadedAt: "2025-04-10",
  },
  {
    name: "earnings_call_transcripts.csv",
    summary: "电话会转录 · 待处理",
    type: "csv",
    size: "8.2 MB",
    chunks: "612",
    status: "待索引",
    statusTone: "pending" as FileStatusTone,
    uploadedAt: "2025-04-18",
  },
  {
    name: "regulatory_filings.json",
    summary: "监管文件 · 解析失败",
    type: "json",
    size: "24.8 MB",
    chunks: "0",
    status: "失败",
    statusTone: "failed" as FileStatusTone,
    uploadedAt: "2025-04-18",
  },
];

const previewChunks = [
  {
    id: "chunk-001",
    title: "chunk 001 · 842 tokens",
    body: "Microsoft 在 2024 年 Q1 财报中披露……（略）",
    tone: "blue",
  },
  {
    id: "chunk-002",
    title: "chunk 002 · 756 tokens · 重叠 100",
    body: "……与 chunk 001 末尾重叠，用于跨段语义衔接……",
    tone: "violet",
  },
  {
    id: "chunk-003",
    title: "chunk 003 · 912 tokens · 重叠 100",
    body: "Azure OpenAI Service 订阅增长与产品节奏……",
    tone: "rose",
  },
];

export function DataSourcesPage() {
  const [activeTab, setActiveTab] = useState<SourceTab>("files");
  const [chunkSize, setChunkSize] = useState(1200);
  const [chunkOverlap, setChunkOverlap] = useState(100);

  return (
    <>
      <PageHeader
        title="数据源"
        description="配置输入 reader、分片参数，并管理已上传的文档。"
      />
      <div className="data-source-workspace">
        <div className="source-tab-nav" role="tablist" aria-label="数据源页面标签">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={
                  isActive
                    ? "source-tab-button source-tab-button-active"
                    : "source-tab-button"
                }
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="source-tab-icon">
                  {tab.id === "files" ? <FileIcon /> : null}
                  {tab.id === "reader" ? <ReaderIcon /> : null}
                  {tab.id === "chunk" ? <ScissorsIcon /> : null}
                  {tab.id === "vector" ? <DatabaseIcon /> : null}
                </span>
                <span>{tab.label}</span>
                {tab.count ? <span className="source-tab-count">{tab.count}</span> : null}
              </button>
            );
          })}
        </div>

        <div className="source-tab-panel">
          {activeTab === "files" ? <FilesTab /> : null}
          {activeTab === "reader" ? <ReaderTab /> : null}
          {activeTab === "chunk" ? (
            <ChunkTab
              chunkSize={chunkSize}
              chunkOverlap={chunkOverlap}
              onChunkSizeChange={setChunkSize}
              onChunkOverlapChange={setChunkOverlap}
            />
          ) : null}
          {activeTab === "vector" ? <VectorTab /> : null}
        </div>
      </div>
    </>
  );
}

function FilesTab() {
  return (
    <div className="stack-lg">
      <div className="source-toolbar">
        <div className="source-toolbar-left">
          <label className="source-search">
            <span className="source-search-icon">
              <SearchIcon />
            </span>
            <input
              type="search"
              className="ui-input source-search-input"
              placeholder="搜索文件..."
            />
          </label>
          <select className="source-select" defaultValue="all" aria-label="文件类型">
            <option value="all">全部类型</option>
            <option value="document">文档</option>
            <option value="table">表格</option>
            <option value="structured">结构化 JSON</option>
          </select>
        </div>

        <button type="button" className="graph-header-button">
          <RefreshIcon />
          重新索引
        </button>
      </div>

      <section className="source-upload-panel">
        <span className="source-upload-icon">
          <UploadIcon />
        </span>
        <strong>拖放文件到这里，或点击浏览</strong>
        <p>支持 txt, md, csv, json, pdf（≤ 100 MB/文件）</p>
        <button type="button" className="graph-header-button">
          <FileIcon />
          选择文件
        </button>
      </section>

      <div className="graph-table-shell source-file-table-shell">
        <table className="graph-table source-file-table">
          <thead>
            <tr>
              <th aria-label="select-all">
                <input type="checkbox" aria-label="选择全部文件" />
              </th>
              <th>文件</th>
              <th>类型</th>
              <th>大小</th>
              <th>Chunks</th>
              <th>状态</th>
              <th>上传时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {sourceFiles.map((file) => (
              <tr key={file.name}>
                <td>
                  <input type="checkbox" aria-label={`选择 ${file.name}`} />
                </td>
                <td>
                  <div className="source-file-name-cell">
                    <span className="source-file-icon">
                      <FileIcon />
                    </span>
                    <div className="source-file-copy">
                      <strong>{file.name}</strong>
                      <span>{file.summary}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="source-format-badge">{file.type}</span>
                </td>
                <td>{file.size}</td>
                <td>{file.chunks}</td>
                <td>
                  <span className={`status-pill ${file.statusTone}`}>{file.status}</span>
                </td>
                <td>{file.uploadedAt}</td>
                <td>
                  <div className="source-action-buttons">
                    <button type="button" className="source-action-button" aria-label="预览文件">
                      <EyeIcon />
                    </button>
                    <button type="button" className="source-action-button" aria-label="删除文件">
                      <TrashIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReaderTab() {
  return (
    <Card>
      <div className="source-reader-grid">
        <label className="source-field">
          <span className="source-field-label">Input 类型</span>
          <select className="source-select source-control" defaultValue="file">
            <option value="file">file（本地文件系统）</option>
            <option value="blob">blob（对象存储）</option>
            <option value="cosmosdb">cosmosdb（结构化源）</option>
          </select>
          <span className="source-field-help">file / blob / cosmosdb</span>
        </label>

        <label className="source-field">
          <span className="source-field-label">File Type</span>
          <select className="source-select source-control" defaultValue="text">
            <option value="text">text</option>
            <option value="pdf">pdf</option>
            <option value="json">json</option>
            <option value="csv">csv</option>
          </select>
        </label>

        <label className="source-field">
          <span className="source-field-label">Base Directory</span>
          <input
            type="text"
            className="ui-input source-control source-code-input"
            defaultValue="./input"
          />
          <span className="source-field-help">输入根目录</span>
        </label>

        <label className="source-field">
          <span className="source-field-label">File Pattern</span>
          <input
            type="text"
            className="ui-input source-control source-code-input"
            defaultValue=".*\\.(txt|md|pdf)$"
          />
          <span className="source-field-help">正则匹配文件名</span>
        </label>

        <label className="source-field">
          <span className="source-field-label">编码</span>
          <select className="source-select source-control" defaultValue="utf-8">
            <option value="utf-8">utf-8</option>
            <option value="utf-16">utf-16</option>
            <option value="gbk">gbk</option>
          </select>
        </label>

        <label className="source-field">
          <span className="source-field-label">Source Column</span>
          <input
            type="text"
            className="ui-input source-control"
            defaultValue="text"
          />
          <span className="source-field-help">CSV / JSON 的文本字段</span>
        </label>
      </div>

      <div className="source-section-footer">
        <button type="button" className="wizard-ghost-button">
          取消
        </button>
        <button type="button" className="ui-button button-primary">
          保存配置
        </button>
      </div>
    </Card>
  );
}

type ChunkTabProps = {
  chunkSize: number;
  chunkOverlap: number;
  onChunkSizeChange: (value: number) => void;
  onChunkOverlapChange: (value: number) => void;
};

function ChunkTab({
  chunkSize,
  chunkOverlap,
  onChunkSizeChange,
  onChunkOverlapChange,
}: ChunkTabProps) {
  return (
    <div className="source-chunk-grid">
      <Card title="分片参数">
        <p className="card-description">
          将文档切分为文本单元（text units）。
        </p>

        <div className="stack-lg">
          <RangeField
            label="chunk_size"
            value={chunkSize}
            min={400}
            max={2400}
            step={50}
            help="单个文本单元的最大 token 数（默认 1200）"
            onChange={onChunkSizeChange}
          />

          <RangeField
            label="chunk_overlap"
            value={chunkOverlap}
            min={0}
            max={400}
            step={10}
            help="相邻 chunk 之间重叠的 token 数（默认 100）"
            onChange={onChunkOverlapChange}
          />

          <label className="source-field">
            <span className="source-field-label">分片策略</span>
            <select className="source-select source-control" defaultValue="tokens">
              <option value="tokens">tokens（按 tokenizer 切分，推荐）</option>
              <option value="sentence">sentence（按句切分）</option>
              <option value="paragraph">paragraph（按段切分）</option>
            </select>
          </label>

          <label className="source-field">
            <span className="source-field-label">Encoding Model</span>
            <select className="source-select source-control" defaultValue="cl100k_base">
              <option value="cl100k_base">cl100k_base</option>
              <option value="o200k_base">o200k_base</option>
            </select>
          </label>
        </div>
      </Card>

      <Card title="预览">
        <p className="card-description">基于当前参数的示例切片</p>

        <div className="source-preview-list">
          {previewChunks.map((item) => (
            <div
              key={item.id}
              className={`source-preview-item source-preview-item-${item.tone}`}
            >
              <strong>{item.title}</strong>
              <span>{item.body}</span>
            </div>
          ))}
        </div>

        <div className="source-estimate-card">
          <div className="source-estimate-header">
            <span className="source-estimate-icon">i</span>
            <strong>共计估算</strong>
          </div>
          <p>
            当前参数下，约生成 <strong>1,184</strong> 个 chunks，估算{" "}
            <strong>~2.1M</strong> tokens。
          </p>
        </div>
      </Card>
    </div>
  );
}

function VectorTab() {
  return (
    <Card>
      <div className="source-vector-grid">
        <label className="source-field">
          <span className="source-field-label">向量模型</span>
          <select
            className="source-select source-control"
            defaultValue="text-embedding-3-small"
          >
            <option value="text-embedding-3-small">
              text-embedding-3-small（1536 维）
            </option>
            <option value="text-embedding-3-large">
              text-embedding-3-large（3072 维）
            </option>
          </select>
        </label>

        <label className="source-field">
          <span className="source-field-label">向量库</span>
          <select className="source-select source-control" defaultValue="lancedb">
            <option value="lancedb">LanceDB（默认本地）</option>
            <option value="azure-ai-search">Azure AI Search</option>
            <option value="weaviate">Weaviate</option>
          </select>
        </label>

        <label className="source-field">
          <span className="source-field-label">Embedding Batch Size</span>
          <input type="number" className="ui-input source-control" defaultValue="16" />
        </label>

        <label className="source-field">
          <span className="source-field-label">并发数</span>
          <input type="number" className="ui-input source-control" defaultValue="8" />
        </label>
      </div>

      <div className="source-vector-footer">
        <div className="source-connection-state">
          <span className="source-connection-dot" />
          <span>
            连接测试通过 · <strong>lancedb://./output/lancedb</strong>
          </span>
        </div>

        <button type="button" className="graph-header-button">
          <FlaskIcon />
          测试连接
        </button>
      </div>
    </Card>
  );
}

type RangeFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  help: string;
  onChange: (value: number) => void;
};

function RangeField({
  label,
  value,
  min,
  max,
  step,
  help,
  onChange,
}: RangeFieldProps) {
  return (
    <div className="source-field">
      <span className="source-field-label">{label}</span>
      <div className="source-slider-row">
        <input
          type="range"
          className="source-range"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <input
          type="number"
          className="ui-input source-number-input"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </div>
      <span className="source-field-help">{help}</span>
    </div>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3.75h7l4.25 4.25V20a1.25 1.25 0 0 1-1.25 1.25h-10.5A1.25 1.25 0 0 1 5.25 20V5A1.25 1.25 0 0 1 6.5 3.75Z" />
      <path d="M14 3.75V8h4.25" />
    </svg>
  );
}

function ReaderIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5.75v5.5" />
      <path d="M16 5.75v5.5" />
      <path d="M5.75 9.5h12.5" />
      <path d="M8 14.25c0 2.5 1.75 4 4 4s4-1.5 4-4" />
      <path d="M10.25 18.25v2" />
      <path d="M13.75 18.25v2" />
    </svg>
  );
}

function ScissorsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m14.5 5.75-8.75 12.5" />
      <path d="m5.75 5.75 8.75 12.5" />
      <circle cx="18" cy="7.25" r="2.25" />
      <circle cx="18" cy="16.75" r="2.25" />
    </svg>
  );
}

function DatabaseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <ellipse cx="12" cy="6.5" rx="6.25" ry="2.75" />
      <path d="M5.75 6.5v4.75c0 1.52 2.8 2.75 6.25 2.75s6.25-1.23 6.25-2.75V6.5" />
      <path d="M5.75 11.25V16c0 1.52 2.8 2.75 6.25 2.75s6.25-1.23 6.25-2.75v-4.75" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.25" />
      <path d="m16 16 3.75 3.75" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.5 18.25h8a4.25 4.25 0 1 0-.74-8.43 5.25 5.25 0 0 0-10.18 1.8A3.5 3.5 0 0 0 7.5 18.25Z" />
      <path d="M12 14.25V8.75" />
      <path d="m9.75 11 2.25-2.25L14.25 11" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 7.5V4.75h-2.75" />
      <path d="M18.25 11a6.25 6.25 0 1 0 1.1 3.56" />
      <path d="M19 4.75 15.5 8.25" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.75 12s3.4-5.5 9.25-5.5 9.25 5.5 9.25 5.5-3.4 5.5-9.25 5.5S2.75 12 2.75 12Z" />
      <circle cx="12" cy="12" r="2.75" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.75 7.25h14.5" />
      <path d="M9.25 3.75h5.5" />
      <path d="M7.25 7.25 8 19a1.25 1.25 0 0 0 1.25 1.17h5.5A1.25 1.25 0 0 0 16 19l.75-11.75" />
      <path d="M10 10.5v6" />
      <path d="M14 10.5v6" />
    </svg>
  );
}

function FlaskIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 3.75h4" />
      <path d="M11 3.75v5.75l-4.75 7.2A2 2 0 0 0 7.92 19.75h8.16a2 2 0 0 0 1.67-3.05L13 9.5V3.75" />
      <path d="M8.75 14.25h6.5" />
    </svg>
  );
}
