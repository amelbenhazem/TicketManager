# Release 2 — Industrialisation et déploiement (LaTeX)

Structure LaTeX de la **Release 2** en trois sprints, alignée sur le dépôt réel
(`terraform/`, `azure-pipelines.yml`, `k8s/`, `ansible/`).

## Fichiers

| Fichier | Contenu |
|---------|---------|
| `release-2.tex` | Chapitre principal + `\input` des 3 sprints + bilan |
| `sprint-1-infrastructure.tex` | Terraform, AKS Engine, réseau |
| `sprint-2-cicd.tex` | Azure DevOps, pipeline, SonarQube, Docker, Nexus |
| `sprint-3-monitoring-cd.tex` | Déploiement K8s, Prometheus, Grafana |

## Conventions LaTeX

- **Backlog** : colonnes `ID | User story | Priorité | Est. (j)` — priorité **H** (haute), **M** (moyenne), **B** (basse).
- **Captions des tableaux** : toujours **au-dessus** du `tabular` (`\caption` puis `\label` puis tableau).
- **Figures de réalisation** : citées dans le texte avant l'environnement `figure`, ex.\
  `La figure~\ref{fig:r2-s1-tf-init} présente ...`

## Inclusion dans le mémoire

Dans le fichier principal du rapport (ex. `main.tex` à la racine du dépôt) :

```latex
\chapter{Release 2 : Industrialisation et déploiement de la plateforme}
\graphicspath{{docs/release-2/img/}{docs/release-1/img/}}
\input{docs/release-2/release-2}
```

Le second chemin `docs/release-1/img/` permet de réutiliser les diagrammes déjà exportés
(`architecture-globale-cloud.png`, `architecture-physique.png`, etc.).

## Diagrammes draw.io (Sprint 1 — Conception)

Exporter en PNG vers `docs/release-2/img/` :

| Fichier draw.io | PNG à exporter | Section LaTeX |
|-----------------|----------------|---------------|
| `docs/diagrammes/plan-adressage-reseau-sprint1.drawio` | `plan-adressage-reseau-sprint1.png` | Figure plan d'adressage (§ Conception) |
| `docs/diagrammes/architecture-infrastructure-sprint1.drawio` | `architecture-infrastructure-sprint1.png` | Figure 4.1 architecture globale Sprint 1 |

Dans draw.io : **Fichier → Exporter → PNG** (zoom 100 %, bordure 10 px).

## Captures d'écran (`img/`)

Placer les PNG dans `docs/release-2/img/`. Noms attendus par les fichiers `.tex` :

### Sprint 1 (`s1-*.png`)

| Fichier | Commande / source |
|---------|-------------------|
| `s1-terraform-init.png` | `cd terraform && terraform init` |
| `s1-terraform-validate.png` | `terraform validate` |
| `s1-terraform-plan.png` | `terraform plan` |
| `s1-terraform-apply.png` | `terraform apply` (sorties IPs) |
| `s1-vnet-subnets.png` | Portail Azure Stack Hub → VNet |
| `s1-nsg.png` | Portail → NSG |
| `s1-vms-portal.png` | Portail → VMs |
| `s1-aks-engine-json.png` | Capture VS Code du fichier `kubernetes.json` |
| `s1-aks-engine-deploy.png` | Logs `aks-engine deploy` |
| `s1-kubectl-nodes.png` | `kubectl get nodes` |

Réutilisable depuis Release 1 (via `\graphicspath`) : `architecture-globale-cloud.png`

### Sprint 2 (`s2-*.png`)

| Fichier | Commande / source |
|---------|-------------------|
| `s2-azure-devops-ui.png` | Interface Azure DevOps |
| `s2-pipeline-stages.png` | Exporter `docs/diagrammes/pipeline-stages.drawio` |
| `s2-agent-pool.png` | Azure DevOps → Agent pools → ticketmanager-pool |
| `s2-azure-repos.png` | Azure Repos → arborescence |
| `s2-tests-backend.png` | `cd backend && npm run test` ou logs stage Test |
| `s2-sonar-connection.png` | Service Connection SonarQube |
| `s2-sonar-results.png` | `http://vm-gestion:9000` → projet ticket-manager |
| `s2-dockerfile-backend.png` | Capture `backend/Dockerfile` |
| `s2-dockerfile-frontend.png` | Capture `frontend/Dockerfile` |
| `s2-docker-build.png` | Logs stage Docker du pipeline |
| `s2-trivy-backend.png` | `trivy image ticket-backend:latest` |
| `s2-trivy-frontend.png` | `trivy image ticket-frontend:latest` |
| `s2-nexus-repo.png` | Nexus UI → dépôt Docker hosted |
| `s2-nexus-images.png` | Nexus → images docker-ticketmanager |
| `s2-terraform-pipeline.png` | Logs stage Terraform IaC |
| `s2-pipeline-run-success.png` | Pipeline Azure DevOps — run vert |

### Sprint 3 (`s3-*.png`)

| Fichier | Commande / source |
|---------|-------------------|
| `s3-backend-deployment.png` | Capture `k8s/backend-deployment.yaml` |
| `s3-frontend-deployment.png` | Capture `k8s/frontend-deployment.yaml` |
| `s3-k8s-pipeline-stage.png` | Logs stage DeployK8s |
| `s3-kubectl-pods.png` | `kubectl get pods -n ticketmanager` |
| `s3-app-browser.png` | Navigateur → `http://<worker-PIP>:30080` |
| `s3-ansible-monitoring.png` | `ansible-playbook playbooks/monitoring.yml` |
| `s3-prometheus-targets.png` | `http://10.1.1.4:9090/targets` |
| `s3-grafana-datasource.png` | Grafana → Data sources |
| `s3-grafana-dashboard.png` | Dashboard cluster / backend |
| `s3-monitoring-pipeline.png` | Logs stage DeployMonitoring |

Réutilisable : `architecture-physique.png` (Release 1 / diagrammes)

## Lien avec l'ancien fichier

`docs/release-1/sprint-2-ci-infra.tex` mélange infrastructure et CI/CD dans un seul sprint.
La Release 2 le **remplace** par trois sprints distincts. Vous pouvez retirer l'ancien
`\input` du mémoire ou le garder comme brouillon.

## Relation Release 1 / Release 2

| Release | Contenu |
|---------|---------|
| **Release 1** | Socle applicatif (NestJS, Next.js, tickets, Cloudinary) — `sprint-1.md` |
| **Release 2** | Industrialisation cloud (ce dossier) |
