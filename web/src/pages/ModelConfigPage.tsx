import {
  Button,
  Card,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Typography,
  message,
} from "antd";
import { useEffect, useState } from "react";

import {
  createModelProfile,
  deleteModelProfile,
  getSystemConfig,
  listModelProfiles,
  updateModelProfile,
  updateSystemConfig,
} from "../api/client";
import { ModelProfileForm } from "../components/ModelProfileForm";
import type {
  ModelProfileResponse,
  ModelProfileUpdateRequest,
  SystemConfigPayload,
} from "../types";

export function ModelConfigPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [profiles, setProfiles] = useState<ModelProfileResponse[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfigPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [systemSaving, setSystemSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingProfile, setEditingProfile] = useState<ModelProfileResponse | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [systemForm] = Form.useForm<SystemConfigPayload>();

  async function loadPageData() {
    try {
      setLoading(true);
      const [configPayload, profilePayload] = await Promise.all([
        getSystemConfig(),
        listModelProfiles(),
      ]);
      setSystemConfig(configPayload);
      setProfiles(profilePayload.items);
      systemForm.setFieldsValue(configPayload);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "配置加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSystem(values: SystemConfigPayload) {
    try {
      setSystemSaving(true);
      const saved = await updateSystemConfig(values);
      setSystemConfig(saved);
      messageApi.success("系统配置已保存");
      await loadPageData();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "系统配置保存失败");
    } finally {
      setSystemSaving(false);
    }
  }

  async function handleSubmitProfile(values: ModelProfileUpdateRequest) {
    try {
      setModalLoading(true);
      if (modalMode === "create") {
        await createModelProfile({
          provider: values.provider ?? "openai",
          name: values.name ?? "",
          base_url: values.base_url ?? "",
          api_key: values.api_key,
          model_name: values.model_name ?? "",
          embedding_model_name: values.embedding_model_name,
          api_version: values.api_version,
          is_default: values.is_default ?? false,
        });
        messageApi.success("模型配置已创建");
      } else if (editingProfile) {
        await updateModelProfile(editingProfile.id, values);
        messageApi.success("模型配置已更新");
      }

      setModalOpen(false);
      setEditingProfile(null);
      await loadPageData();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "模型配置保存失败");
    } finally {
      setModalLoading(false);
    }
  }

  async function handleDeleteProfile(profileId: string) {
    try {
      await deleteModelProfile(profileId);
      messageApi.success("模型配置已删除");
      await loadPageData();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "模型配置删除失败");
    }
  }

  async function handleSetDefault(profile: ModelProfileResponse) {
    try {
      await updateModelProfile(profile.id, { is_default: true });
      messageApi.success("默认模型已更新");
      await loadPageData();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "默认模型更新失败");
    }
  }

  useEffect(() => {
    void loadPageData();
  }, []);

  return (
    <div className="page-stack">
      {contextHolder}
      <div className="page-hero">
        <div>
          <Typography.Title level={3}>模型配置</Typography.Title>
          <Typography.Paragraph className="muted-text">
            统一管理 OpenAI、Azure OpenAI 和 Ollama 配置，并维护图谱项目默认路径。
          </Typography.Paragraph>
        </div>
        <Button
          type="primary"
          onClick={() => {
            setModalMode("create");
            setEditingProfile(null);
            setModalOpen(true);
          }}
        >
          新增模型
        </Button>
      </div>

      <Card className="surface-card" title="系统路径配置" loading={loading}>
        <Form
          form={systemForm}
          layout="vertical"
          onFinish={(values) => void handleSaveSystem(values)}
        >
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Form.Item<SystemConfigPayload>
              label="图谱项目根目录"
              name="projects_root"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item<SystemConfigPayload>
              label="上传根目录"
              name="upload_root"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item<SystemConfigPayload> label="默认模型配置" name="default_model_profile_id">
              <Select
                allowClear
                options={profiles.map((profile) => ({
                  label: `${profile.name} (${profile.provider})`,
                  value: profile.id,
                }))}
              />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={systemSaving}>
              保存系统配置
            </Button>
          </Space>
        </Form>
      </Card>

      <Card className="surface-card" title="模型列表" loading={loading}>
        <Table
          rowKey="id"
          dataSource={profiles}
          pagination={false}
          locale={{ emptyText: "还没有模型配置" }}
          columns={[
            {
              title: "名称",
              dataIndex: "name",
              key: "name",
              render: (_, record: ModelProfileResponse) => (
                <div>
                  <Typography.Text strong>{record.name}</Typography.Text>
                  <div className="muted-text">
                    {record.provider} · {record.model_name}
                  </div>
                </div>
              ),
            },
            {
              title: "Base URL",
              dataIndex: "base_url",
              key: "base_url",
            },
            {
              title: "API Key",
              dataIndex: "api_key_masked",
              key: "api_key_masked",
              render: (value: string | null, record: ModelProfileResponse) =>
                record.has_api_key ? value : "未设置",
            },
            {
              title: "默认",
              dataIndex: "is_default",
              key: "is_default",
              width: 100,
              render: (value: boolean) => <Switch checked={value} disabled />,
            },
            {
              title: "操作",
              key: "actions",
              width: 220,
              render: (_, record: ModelProfileResponse) => (
                <Space size="small">
                  <Button
                    size="small"
                    onClick={() => {
                      setModalMode("edit");
                      setEditingProfile(record);
                      setModalOpen(true);
                    }}
                  >
                    编辑
                  </Button>
                  <Button size="small" onClick={() => void handleSetDefault(record)}>
                    设为默认
                  </Button>
                  <Popconfirm
                    title="确认删除这个模型配置?"
                    onConfirm={() => void handleDeleteProfile(record.id)}
                  >
                    <Button size="small" danger>
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <ModelProfileForm
        open={modalOpen}
        loading={modalLoading}
        mode={modalMode}
        initialValues={editingProfile}
        onCancel={() => {
          setModalOpen(false);
          setEditingProfile(null);
        }}
        onSubmit={async (values) => handleSubmitProfile(values)}
      />
    </div>
  );
}
