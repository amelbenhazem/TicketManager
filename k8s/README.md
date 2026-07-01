# Déploiement TicketManager sur Kubernetes (AKS Engine / Azure Stack Hub)

Manifests pour le namespace `ticketmanager` : backend NestJS, frontend Next.js, MongoDB externe (`10.1.2.4`).

## Prérequis

- `kubectl` configuré (`KUBECONFIG=~/kubernetes/ticketmanager-k8s/kubeconfig/kubeconfig.dc2.json`)
- Cluster Ready, Nexus sur vm-gestion (`10.1.1.4:8082`)
- Images : `ticket-backend:latest`, `ticket-frontend:latest`

## 1. Registre insecure sur les nœuds workers

Les agents doivent pull depuis `10.1.1.4:8082` (HTTP). **Automatisé** par le pipeline (`Configure insecure registry on K8s workers`) via `k8s/scripts/setup-worker-insecure-registry.sh`.

Prérequis : l'agent Azure DevOps sur vm-gestion doit pouvoir `ssh azureuser@10.1.3.4` (et `.5`) avec la clé privée du cluster AKS Engine.

Configuration manuelle (dépannage) :

```bash
# Exemple containerd — adapter si votre cluster utilise une autre config
sudo mkdir -p /etc/containerd/certs.d/10.1.1.4:8082
sudo tee /etc/containerd/certs.d/10.1.1.4:8082/hosts.toml <<'EOF'
server = "http://10.1.1.4:8082"
[host."http://10.1.1.4:8082"]
  capabilities = ["pull", "resolve", "push"]
  skip_verify = true
EOF
sudo systemctl restart containerd
```

Alternative rapide (test) : configurer `insecure-registries` dans `/etc/docker/daemon.json` si les nœuds utilisent Docker (peu probable avec containerd).

## 2. Frontend — URL API (important)

`NEXT_PUBLIC_API_URL` est **figée au build** Docker. L'image `latest` du pipeline utilise `http://localhost:3001` par défaut.

Pour accès via NodePort depuis un navigateur, **reconstruire et pousser** le frontend :

```bash
# Sur vm-gestion — adapter l'IP d'un worker si besoin
export API_URL=http://10.1.3.4:30081
docker build --build-arg NEXT_PUBLIC_API_URL=$API_URL -t ticket-frontend:k8s ./frontend
docker tag ticket-frontend:k8s localhost:8082/docker-ticketmanager/ticket-frontend:k8s
docker push localhost:8082/docker-ticketmanager/ticket-frontend:k8s
```

Puis dans `frontend-deployment.yaml`, remplacer l'image par `.../ticket-frontend:k8s` ou mettre à jour le tag `latest` après push.

Mettre à jour `CORS_ORIGIN` dans le secret backend avec l'URL du frontend (ex. `http://10.1.3.4:30080`).

## 3. Secrets Kubernetes

```bash
kubectl create namespace ticketmanager --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret docker-registry nexus-registry \
  -n ticketmanager \
  --docker-server=10.1.1.4:8082 \
  --docker-username=admin \
  --docker-password='VOTRE_MOT_DE_PASSE' \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic backend-secret \
  -n ticketmanager \
  --from-literal=MONGODB_URI='mongodb://10.1.2.4:27017/ticketmanager' \
  --from-literal=JWT_SECRET='change-me-production-secret' \
  --from-literal=JWT_EXPIRES_IN='7d' \
  --from-literal=NODE_ENV='production' \
  --from-literal=PORT='3001' \
  --from-literal=CORS_ORIGIN='http://10.1.3.4:30080,http://10.1.3.5:30080' \
  --dry-run=client -o yaml | kubectl apply -f -
```

Les fichiers `*.yaml.example` servent de modèle ; ne commitez pas les secrets réels.

## 4. Déployer

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-service.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/frontend-service.yaml

kubectl get pods -n ticketmanager -w
kubectl get svc -n ticketmanager
```

## 5. Accès application

| Service  | NodePort | URL interne (VNet)     | URL publique (PIP worker)        |
|----------|----------|------------------------|----------------------------------|
| Frontend | 30080    | http://10.1.3.4:30080  | http://\<PIP-worker\>:30080     |
| Backend  | 30081    | http://10.1.3.4:30081  | http://\<PIP-worker\>:30081     |

### Accès Internet (NodePort + PIP worker — recommandation encadrant)

1. Créer une **Adresse IP publique** dans `ticketmanager-k8s-rg` et l'associer à la NIC `k8s-agentpool-34739636-nic-1` (worker `10.1.3.4`).
2. Ouvrir **NSG** `k8s-master-34739636-nsg` : TCP **30080** et **30081** (entrant).
3. Mettre l'IP dans `azure-pipelines.yml` → variable **`K8S_WORKER_PUBLIC_IP`** (remplace `PUT_WORKER_PIP_HERE`).
4. Push sur `main` → pipeline rebuild frontend (`FRONTEND_API_URL`) + redeploy (CORS backend).
5. Navigateur : `http://<PIP-worker>:30080`

