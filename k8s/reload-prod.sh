#!/usr/bin/env bash
# Recharge la prod K8s : CORS backend + redémarrage des pods (sans rebuild Docker).
# Usage sur vm-gestion :
#   export KUBECONFIG=~/kubernetes/ticketmanager-k8s/kubeconfig/kubeconfig.dc2.json
#   K8S_WORKER_PUBLIC_IP=YOUR_PUBLIC_IP ./k8s/reload-prod.sh
# Option : IMAGE_TAG=latest ou BuildId pour forcer un pull d'image
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
K8S_DIR="$ROOT/k8s"

: "${KUBECONFIG:?KUBECONFIG requis}"
PUBLIC_IP="${K8S_WORKER_PUBLIC_IP:-}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
K8S_REGISTRY="${K8S_REGISTRY:-10.1.1.4:8082}"
NEXUS_REPO="${NEXUS_REPO:-docker-ticketmanager}"
HTTPS_PORT="${K8S_INGRESS_HTTPS_PORT:-30443}"
APP_HOST="${K8S_APP_HOST:-app.ticketmanager.local}"
APP_URL="${K8S_APP_URL:-https://${APP_HOST}:${HTTPS_PORT}}"

export KUBECONFIG

CORS="${APP_URL},http://10.1.3.4:30080,http://10.1.3.5:30080"
if [[ -n "${PUBLIC_IP}" && "${PUBLIC_IP}" != "PUT_WORKER_PIP_HERE" ]]; then
  CORS="${CORS},http://${PUBLIC_IP}:30080"
fi

echo "==> Mise à jour CORS backend"
JWT="$(kubectl get secret backend-secret -n ticketmanager -o jsonpath='{.data.JWT_SECRET}' | base64 -d)"
MONGO="$(kubectl get secret backend-secret -n ticketmanager -o jsonpath='{.data.MONGODB_URI}' | base64 -d)"

kubectl create secret generic backend-secret \
  -n ticketmanager \
  --from-literal=MONGODB_URI="$MONGO" \
  --from-literal=JWT_SECRET="$JWT" \
  --from-literal=JWT_EXPIRES_IN="7d" \
  --from-literal=NODE_ENV="production" \
  --from-literal=PORT="3001" \
  --from-literal=CORS_ORIGIN="$CORS" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "==> Apply manifests (nodeSelector worker PIP)"
kubectl apply -f "$K8S_DIR/frontend-deployment.yaml"
kubectl apply -f "$K8S_DIR/backend-deployment.yaml"
kubectl apply -f "$K8S_DIR/ingress.yaml"

BACKEND_IMAGE="${K8S_REGISTRY}/${NEXUS_REPO}/ticket-backend:${IMAGE_TAG}"
FRONTEND_IMAGE="${K8S_REGISTRY}/${NEXUS_REPO}/ticket-frontend:${IMAGE_TAG}"

echo "==> Images tag ${IMAGE_TAG}"
kubectl set image deployment/ticket-backend -n ticketmanager backend="$BACKEND_IMAGE"
kubectl set image deployment/ticket-frontend -n ticketmanager frontend="$FRONTEND_IMAGE"

echo "==> Rollout restart"
kubectl rollout restart deployment/ticket-backend -n ticketmanager
kubectl rollout restart deployment/ticket-frontend -n ticketmanager
kubectl rollout status deployment/ticket-backend -n ticketmanager --timeout=180s
kubectl rollout status deployment/ticket-frontend -n ticketmanager --timeout=180s

kubectl get pods -n ticketmanager -o wide

echo ""
echo "==> Prod rechargée"
echo "    Frontend HTTPS: ${APP_URL}"
echo "    Backend  HTTPS: https://${K8S_API_HOST:-api.ticketmanager.local}:${HTTPS_PORT}"
echo "    CORS:           ${CORS}"
