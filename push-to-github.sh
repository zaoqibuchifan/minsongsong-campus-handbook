#!/usr/bin/env bash
# ============================================================
# 民小松 · 推送到 GitHub
# 用法：bash push-to-github.sh
# 说明：仓库已在 GitHub 上创建，本地已提交，仅需推送。
# ============================================================

set -e
cd "$(dirname "$0")"

REPO="https://github.com/zaoqibuchifan/minsongsong-campus-handbook.git"

echo "==> 1/4 检查远程仓库"
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO"
git remote -v

echo
echo "==> 2/4 本机 GitHub 访问诊断"
if git ls-remote origin HEAD >/dev/null 2>&1; then
  echo "    ✓ 可以访问 GitHub，开始推送"
else
  echo "    ✗ 当前无法连接 GitHub（网络被拦或代理不可用）"
  echo "      请检查：代理是否开启、能否打开 https://github.com"
  exit 1
fi

echo
echo "==> 3/4 推送"
# Windows 下 schannel 无法访问证书吊销服务器时，需要关闭吊销检查
git -c http.schannelCheckRevoke=false push -u origin main

echo
echo "==> 4/4 完成"
echo "    仓库地址：$REPO"
git log --oneline -3
