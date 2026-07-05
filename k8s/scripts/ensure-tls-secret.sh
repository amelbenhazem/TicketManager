#!/usr/bin/env bash
# Crée ou met à jour le secret TLS ticketmanager-tls (idempotent).
# Variables : K8S_APP_HOST, K8S_API_HOST, K8S_WORKER_PUBLIC_IP, FORCE_TLS_REGEN (optionnel)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
NAMESPACE="${K8S_NAMESPACE:-ticketmanager}"
SECRET_NAME="${K8S_TLS_SECRET:-ticketmanager-tls}"
OUT_DIR="${TLS_CERT_DIR:-/tmp/ticketmanager-tls}"

if [[ -n "${KUBECONFIG:-}" ]] && kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" &>/dev/null; then
  if [[ "${FORCE_TLS_REGEN:-}" != "1" ]]; then
    echo "==> Secret TLS ${SECRET_NAME} déjà présent (FORCE_TLS_REGEN=1 pour regénérer)"
    exit 0
  fi
  echo "==> Regénération TLS (FORCE_TLS_REGEN=1)"
fi

chmod +x "$ROOT/k8s/scripts/generate-tls-cert.sh"
"$ROOT/k8s/scripts/generate-tls-cert.sh" "$OUT_DIR"

echo "==> Secret TLS ${SECRET_NAME} dans ${NAMESPACE}"
kubectl create secret tls "$SECRET_NAME" \
  -n "$NAMESPACE" \
  --cert="${OUT_DIR}/tls.crt" \
  --key="${OUT_DIR}/tls.key" \
  --dry-run=client -o yaml | kubectl apply -f -
