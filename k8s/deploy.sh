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

echo "==> Status"
kubectl get pods,svc -n ticketmanager

echo ""
echo "Frontend: http://10.1.3.4:30080 (ou IP worker + NodePort 30080)"
echo "Backend:  http://10.1.3.4:30081/api"
