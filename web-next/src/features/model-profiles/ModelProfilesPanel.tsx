import { useEffect, useState } from "react";

import { useRepositories } from "../../app/providers/RepositoryProvider";
import type { ModelProfileResponse } from "../../shared/types/api";
import { Card } from "../../shared/ui/Card";

export function ModelProfilesPanel() {
  const { settingsRepository } = useRepositories();
  const [profiles, setProfiles] = useState<ModelProfileResponse[]>([]);

  useEffect(() => {
    let alive = true;

    void settingsRepository.listModelProfiles().then((items) => {
      if (alive) {
        setProfiles(items);
      }
    });

    return () => {
      alive = false;
    };
  }, [settingsRepository]);

  return (
    <Card title="模型档案">
      <div className="stack-sm">
        {profiles.map((profile) => (
          <div key={profile.id} className="profile-card">
            <div className="profile-header">
              <div>
                <strong>{profile.name}</strong>
                <div className="table-secondary">{profile.model_name}</div>
              </div>
              {profile.is_default ? (
                <span className="status-pill success">默认</span>
              ) : null}
            </div>
            <div className="profile-meta">
              <span>{profile.provider}</span>
              <span>{profile.base_url}</span>
              <span>{profile.has_api_key ? "API Key 已配置" : "本地模式"}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
