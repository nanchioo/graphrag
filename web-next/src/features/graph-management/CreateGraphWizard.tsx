import { useMemo, useState } from "react";

type CreateGraphWizardProps = {
  open: boolean;
  onClose: () => void;
};

type IndexMethod = "Standard" | "FastGraphRAG";
type SourceType =
  | "本地文件"
  | "Azure Blob"
  | "Amazon S3"
  | "CosmosDB"
  | "使用已有数据源";

type EntityType =
  | "PERSON"
  | "ORGANIZATION"
  | "EVENT"
  | "CONCEPT"
  | "LOCATION"
  | "PRODUCT"
  | "DATE"
  | "OTHER";

const stepLabels = ["基础信息", "数据源", "索引参数", "模型 & 确认"];
const sourceTypes: SourceType[] = [
  "本地文件",
  "Azure Blob",
  "Amazon S3",
  "CosmosDB",
  "使用已有数据源",
];
const entityTypes: EntityType[] = [
  "PERSON",
  "ORGANIZATION",
  "EVENT",
  "CONCEPT",
  "LOCATION",
  "PRODUCT",
  "DATE",
  "OTHER",
];

function GraphIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="4" cy="8" r="1.5" />
      <circle cx="12" cy="4" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <path d="M5.2 7.2 10.8 4.8M5.2 8.8l5.6 2.4" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2.5 5.2h3l1.2 1.3H13a1.5 1.5 0 0 1 1.5 1.5v3.5A1.5 1.5 0 0 1 13 13H3a1.5 1.5 0 0 1-1.5-1.5V6.7A1.5 1.5 0 0 1 3 5.2Z" />
    </svg>
  );
}

function CloudIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M5.2 12.5h6a2.4 2.4 0 0 0 .4-4.8 3.3 3.3 0 0 0-6.2-1.2A2.5 2.5 0 0 0 5.2 12.5Z" />
    </svg>
  );
}

function DatabaseIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <ellipse cx="8" cy="4" rx="4.5" ry="2" />
      <path d="M3.5 4v4c0 1.1 2 2 4.5 2s4.5-.9 4.5-2V4" />
      <path d="M3.5 8v4c0 1.1 2 2 4.5 2s4.5-.9 4.5-2V8" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M6.4 9.6 4.8 11.2a2 2 0 0 1-2.8-2.8L3.6 6.8" />
      <path d="M9.6 6.4 11.2 4.8A2 2 0 0 1 14 7.6l-1.6 1.6" />
      <path d="M5.8 10.2 10.2 5.8" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 4 12 12M12 4 4 12" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="m3.5 8.2 2.5 2.6L12.5 4.8" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M10 3.5 5.5 8 10 12.5" />
    </svg>
  );
}

function stepStatus(stepIndex: number, currentStep: number) {
  if (stepIndex < currentStep) {
    return "done";
  }

  if (stepIndex === currentStep) {
    return "current";
  }

  return "upcoming";
}

function sourceIcon(type: SourceType) {
  if (type === "本地文件") {
    return <FolderIcon />;
  }

  if (type === "CosmosDB") {
    return <DatabaseIcon />;
  }

  if (type === "使用已有数据源") {
    return <LinkIcon />;
  }

  return <CloudIcon />;
}

