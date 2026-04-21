import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";

import { useRepositories } from "../../app/providers/RepositoryProvider";
import type {
  GraphBuildMethod,
  GraphDetailPayload,
  GraphStatusPayload,
  SourceFileItem,
} from "../../shared/types/api";
import { Button } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";
import { EmptyState } from "../../shared/ui/EmptyState";
import { BuildStatusPanel } from "./BuildStatusPanel";

type GraphDetailPanelProps = {
  graphId: string | null;
  onGraphDeleted: (graphId: string) => void;
  onGraphUpdated: (graphId: string) => void;
};

const querySelectionStorageKey = "graphrag:selected-graph";

function formatCount(value?: number) {
  return (value ?? 0).toLocaleString("zh-CN");
}

function formatDate(value?: string | null) {
  return value ?? "—";
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusTone(status?: string | null) {
  if (status === "failed") {
    return "failed";
  }

  if (status === "ready") {
    return "success";
  }

  if (status === "awaiting_upload" || status === "awaiting_build") {
    return "pending";
  }

  return "running";
}

export function GraphDetailPanel({
  graphId,
  onGraphDeleted,
  onGraphUpdated,
}: GraphDetailPanelProps) {
  const navigate = useNavigate();
  const { graphRepository } = useRepositories();
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [graph, setGraph] = useState<GraphDetailPayload | null>(null);
  const [status, setStatus] = useState<GraphStatusPayload | null>(null);
  const [sourceFiles, setSourceFiles] = useState<SourceFileItem[]>([]);
  const [buildMethod, setBuildMethod] = useState<GraphBuildMethod>("standard");
  const [forceRebuild, setForceRebuild] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!graphId) {
      setGraph(null);
      setStatus(null);
      setSourceFiles([]);
      setErrorMessage(null);
      setSuccessMessage(null);
      return;
    }

    let alive = true;
    let timerId: number | undefined;
    const nextGraphId = graphId;

    async function loadGraphData() {
      try {
        const [detail, nextStatus, files] = await Promise.all([
          graphRepository.getGraph(nextGraphId),
          graphRepository.getGraphStatus(nextGraphId),
          graphRepository.listGraphFiles(nextGraphId),
        ]);

        if (!alive) {
          return;
        }

        setGraph(detail);
        setStatus(nextStatus);
        setSourceFiles(files);
        setErrorMessage(null);

        if (nextStatus.status === "building") {
          timerId = window.setTimeout(() => {
            setRefreshToken((current) => current + 1);
          }, 3000);
        }
      } catch (error) {
        if (!alive) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "图谱详情加载失败。");
      }
    }

    void loadGraphData();

    return () => {
      alive = false;
      if (timerId) {
        window.clearTimeout(timerId);
      }
    };
  }, [graphId, graphRepository, refreshToken]);

  function refreshGraphData() {
    setRefreshToken((current) => current + 1);
  }

  async function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    input.value = "";

    if (!graphId || files.length === 0) {
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await graphRepository.uploadGraphFiles(graphId, files);
      setSuccessMessage(`已上传 ${files.length} 个源文件。`);
      refreshGraphData();
      onGraphUpdated(graphId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "源文件上传失败。");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleStartBuild() {
    if (!graphId) {
      return;
    }

    setIsBuilding(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await graphRepository.startGraphBuild(graphId, {
        method: buildMethod,
        force_rebuild: forceRebuild,
      });
      setSuccessMessage("构建任务已启动，状态会自动刷新。");
      refreshGraphData();
      onGraphUpdated(graphId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "构建任务启动失败。");
    } finally {
      setIsBuilding(false);
    }
  }

  async function handleDeleteGraph() {
    if (!graphId) {
      return;
    }

    const shouldDelete = window.confirm(
      `确认删除图谱“${graph?.name ?? graphId}”吗？此操作会移除工作区和已上传文件。`,
    );
    if (!shouldDelete) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await graphRepository.deleteGraph(graphId);
      onGraphDeleted(graphId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "图谱删除失败。");
    } finally {
      setIsDeleting(false);
    }
  }

  function handleGoToQuery() {
    if (!graphId) {
      return;
    }

    window.sessionStorage.setItem(querySelectionStorageKey, graphId);
    navigate("/query");
  }

  if (!graphId) {
    return (
      <EmptyState
        title="未选择图谱"
        description="先从左侧列表中选择一个图谱，再查看详情、上传文件并触发构建。"
      />
    );
  }

  return (
    <div className="stack-lg">
      {errorMessage ? <div className="status-note failed">{errorMessage}</div> : null}
      {successMessage ? <div className="status-note success">{successMessage}</div> : null}

      <Card title={graph?.name ?? "图谱详情"}>
        <div className="graph-detail-stack">
          <div className="graph-detail-header">
            <div className="stack-sm">
              <p className="card-description">{graph?.description ?? "当前图谱暂无描述。"}</p>
              <div className="metric-inline">
                <span className={`status-chip ${getStatusTone(status?.status ?? graph?.status)}`}>
                  {status?.status ?? graph?.status ?? "loading"}
                </span>
                <span>源文件 {status?.source_file_count ?? sourceFiles.length}</span>
                <span>文档 {status?.document_count ?? 0}</span>
                <span>产物 {status?.has_artifacts ? "已生成" : "未生成"}</span>
              </div>
            </div>

            <div className="graph-detail-actions">
              <Button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                disabled={isUploading || isDeleting}
              >
                {isUploading ? "上传中..." : "上传文件"}
              </Button>
              <Button
                type="button"
                className="button-primary"
                onClick={() => void handleStartBuild()}
                disabled={isBuilding || isDeleting || !(status?.has_source_files ?? sourceFiles.length > 0)}
              >
                {isBuilding ? "构建中..." : "开始构建"}
              </Button>
              <Button type="button" onClick={handleGoToQuery} disabled={isDeleting}>
                去查询
              </Button>
              <Button type="button" onClick={handleDeleteGraph} disabled={isDeleting}>
                {isDeleting ? "删除中..." : "删除图谱"}
              </Button>
            </div>
          </div>

          <input
            ref={uploadInputRef}
            type="file"
            multiple
            hidden
            onChange={handleFileSelection}
          />

          <div className="detail-grid">
            <div className="detail-tile">
              <span>实体</span>
              <strong>{formatCount(graph?.entity_count)}</strong>
            </div>
            <div className="detail-tile">
              <span>关系</span>
              <strong>{formatCount(graph?.relation_count)}</strong>
            </div>
            <div className="detail-tile">
              <span>社区</span>
              <strong>{formatCount(graph?.community_count)}</strong>
            </div>
            <div className="detail-tile">
              <span>报告</span>
              <strong>{formatCount(graph?.report_count)}</strong>
            </div>
          </div>

          <div className="two-column-detail">
            <div className="subtle-block">
              <strong>图谱路径</strong>
              <div>{graph?.root_dir ?? "-"}</div>
            </div>
            <div className="subtle-block">
              <strong>模型档案</strong>
              <div>{graph?.model_profile_id ?? "跟随系统默认"}</div>
            </div>
            <div className="subtle-block">
              <strong>创建时间</strong>
              <div>{formatDate(graph?.created_at)}</div>
            </div>
            <div className="subtle-block">
              <strong>最近构建</strong>
              <div>{formatDate(status?.last_build_at ?? graph?.last_build_at)}</div>
            </div>
          </div>
        </div>
      </Card>

      <Card title="源文件与构建">
        <div className="graph-detail-stack">
          <div className="graph-file-toolbar">
            <div className="graph-build-controls">
              <label className="graph-build-field">
                <span>构建方式</span>
                <select
                  className="graph-filter-select"
                  value={buildMethod}
                  onChange={(event) => setBuildMethod(event.target.value as GraphBuildMethod)}
                >
                  <option value="standard">standard</option>
                  <option value="fast">fast</option>
                </select>
              </label>

              <label className="graph-build-checkbox">
                <input
                  type="checkbox"
                  checked={forceRebuild}
                  onChange={(event) => setForceRebuild(event.target.checked)}
                />
                <span>强制重建</span>
              </label>
            </div>

            <Button type="button" onClick={refreshGraphData}>
              刷新详情
            </Button>
          </div>

          {sourceFiles.length === 0 ? (
            <div className="subtle-block graph-empty-copy">
              还没有源文件。先上传 `.txt`、`.md`、`.pdf` 或结构化文档，再开始构建。
            </div>
          ) : (
            <div className="graph-file-list">
              {sourceFiles.map((file) => (
                <article key={file.relative_path} className="graph-file-item">
                  <div className="graph-file-meta">
                    <strong>{file.name}</strong>
                    <span>{file.relative_path}</span>
                  </div>
                  <div className="graph-file-stats">
                    <span>{file.extension}</span>
                    <span>{formatBytes(file.size_bytes)}</span>
                    <span>{formatDate(file.created_at)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="subtle-block">
            <strong>当前产物</strong>
            <div>
              {status?.artifact_paths && status.artifact_paths.length > 0
                ? status.artifact_paths.join(", ")
                : "尚未生成产物。"}
            </div>
          </div>
        </div>
      </Card>

      <BuildStatusPanel status={status} />
    </div>
  );
}
