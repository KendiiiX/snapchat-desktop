#!/bin/bash
set -e

INSTALL_DIR="/opt/Snapchat"

if [ -f "${INSTALL_DIR}/chrome-sandbox" ]; then
  chown root:root "${INSTALL_DIR}/chrome-sandbox" || true
  chmod 4755 "${INSTALL_DIR}/chrome-sandbox" || true
fi

if [ -x "${INSTALL_DIR}/snapchat-desktop" ]; then
  ln -sf "${INSTALL_DIR}/snapchat-desktop" /usr/bin/snapchat-desktop || true
fi

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database -q /usr/share/applications || true
fi
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -f -t /usr/share/icons/hicolor >/dev/null 2>&1 || true
fi
