import { Form, Input, Modal, Select, Switch, Typography } from "antd";
import { useEffect } from "react";

import type {
  ModelProfileCreateRequest,
  ModelProfileResponse,
  ModelProfileUpdateRequest,
} from "../types";

type ModelProfileFormValues = ModelProfileCreateRequest & ModelProfileUpdateRequest;

interface ModelProfileFormProps {
  open: boolean;
  loading?: boolean;
  mode: "create" | "edit";
  initialValues?: ModelProfileResponse | null;
  onCancel: () => void;
  onSubmit: (values: ModelProfileFormValues) => Promise<void> | void;
}

const defaultValues: ModelProfileFormValues = {
  provider: "openai",
  name: "",
  base_url: "",
  api_key: "",
  model_name: "",
  embedding_model_name: "text-embedding-3-small",
  api_version: "",
  is_default: false,
  clear_api_key: false,
};

const presetOptions = [
  {
    label: "通义千问（DashScope）",
    value: "tongyi",
    values: {
      provider: "openai" as const,
      name: "通义千问",
      base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      model_name: "qwen3.6-plus",
      embedding_model_name: "text-embedding-v3",
      api_version: "",
    },
  },
  {
    label: "DeepSeek",
    value: "deepseek",
    values: {
      provider: "openai" as const,
      name: "DeepSeek",
      base_url: "https://api.deepseek.com/v1",
      model_name: "deepseek-chat",
      embedding_model_name: "",
      api_version: "",
    },
  },
  {
    label: "Kimi（Moonshot）",
    value: "kimi",
    values: {
      provider: "openai" as const,
      name: "Kimi",
      base_url: "https://api.moonshot.cn/v1",
      model_name: "kimi-k2.5",
      embedding_model_name: "",
      api_version: "",
    },
  },
  {
    label: "智谱 GLM",
    value: "zhipu",
    values: {
      provider: "openai" as const,
      name: "智谱 GLM",
      base_url: "https://open.bigmodel.cn/api/paas/v4/",
      model_name: "glm-5",
      embedding_model_name: "",
      api_version: "",
    },
  },
  {
    label: "SiliconFlow",
    value: "siliconflow",
    values: {
      provider: "openai" as const,
      name: "SiliconFlow",
      base_url: "https://api.siliconflow.cn/v1",
      model_name: "Qwen/QwQ-32B",
      embedding_model_name: "",
      api_version: "",
    },
  },
];

export function ModelProfileForm({
  open,
  loading = false,
  mode,
  initialValues,
  onCancel,
  onSubmit,
}: ModelProfileFormProps) {
  const [form] = Form.useForm<ModelProfileFormValues>();

  function applyPreset(presetValue: string) {
    const preset = presetOptions.find((item) => item.value === presetValue);
    if (!preset) {
      return;
    }

    const nextEmbeddingModel =
      preset.values.embedding_model_name ||
      form.getFieldValue("embedding_model_name") ||
      defaultValues.embedding_model_name;

    form.setFieldsValue({
      ...preset.values,
      embedding_model_name: nextEmbeddingModel,
      is_default: form.getFieldValue("is_default") ?? false,
      clear_api_key: false,
    });
  }

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        ...defaultValues,
        ...initialValues,
        embedding_model_name:
          initialValues?.embedding_model_name || defaultValues.embedding_model_name,
        api_version: initialValues?.api_version ?? "",
        api_key: "",
        clear_api_key: false,
      });
    } else {
      form.resetFields();
    }
  }, [form, initialValues, open]);

  return (
    <Modal
      open={open}
      title={mode === "create" ? "新增模型配置" : "编辑模型配置"}
      okText={mode === "create" ? "创建" : "保存"}
      cancelText="取消"
      confirmLoading={loading}
      onCancel={onCancel}
      onOk={() => void form.submit()}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={(values) => void onSubmit(values)}>
        <Form.Item label="快捷预设">
          <Select
            allowClear
            placeholder="选择后自动填入推荐配置"
            options={presetOptions.map((preset) => ({
              label: preset.label,
              value: preset.value,
            }))}
            onChange={(value) => {
              if (typeof value === "string") {
                applyPreset(value);
              }
            }}
          />
        </Form.Item>
        <Form.Item<ModelProfileFormValues>
          label="Provider"
          name="provider"
          rules={[{ required: true }]}
        >
          <Select
            options={[
              { label: "OpenAI", value: "openai" },
              { label: "Azure OpenAI", value: "azure" },
              { label: "Ollama", value: "ollama" },
            ]}
          />
        </Form.Item>
        <Form.Item<ModelProfileFormValues>
          label="显示名称"
          name="name"
          rules={[{ required: true }]}
        >
          <Input placeholder="例如: OpenAI Default" />
        </Form.Item>
        <Form.Item<ModelProfileFormValues>
          label="Base URL"
          name="base_url"
          rules={[{ required: true }]}
        >
          <Input placeholder="https://api.openai.com/v1" />
        </Form.Item>
        <Typography.Paragraph className="muted-text" style={{ marginTop: -8 }}>
          支持通义、DeepSeek、Kimi、智谱、SiliconFlow 等 OpenAI 兼容预设。
          Embedding 模型现在会默认预填，你也可以按平台能力手动改成更合适的值。
        </Typography.Paragraph>
        <Form.Item<ModelProfileFormValues> label="API Key" name="api_key">
          <Input.Password
            placeholder={mode === "edit" ? "留空表示不修改" : "输入 API Key"}
          />
        </Form.Item>
        <Form.Item<ModelProfileFormValues>
          label="模型名称"
          name="model_name"
          rules={[{ required: true }]}
        >
          <Input placeholder="gpt-4.1-mini" />
        </Form.Item>
        <Form.Item<ModelProfileFormValues> label="Embedding 模型" name="embedding_model_name">
          <Input placeholder="text-embedding-3-small" />
        </Form.Item>
        <Form.Item<ModelProfileFormValues> label="API Version" name="api_version">
          <Input placeholder="仅 Azure 需要时填写" />
        </Form.Item>
        <Form.Item<ModelProfileFormValues>
          label="设为默认"
          name="is_default"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        {mode === "edit" ? (
          <Form.Item<ModelProfileFormValues>
            label="清空已保存 API Key"
            name="clear_api_key"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        ) : null}
      </Form>
    </Modal>
  );
}
