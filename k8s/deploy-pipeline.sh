#!/usr/bin/env bash
# Déploiement K8s invoqué par Azure Pipelines (CD).
# Variables attendues : KUBECONFIG, K8S_REGISTRY, NEXUS_REPO, IMAGE_TAG,
#   NEXUS_USER, NEXUS_PASSWORD, K8S_MONGODB_URI, K8S_CORS_ORIGIN, JWT_SECRET
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
K8S_DIR="$ROOT/k8s"

: "${KUBECONFIG:?KUBECONFIG requis}"
: "${K8S_REGISTRY:?K8S_REGISTRY requis (ex. 10.1.1.4:8082)}"
: "${NEXUS_REPO:?NEXUS_REPO requis}"
: "${IMAGE_TAG:?IMAGE_TAG requis (Build.BuildId ou latest)}"
: "${NEXUS_USER:?NEXUS_USER requis}"
: "${NEXUS_PASSWORD:?NEXUS_PASSWORD requis}"
: "${K8S_MONGODB_URI:?K8S_MONGODB_URI requis}"
: "${K8S_CORS_ORIGIN:?K8S_CORS_ORIGIN requis}"
: "${JWT_SECRET:?JWT_SECRET requis}"

export KUBECONFIG

if [[ ! -f "$KUBECONFIG" ]]; then
  echo "##[error]KUBECONFIG introuvable: $KUBECONFIG" >&2
  exit 1
fi

BACKEND_IMAGE="${K8S_REGISTRY}/${NEXUS_REPO}/ticket-backend:${IMAGE_TAG}"
FRONTEND_IMAGE="${K8S_REGISTRY}/${NEXUS_REPO}/ticket-frontend:${IMAGE_TAG}"

echo "==> kubectl version"
kubectl version --client=true
kubectl cluster-info

echo "==> Namespace et secrets"
kubectl apply -f "$K8S_DIR/namespace.yaml"

kubectl create secret docker-registry nexus-registry \
  -n ticketmanager \
  --docker-server="$K8S_REGISTRY" \
  --docker-username="$NEXUS_USER" \
  --docker-password="$NEXUS_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic backend-secret \
  -n ticketmanager \
  --from-literal=MONGODB_URI="$K8S_MONGODB_URI" \
  --from-literal=JWT_SECRET="$JWT_SECRET" \
  --from-literal=JWT_EXPIRES_IN="${JWT_EXPIRES_IN:-7d}" \
  --from-literal=NODE_ENV="production" \
  --from-literal=PORT="3001" \
  --from-literal=CORS_ORIGIN="$K8S_CORS_ORIGIN" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "==> MongoDB (StatefulSet in-cluster)"
kubectl apply -f "$K8S_DIR/mongodb-service.yaml"
kubectl apply -f "$K8S_DIR/mongodb-statefulset.yaml"

if ! kubectl wait --for=condition=ready pod -l app=mongodb -n ticketmanager --timeout=300s 2>/dev/null; then
  echo "##[warning]PVC MongoDB peut être Pending — si pas de StorageClass, appliquer k8s/mongodb-pv-hostpath.yaml"
  kubectl get pvc -n ticketmanager
  kubectl describe pod -n ticketmanager -l app=mongodb | tail -40
  exit 1
fi

# Ingress HTTPS désactivé — accès HTTP via NodePort 30080/30081 uniquement

echo "==> Manifests (services + deployments)"
kubectl apply -f "$K8S_DIR/backend-service.yaml"
kubectl apply -f "$K8S_DIR/frontend-service.yaml"
kubectl apply -f "$K8S_DIR/backend-deployment.yaml"
kubectl apply -f "$K8S_DIR/frontend-deployment.yaml"

echo "==> Mise à jour des images (tag ${IMAGE_TAG})"
kubectl set image deployment/ticket-backend \
  -n ticketmanager \
  backend="$BACKEND_IMAGE"
kubectl set image deployment/ticket-frontend \
  -n ticketmanager \
  frontend="$FRONTEND_IMAGE"

echo "==> Reload prod (pods) — CORS secret + image tag ${IMAGE_TAG}"
kubectl rollout restart deployment/ticket-backend -n ticketmanager
kubectl rollout restart deployment/ticket-frontend -n ticketmanager

echo "==> Rollout"
if ! kubectl rollout status deployment/ticket-backend -n ticketmanager --timeout=600s; then
  echo "##[error]Rollout backend échoué — diagnostic:"
  kubectl get pods -n ticketmanager -o wide
  kubectl describe pods -n ticketmanager -l app=ticket-backend | tail -80
  kubectl get events -n ticketmanager --sort-by='.lastTimestamp' | tail -20
  exit 1
fi

if ! kubectl rollout status deployment/ticket-frontend -n ticketmanager --timeout=600s; then
  echo "##[error]Rollout frontend échoué — diagnostic:"
  kubectl get pods -n ticketmanager -o wide
  kubectl describe pods -n ticketmanager -l app=ticket-frontend | tail -80
  kubectl get events -n ticketmanager --sort-by='.lastTimestamp' | tail -20
  exit 1
fi

echo "==> État final"
kubectl get pods,svc -n ticketmanager

NODE_IP="${K8S_NODE_IP:-10.1.3.4}"
PUBLIC_IP="${K8S_WORKER_PUBLIC_IP:-}"
if [[ "$PUBLIC_IP" == "PUT_WORKER_PIP_HERE" ]]; then
  PUBLIC_IP=""
fi

APP_URL="${K8S_APP_URL:-http://${NODE_IP}:30080}"
API_URL="${K8S_API_URL:-http://${NODE_IP}:30081}"

echo ""
echo "Frontend HTTP (interne):     ${APP_URL}"
echo "Backend  HTTP (interne):     ${API_URL}"
if [[ -n "$PUBLIC_IP" ]]; then
  echo "Frontend HTTP (public PIP):  http://${PUBLIC_IP}:30080"
  echo "Backend  HTTP (public PIP):  http://${PUBLIC_IP}:30081"
  echo "NSG entrant requis: TCP 30080, 30081"
else
  echo "Accès public: définir K8S_WORKER_PUBLIC_IP dans Azure DevOps Library (PIP worker + NSG)"
fi

if [[ -f "$K8S_DIR/post-deploy.sh" ]]; then
  chmod +x "$K8S_DIR/post-deploy.sh"
  export K8S_NODE_IP="$NODE_IP"
  export K8S_WORKER_PUBLIC_IP="${PUBLIC_IP}"
  export K8S_APP_URL="$APP_URL"
  export K8S_API_URL="$API_URL"
  "$K8S_DIR/post-deploy.sh"
fi
