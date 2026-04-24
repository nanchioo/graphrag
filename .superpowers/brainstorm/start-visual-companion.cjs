const sessionDir = process.argv[2];

if (!sessionDir) {
  console.error("Usage: node start-visual-companion.cjs <session-dir>");
  process.exit(1);
}

process.env.BRAINSTORM_DIR = sessionDir;
process.env.BRAINSTORM_HOST = "127.0.0.1";
process.env.BRAINSTORM_URL_HOST = "localhost";

require("C:/Users/EDY/.codex/superpowers/skills/brainstorming/scripts/server.cjs");