export function CreateGraphWizard({
  open,
  onClose,
}: CreateGraphWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [graphName, setGraphName] = useState("金融年报 2024");
  const [description, setDescription] = useState("上市公司 A 股年报 2024 年度快照");
  const [indexMethod, setIndexMethod] = useState<IndexMethod>("Standard");
  const [sourceType, setSourceType] = useState<SourceType>("本地文件");
  const [sourcePath, setSourcePath] = useState("/data/inputs");
  const [fileType, setFileType] = useState(".txt, .md, .pdf, .docx");
  const [chunkSize, setChunkSize] = useState(1200);
  const [chunkOverlap, setChunkOverlap] = useState(100);
  const [maxGleanings, setMaxGleanings] = useState(1);
  const [communityLevel, setCommunityLevel] = useState("3（推荐）");
  const [selectedEntities, setSelectedEntities] = useState<EntityType[]>([
    "PERSON",
    "ORGANIZATION",
    "EVENT",
    "CONCEPT",
  ]);
  const [prompt, setPrompt] = useState("你是一个实体关系抽取器。请从以下文本中抽取……");
  const [llmModel, setLlmModel] = useState("gpt-4.1");
  const [embeddingModel, setEmbeddingModel] = useState("text-embedding-3-small");
  const [vectorStore, setVectorStore] = useState("graphrag-prod");
  const [concurrency, setConcurrency] = useState(16);
  const [autoStart, setAutoStart] = useState(true);

  const canContinue = useMemo(() => {
    if (currentStep === 0) {
      return graphName.trim().length >= 2;
    }

    if (currentStep === 1) {
      return sourcePath.trim().length > 0;
    }

    return true;
  }, [currentStep, graphName, sourcePath]);

  if (!open) {
    return null;
  }

  function toggleEntityType(entityType: EntityType) {
    setSelectedEntities((current) =>
      current.includes(entityType)
        ? current.filter((item) => item !== entityType)
        : [...current, entityType]
    );
  }

  function handleNext() {
    if (currentStep < stepLabels.length - 1) {
      setCurrentStep((value) => value + 1);
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep((value) => value - 1);
    }
  }

  function handleCreate() {
    onClose();
  }

  return (
    <div className="create-graph-modal-backdrop" role="presentation">
      <section
        className="create-graph-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-graph-title"
      >
        <header className="create-graph-modal-header">
          <div className="create-graph-modal-title">
            <span className="create-graph-title-icon">
              <GraphIcon />
            </span>
            <div>
              <h2 id="create-graph-title">新建知识图谱</h2>
              <p>配置数据源与索引参数，创建一个新的 GraphRAG 图谱</p>
            </div>
          </div>

          <button
            type="button"
            className="create-graph-close"
            aria-label="关闭新建知识图谱"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </header>

        <div className="wizard-stepper">
          {stepLabels.map((label, index) => {
            const status = stepStatus(index, currentStep);

            return (
              <div key={label} className="wizard-step">
                <div className={`wizard-step-marker wizard-step-marker-${status}`}>
                  {status === "done" ? <CheckIcon /> : <span>{index + 1}</span>}
                </div>
                <span className={`wizard-step-label wizard-step-label-${status}`}>
                  {label}
                </span>
                {index < stepLabels.length - 1 ? (
                  <span className={`wizard-step-line wizard-step-line-${status}`} />
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="create-graph-modal-body">
          {currentStep === 0 ? (
            <section className="wizard-step-panel">
              <div className="wizard-field">
                <label className="wizard-field-label">
                  图谱名称<span className="wizard-required">*</span>
                </label>
                <input
                  className="ui-input wizard-input"
                  value={graphName}
                  onChange={(event) => setGraphName(event.target.value)}
                  placeholder="例如：金融年报 2024"
                />
                <p className="wizard-field-help">2–40 字符，用于在列表和 API 中识别</p>
              </div>

              <div className="wizard-field">
                <label className="wizard-field-label">描述</label>
                <textarea
                  className="ui-input ui-textarea wizard-textarea"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="例如：上市公司 A 股年报 2024 年度快照"
                />
                <p className="wizard-field-help">可选，用于团队协作时说明图谱用途</p>
              </div>

              <div className="wizard-field">
                <label className="wizard-field-label">
                  索引方法<span className="wizard-required">*</span>
                </label>
                <div className="method-choice-grid">
                  <button
                    type="button"
                    className={
                      indexMethod === "Standard"
                        ? "method-choice-card method-choice-card-active"
                        : "method-choice-card"
                    }
                    onClick={() => setIndexMethod("Standard")}
                  >
                    <div className="method-choice-top">
                      <strong>Standard</strong>
                      {indexMethod === "Standard" ? <CheckIcon /> : null}
                    </div>
                    <span>完整流程：实体抽取 + 社区报告 + 多模式检索</span>
                    <small>适合中大规模文档库</small>
                  </button>

                  <button
                    type="button"
                    className={
                      indexMethod === "FastGraphRAG"
                        ? "method-choice-card method-choice-card-active"
                        : "method-choice-card"
                    }
                    onClick={() => setIndexMethod("FastGraphRAG")}
                  >
                    <div className="method-choice-top">
                      <strong>FastGraphRAG</strong>
                      {indexMethod === "FastGraphRAG" ? <CheckIcon /> : null}
                    </div>
                    <span>更快、Token 消耗更低，但首部聚合较弱</span>
                    <small>适合快速原型或冷启动</small>
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          {currentStep === 1 ? (
            <section className="wizard-step-panel">
              <div className="wizard-field">
                <label className="wizard-field-label">
                  数据源类型<span className="wizard-required">*</span>
                </label>
                <div className="source-type-list">
                  {sourceTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={
                        sourceType === type
                          ? "source-type-chip source-type-chip-active"
                          : "source-type-chip"
                      }
                      onClick={() => setSourceType(type)}
                    >
                      {sourceIcon(type)}
                      <span>{type}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="wizard-two-column">
                <div className="wizard-field">
                  <label className="wizard-field-label">
                    根目录<span className="wizard-required">*</span>
                  </label>
                  <input
                    className="ui-input wizard-input wizard-input-mono"
                    value={sourcePath}
                    onChange={(event) => setSourcePath(event.target.value)}
                  />
                </div>

                <div className="wizard-field">
                  <label className="wizard-field-label">文件类型</label>
                  <select
                    className="wizard-select"
                    value={fileType}
                    onChange={(event) => setFileType(event.target.value)}
                  >
                    <option>.txt, .md, .pdf, .docx</option>
                    <option>.txt, .md</option>
                    <option>.pdf, .docx</option>
                  </select>
                </div>
              </div>

              <article className="wizard-preview-card">
                <div className="wizard-preview-header">
                  <strong>预检</strong>
                  <span className="status-pill success">
                    <span className="status-dot" />
                    <span>通过</span>
                  </span>
                </div>
                <div className="wizard-preview-grid">
                  <span>待索引文档数</span>
                  <strong>412</strong>
                  <span>总大小</span>
                  <strong>1.2 GB</strong>
                  <span>预计 Token 消耗</span>
                  <strong>≈ 3.6M</strong>
                  <span>预计耗时</span>
                  <strong>≈ 32 min</strong>
                </div>
              </article>
            </section>
          ) : null}

          {currentStep === 2 ? (
            <section className="wizard-step-panel">
              <div className="wizard-two-column">
                <div className="wizard-field">
                  <label className="wizard-field-label">Chunk Size</label>
                  <input
                    className="ui-input wizard-input"
                    type="number"
                    value={chunkSize}
                    onChange={(event) => setChunkSize(Number(event.target.value))}
                  />
                  <p className="wizard-field-help">单位 Token，建议 800–1500</p>
                </div>

                <div className="wizard-field">
                  <label className="wizard-field-label">Chunk Overlap</label>
                  <input
                    className="ui-input wizard-input"
                    type="number"
                    value={chunkOverlap}
                    onChange={(event) => setChunkOverlap(Number(event.target.value))}
                  />
                  <p className="wizard-field-help">相邻 chunk 重叠 Token</p>
                </div>
              </div>

              <div className="wizard-two-column">
                <div className="wizard-field">
                  <label className="wizard-field-label">Max Gleanings</label>
                  <input
                    className="ui-input wizard-input"
                    type="number"
                    value={maxGleanings}
                    onChange={(event) => setMaxGleanings(Number(event.target.value))}
                  />
                  <p className="wizard-field-help">每个 chunk 最多追问次数</p>
                </div>

                <div className="wizard-field">
                  <label className="wizard-field-label">社区层级</label>
                  <select
                    className="wizard-select"
                    value={communityLevel}
                    onChange={(event) => setCommunityLevel(event.target.value)}
                  >
                    <option>1</option>
                    <option>2</option>
                    <option>3（推荐）</option>
                    <option>4</option>
                  </select>
                </div>
              </div>

              <div className="wizard-field">
                <label className="wizard-field-label">实体类型</label>
                <div className="entity-chip-list">
                  {entityTypes.map((entityType) => {
                    const active = selectedEntities.includes(entityType);

                    return (
                      <button
                        key={entityType}
                        type="button"
                        className={
                          active ? "entity-chip entity-chip-active" : "entity-chip"
                        }
                        onClick={() => toggleEntityType(entityType)}
                      >
                        {active ? <CheckIcon /> : null}
                        <span>{entityType}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="wizard-field-help">
                  索引时要抽取的实体类型，也可在索引后追加
                </p>
              </div>

              <div className="wizard-field">
                <label className="wizard-field-label">自定义抽取 Prompt</label>
                <textarea
                  className="ui-input ui-textarea wizard-textarea wizard-prompt"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                />
                <p className="wizard-field-help">留空使用默认模板</p>
              </div>
            </section>
          ) : null}

          {currentStep === 3 ? (
            <section className="wizard-step-panel">
              <div className="wizard-two-column">
                <div className="wizard-field">
                  <label className="wizard-field-label">
                    LLM 模型<span className="wizard-required">*</span>
                  </label>
                  <select
                    className="wizard-select"
                    value={llmModel}
                    onChange={(event) => setLlmModel(event.target.value)}
                  >
                    <option>gpt-4.1</option>
                    <option>gpt-4o</option>
                    <option>deepseek-chat</option>
                  </select>
                </div>

                <div className="wizard-field">
                  <label className="wizard-field-label">
                    Embedding 模型<span className="wizard-required">*</span>
                  </label>
                  <select
                    className="wizard-select"
                    value={embeddingModel}
                    onChange={(event) => setEmbeddingModel(event.target.value)}
                  >
                    <option>text-embedding-3-small</option>
                    <option>text-embedding-3-large</option>
                    <option>bge-m3</option>
                  </select>
                </div>
              </div>

              <div className="wizard-two-column">
                <div className="wizard-field">
                  <label className="wizard-field-label">
                    向量库<span className="wizard-required">*</span>
                  </label>
                  <select
                    className="wizard-select"
                    value={vectorStore}
                    onChange={(event) => setVectorStore(event.target.value)}
                  >
                    <option>graphrag-prod</option>
                    <option>weaviate-main</option>
                    <option>local-chroma</option>
                  </select>
                </div>

                <div className="wizard-field">
                  <label className="wizard-field-label">并发数</label>
                  <input
                    className="ui-input wizard-input"
                    type="number"
                    value={concurrency}
                    onChange={(event) => setConcurrency(Number(event.target.value))}
                  />
                </div>
              </div>

              <article className="wizard-summary-block">
                <div className="wizard-toggle-row">
                  <div>
                    <strong>创建后</strong>
                    <p>自动启动索引任务</p>
                    <small>关闭则先创建空图谱，稍后手动触发</small>
                  </div>
                  <button
                    type="button"
                    className={autoStart ? "wizard-toggle wizard-toggle-on" : "wizard-toggle"}
                    aria-pressed={autoStart}
                    onClick={() => setAutoStart((value) => !value)}
                  >
                    <span className="wizard-toggle-thumb" />
                  </button>
                </div>
              </article>

              <article className="wizard-summary-card">
                <div className="wizard-summary-header">
                  <span className="wizard-summary-icon">i</span>
                  <strong>创建摘要</strong>
                </div>
                <div className="wizard-summary-list">
                  <span>{graphName}</span>
                  <p>
                    {indexMethod} · {selectedEntities.length} 种实体类型 · 使用 {llmModel} +{" "}
                    {embeddingModel}
                  </p>
                  <p>
                    {sourceType} · {sourcePath} · {vectorStore} · 并发 {concurrency}
                  </p>
                </div>
              </article>
            </section>
          ) : null}
        </div>

        <footer className="create-graph-modal-footer">
          <span className="wizard-step-count">步骤 {currentStep + 1} / 4</span>

          <div className="wizard-footer-actions">
            <button type="button" className="wizard-ghost-button" onClick={onClose}>
              取消
            </button>

            {currentStep > 0 ? (
              <button type="button" className="wizard-secondary-button" onClick={handleBack}>
                <BackIcon />
                <span>上一步</span>
              </button>
            ) : null}

            {currentStep < stepLabels.length - 1 ? (
              <button
                type="button"
                className="wizard-primary-button"
                onClick={handleNext}
                disabled={!canContinue}
              >
                <span>下一步</span>
                <span>›</span>
              </button>
            ) : (
              <button type="button" className="wizard-primary-button" onClick={handleCreate}>
                <CheckIcon />
                <span>{autoStart ? "创建并启动索引" : "创建图谱"}</span>
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}
