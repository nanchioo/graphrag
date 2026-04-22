@echo off
cd /d D:\Software\Project\graphrag
"C:\Users\EDY\AppData\Local\Microsoft\WinGet\Links\uv.exe" run uvicorn main:app --host 0.0.0.0 --port 8000 1>"D:\Software\Project\graphrag\.codex-runtime\backend-lan-stdout.log" 2>"D:\Software\Project\graphrag\.codex-runtime\backend-lan-stderr.log"
