#!/usr/bin/env bash
# Installe NGINX Ingress Controller (si absent) et configure NodePort 30443/30480.
# Pinne le contrôleur sur le worker avec PIP (K8S_NODE_HOSTNAME).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
K8S_DIR="$ROOT/k8s"
NODE_HOSTNAME="${K8S_NODE_HOSTNAME:-k8s-agentpool-34739636-1}"
INGRESS_MANIFEST="${INGRESS_NGINX_MANIFEST:-https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.11.3/deploy/static/provider/cloud/deploy.yaml}"

: "${KUBECONFIG:?KUBECONFIG requis}"

if ! kubectl get namespace ingress-nginx &>/dev/null; then
  echo "==> Installation NGINX Ingress Controller"
  if curl -sfL "$INGRESS_MANIFEST" -o /tmp/ingress-nginx-deploy.yaml; then
    kubectl apply -f /tmp/ingress-nginx-deploy.yaml
  else
    echo "##[error]Impossible de télécharger ingress-nginx. Copiez deploy.yaml localement et définissez INGRESS_NGINX_MANIFEST." >&2
    exit 1
  fi
else
  echo "==> Namespace ingress-nginx déjà présent"
fi

echo "==> Attente du contrôleur ingress-nginx"
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=300s

echo "==> NodeSelector worker PIP (${NODE_HOSTNAME})"
kubectl patch deployment ingress-nginx-controller -n ingress-nginx --type='merge' -p "{
  \"spec\": {
    \"template\": {
      \"spec\": {
        \"nodeSelector\": {
          \"kubernetes.io/hostname\": \"${NODE_HOSTNAME}\"
        }
      }
    }
  }
}" || true

kubectl rollout status deployment/ingress-nginx-controller -n ingress-nginx --timeout=300s

echo "==> Service NodePort HTTPS 30443 / HTTP 30480"
kubectl apply -f "$K8S_DIR/ingress-nginx-service.yaml"

kubectl get pods,svc -n ingress-nginx
