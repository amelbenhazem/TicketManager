# =============================================================================
# 03 — Locals : noms cohérents et étiquettes
# =============================================================================

locals {
  tags = {
    projet    = "TicketManager"
    composant = "infra-iac"
    owner     = "PFE"
  }

  vnet_name      = "${var.project_prefix}-vnet"

  snet_mgmt_name = "${var.project_prefix}-snet-mgmt"
  snet_db_name   = "${var.project_prefix}-snet-db"
  snet_aks_name  = "${var.project_prefix}-snet-aks"

  nsg_mgmt_name  = "${var.project_prefix}-nsg-mgmt"
  nsg_db_name    = "${var.project_prefix}-nsg-db"
  nsg_aks_name   = "${var.project_prefix}-nsg-aks"

  vm_gestion_name = "${var.project_prefix}-vm-gestion"
  vm_db_name      = "${var.project_prefix}-vm-db"

  vm_gestion_os_disk_id = "/subscriptions/${var.subscription_id}/resourceGroups/${var.resource_group_name}/providers/Microsoft.Compute/disks/${var.project_prefix}-vm-gestion-os"
}