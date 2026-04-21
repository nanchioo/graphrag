import type {
  ModelProfileResponse,
  SystemConfigPayload,
} from "../../shared/types/api";

export const mockSystemConfig: SystemConfigPayload = {
  projects_root: "D:/Software/Project/graphrag/data/projects",
  upload_root: "D:/Software/Project/graphrag/data/uploads",
  default_model_profile_id: "deepseek-chat-default",
  llm_provider: "Azure OpenAI",
  llm_model: "gpt-4o",
  api_base:
    "https://example-azure.openai.azure.com/openai/deployments/gpt-4o",
  deployment: "gpt-4o-prod",
  api_version: "2024-10-21",
  concurrency: 6,
  rate_limit_per_minute: 240,
  max_retries: 3,
  enable_llm_cache: true,
};

export const mockModelProfiles: ModelProfileResponse[] = [
  {
    id: "deepseek-chat-default",
    provider: "openai",
    name: "DeepSeek Chat",
    base_url: "https://api.deepseek.com/v1",
    model_name: "deepseek-chat",
    is_default: true,
    has_api_key: true,
  },
  {
    id: "gpt-4o-azure",
    provider: "azure",
    name: "Azure GPT-4o",
    base_url: "https://example-azure.openai.azure.com/openai/deployments/gpt-4o",
    model_name: "gpt-4o",
    is_default: false,
    has_api_key: true,
    deployment: "gpt-4o-prod",
    api_version: "2024-10-21",
  },
  {
    id: "qwen-local",
    provider: "ollama",
    name: "Qwen 2.5 Instruct",
    base_url: "http://127.0.0.1:11434",
    model_name: "qwen2.5:14b",
    is_default: false,
    has_api_key: false,
  },
];
