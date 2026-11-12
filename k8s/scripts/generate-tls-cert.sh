#!/usr/bin/env bash
# Génère un certificat TLS auto-signé pour app.* et api.* (+ IP publique optionnelle).
# Usage : K8S_APP_HOST=app.ticketmanager.local K8S_API_HOST=api.ticketmanager.local \
#         K8S_WORKER_PUBLIC_IP=YOUR_PUBLIC_IP ./k8s/scripts/generate-tls-cert.sh [out_dir]
set -euo pipefail

APP_HOST="${K8S_APP_HOST:-app.ticketmanager.local}"
API_HOST="${K8S_API_HOST:-api.ticketmanager.local}"
PUBLIC_IP="${K8S_WORKER_PUBLIC_IP:-}"
OUT_DIR="${1:-/tmp/ticketmanager-tls}"

mkdir -p "$OUT_DIR"

SAN="DNS:${APP_HOST},DNS:${API_HOST}"
if [[ -n "$PUBLIC_IP" && "$PUBLIC_IP" != "PUT_WORKER_PIP_HERE" ]]; then
  SAN="${SAN},IP:${PUBLIC_IP}"
fi

openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
  -keyout "${OUT_DIR}/tls.key" \
  -out "${OUT_DIR}/tls.crt" \
  -subj "/CN=${APP_HOST}/O=TicketManager" \
  -addext "subjectAltName=${SAN}"

echo "Certificat généré dans ${OUT_DIR}/"
echo "  CN=${APP_HOST}, SAN=${SAN}"
