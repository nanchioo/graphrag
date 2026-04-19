import { Button, Card, Space, Typography, Upload, message } from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import { useState } from "react";

import { uploadGraphFiles } from "../api/client";

interface UploadPanelProps {
  graphId?: string;
  loading?: boolean;
  onUploaded: () => Promise<void> | void;
}

export function UploadPanel({ graphId, loading = false, onUploaded }: UploadPanelProps) {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  async function handleUpload() {
    if (!graphId || fileList.length === 0) {
      return;
    }

    const files = fileList
      .map((file) => file.originFileObj)
      .filter((file): file is NonNullable<typeof file> => file !== undefined);

    if (files.length === 0) {
      message.warning("请选择要上传的文件");
      return;
    }

    try {
      setUploading(true);
      await uploadGraphFiles(graphId, files);
      message.success("源文件已上传");
      setFileList([]);
      await onUploaded();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "文件上传失败");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card className="surface-card" title="源文件上传">
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Upload.Dragger
          multiple
          fileList={fileList}
          disabled={!graphId || loading || uploading}
          beforeUpload={(file) => {
            setFileList((current) => [
              ...current.filter((item) => item.uid !== file.uid),
              {
                uid: file.uid,
                name: file.name,
                size: file.size,
                type: file.type,
                status: "done",
                originFileObj: file,
              },
            ]);
            return Upload.LIST_IGNORE;
          }}
          onRemove={(file) => {
            setFileList((current) => current.filter((item) => item.uid !== file.uid));
          }}
        >
          <Typography.Text strong>拖拽文件到这里，或点击选择文件</Typography.Text>
          <div className="upload-help">支持 txt、md、markdown、json、jsonl、csv、pdf</div>
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
            当前待上传 {fileList.length} 个文件
          </Typography.Text>
        </Space>
      </Space>
    </Card>
  );
}
