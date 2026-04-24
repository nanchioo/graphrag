import { Button, Card, Space, Typography, Upload, message } from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import { useState } from "react";

import { uploadGraphFiles } from "../api/client";

interface UploadPanelProps {
  graphId?: string;
  loading?: boolean;
  existingFileNames?: string[];
  onUploaded: () => Promise<void> | void;
}

function normalizeFileName(name: string) {
  return name.trim().toLocaleLowerCase();
}

export function UploadPanel({
  graphId,
  loading = false,
  existingFileNames = [],
  onUploaded,
}: UploadPanelProps) {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const existingFileNameSet = new Set(existingFileNames.map(normalizeFileName));

  async function handleUpload() {
    if (!graphId || fileList.length === 0) {
      return;
    }

    const files = fileList
      .map((file) => file.originFileObj)
      .filter((file): file is NonNullable<typeof file> => file !== undefined);

    if (files.length === 0) {
      message.warning("请先选择至少一个文件。");
      return;
    }

    const pendingFileNameSet = new Set<string>();
    for (const file of files) {
      const normalizedName = normalizeFileName(file.name);
      if (existingFileNameSet.has(normalizedName)) {
        message.warning(`${file.name} 该文件已存在，请先删除后再重新上传。`);
        return;
      }
      if (pendingFileNameSet.has(normalizedName)) {
        message.warning(`${file.name} 待上传列表中已存在同名文件。`);
        return;
      }
      pendingFileNameSet.add(normalizedName);
    }

    try {
      setUploading(true);
      await uploadGraphFiles(graphId, files);
      message.success("源文件已上传。");
      setFileList([]);
      await onUploaded();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "文件上传失败。");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card className="surface-card analysis-card analysis-upload-panel" title="源文件上传">
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Upload.Dragger
          multiple
          fileList={fileList}
          disabled={!graphId || loading || uploading}
          beforeUpload={(file) => {
            const normalizedName = normalizeFileName(file.name);
            if (existingFileNameSet.has(normalizedName)) {
              message.warning(`${file.name} 该文件已存在，请先删除后再重新上传。`);
              return Upload.LIST_IGNORE;
            }

            setFileList((current) => {
              if (
                current.some(
                  (item) =>
                    item.uid !== file.uid && normalizeFileName(item.name) === normalizedName,
                )
              ) {
                message.warning(`${file.name} 待上传列表中已存在同名文件。`);
                return current;
              }

              return [
                ...current.filter((item) => item.uid !== file.uid),
                {
                  uid: file.uid,
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  status: "done",
                  originFileObj: file,
                },
              ];
            });
            return Upload.LIST_IGNORE;
          }}
          onRemove={(file) => {
            setFileList((current) => current.filter((item) => item.uid !== file.uid));
          }}
        >
          <Typography.Text strong>将源文件拖拽到这里，或点击选择文件。</Typography.Text>
          <div className="analysis-upload-hint">
            支持 txt、md、markdown、json、jsonl、csv、pdf，上传后将用于构建图谱。
          </div>
        </Upload.Dragger>
        <Space className="inline-actions">
          <Button
            type="primary"
            onClick={() => void handleUpload()}
            loading={uploading}
            disabled={!graphId || fileList.length === 0}
          >
            上传到当前图谱
          </Button>
          <Typography.Text className="muted-text">
            当前待上传：{fileList.length} 个文件
          </Typography.Text>
        </Space>
      </Space>
    </Card>
  );
}
