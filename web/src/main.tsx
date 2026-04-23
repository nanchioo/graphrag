import React from "react";
import ReactDOM from "react-dom/client";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import "antd/dist/reset.css";

import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: "#2563eb",
          colorBgContainer: "#ffffff",
          colorBgElevated: "#ffffff",
          colorBgLayout: "#f7f9fc",
          colorBorder: "#d9e2ef",
          colorBorderSecondary: "#edf1f7",
          colorText: "#172033",
          colorTextSecondary: "#5b667a",
          colorTextTertiary: "#8792a6",
          fontFamily:
            "'Fira Sans', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          borderRadius: 8,
          controlHeight: 38,
          fontSize: 14,
        },
        components: {
          Card: {
            colorBgContainer: "#ffffff",
            borderRadiusLG: 8,
          },
          Table: {
            headerBg: "#f4f7fb",
            rowHoverBg: "#eef6ff",
          },
          Input: {
            colorBgContainer: "#fbfcfe",
          },
          Select: {
            colorBgContainer: "#fbfcfe",
          },
          Button: {
            primaryShadow: "0 8px 18px rgba(37, 99, 235, 0.18)",
          },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>,
);