Depuis le réseau interne / VPN. Seed MongoDB si base vide : exécuter `npm run seed` depuis vm-gestion ou un job K8s.

## 6. Dépannage

```bash
kubectl describe pod -n ticketmanager -l app=ticket-backend
kubectl logs -n ticketmanager -l app=ticket-backend --tail=100
kubectl logs -n ticketmanager -l app=ticket-frontend --tail=100
```

| Symptôme | Cause probable |
|----------|----------------|
| `ImagePullBackOff` | Registre insecure non configuré sur nœuds ou secret `nexus-registry` |
| `ErrImagePull` | Mauvais tag ou Nexus injoignable depuis worker |
| Frontend OK, API en échec | `NEXT_PUBLIC_API_URL` incorrecte au build |
| CORS error | Ajuster `CORS_ORIGIN` dans `backend-secret` |

## Fichiers

| Fichier | Rôle |
|---------|------|
| `namespace.yaml` | Namespace ticketmanager |
| `backend-deployment.yaml` | Pod API NestJS |
| `backend-service.yaml` | NodePort 30081 |
| `frontend-deployment.yaml` | Pod Next.js |
| `frontend-service.yaml` | NodePort 30080 |
| `deploy-pipeline.sh` | CD automatisé (Azure Pipelines) |
| `reload-prod.sh` | Recharge prod manuelle (CORS + rollout pods) |
| `fix-cors-public.sh` | Mise à jour CORS backend uniquement |
| `deploy.sh` | Déploiement manuel local |
| `*-secret.yaml.example` | Modèles secrets |

## CD automatisé (Azure Pipelines)

Le stage **Deploy to Kubernetes** (`DeployK8s`) s'exécute sur `main` après **Push to Nexus**, avec approbation manuelle.

Flux : Build → SonarQube → Docker → Push Nexus → **Deploy K8s** (en parallèle possible avec Terraform).

### Variables à configurer dans Azure DevOps (Library)

| Variable | Secret | Description |
|----------|--------|-------------|
| `NEXUS_USER` | non | Utilisateur Nexus |
| `NEXUS_PASSWORD` | **oui** | Mot de passe Nexus |
| `JWT_SECRET` | **oui** | Secret JWT backend |
| `SONAR_TOKEN` | oui | (existant) |
| `TF_APPROVERS` | non | Emails approbation Terraform + K8s |

Variables déjà dans `azure-pipelines.yml` : `K8S_REGISTRY`, `K8S_KUBECONFIG`, `K8S_MONGODB_URI`, `K8S_CORS_ORIGIN`, `K8S_WORKER_IPS`, `K8S_WORKER_PUBLIC_IP`, `K8S_NODE_HOSTNAME`, `FRONTEND_API_URL`.

### Reload prod automatique (pipeline)

Chaque **Deploy K8s** :
- utilise le tag image **`$(Build.BuildId)`** (plus `latest` seul) → rollout garanti ;
- applique **nodeSelector** `k8s-agentpool-34739636-1` (worker avec PIP) ;
- **rollout restart** backend + frontend (CORS + nouvelle image).

### Reload prod manuel (vm-gestion)

```bash
export KUBECONFIG=~/kubernetes/ticketmanager-k8s/kubeconfig/kubeconfig.dc2.json
chmod +x k8s/reload-prod.sh
K8S_WORKER_PUBLIC_IP=102.141.206.164 IMAGE_TAG=latest ./k8s/reload-prod.sh
```

Remplacer `IMAGE_TAG` par le numéro de build Azure DevOps si besoin.

### Première exécution

1. Ajouter `JWT_SECRET` dans les variables du pipeline.
2. Vérifier que l'agent (`vm-gestion`) peut SSH vers les workers (`K8S_WORKER_IPS`) sans mot de passe.
3. Push sur `main` → approuver le stage **Deploy to Kubernetes** (le pipeline configure automatiquement le registre insecure sur les workers).
4. Vérifier : `kubectl get pods -n ticketmanager` sur vm-gestion.
