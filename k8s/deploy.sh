#!/usr/bin/env bash
# Déploiement TicketManager sur le cluster K8s (vm-gestion).
# Usage: ./k8s/deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
K8S_DIR="$ROOT/k8s"

export KUBECONFIG="${KUBECONFIG:-$HOME/kubernetes/ticketmanager-k8s/kubeconfig/kubeconfig.dc2.json}"

if [[ ! -f "$KUBECONFIG" ]]; then
  echo "KUBECONFIG introuvable: $KUBECONFIG" >&2
  exit 1
fi

echo "==> Namespace"
kubectl apply -f "$K8S_DIR/namespace.yaml"

if ! kubectl get secret nexus-registry -n ticketmanager &>/dev/null; then
  echo "Secret nexus-registry manquant. Créez-le :"
  echo "  kubectl create secret docker-registry nexus-registry -n ticketmanager \\"
  echo "    --docker-server=10.1.1.4:8082 --docker-username=admin --docker-password='...'"
  exit 1
fi

if ! kubectl get secret backend-secret -n ticketmanager &>/dev/null; then
  echo "Secret backend-secret manquant. Créez-le (voir k8s/README.md)."
  exit 1
fi

echo "==> MongoDB"
kubectl apply -f "$K8S_DIR/mongodb-service.yaml"
kubectl apply -f "$K8S_DIR/mongodb-statefulset.yaml"
kubectl wait --for=condition=ready pod -l app=mongodb -n ticketmanager --timeout=300s

echo "==> Workloads"
kubectl apply -f "$K8S_DIR/backend-deployment.yaml"
kubectl apply -f "$K8S_DIR/backend-service.yaml"
kubectl apply -f "$K8S_DIR/frontend-deployment.yaml"
kubectl apply -f "$K8S_DIR/frontend-service.yaml"

if [[ -f "$K8S_DIR/scripts/setup-ingress-nginx.sh" ]]; then
  echo "==> Ingress HTTPS"
  chmod +x "$K8S_DIR/scripts/"*.sh
  export K8S_NODE_HOSTNAME="${K8S_NODE_HOSTNAME:-k8s-agentpool-34739636-1}"
  export K8S_APP_HOST="${K8S_APP_HOST:-app.ticketmanager.local}"
  export K8S_API_HOST="${K8S_API_HOST:-api.ticketmanager.local}"
  export K8S_WORKER_PUBLIC_IP="${K8S_WORKER_PUBLIC_IP:-}"
  "$K8S_DIR/scripts/setup-ingress-nginx.sh"
  "$K8S_DIR/scripts/ensure-tls-secret.sh"
  kubectl apply -f "$K8S_DIR/ingress.yaml"
fi

echo "==> Status"
kubectl get pods,svc,ingress -n ticketmanager

echo ""
echo "Frontend HTTPS: https://app.ticketmanager.local:30443"
echo "Backend  HTTPS: https://api.ticketmanager.local:30443"
echo "Frontend HTTP (legacy NodePort): http://10.1.3.4:30080"
echo "Backend  HTTP (legacy NodePort): http://10.1.3.4:30081"
