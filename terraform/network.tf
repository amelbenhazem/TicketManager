# =============================================================================
# 04 — Réseau : VNet, sous-réseaux, NSG, règles de filtrage
# =============================================================================
# Schéma pédagogique :
#   - snet-mgmt : VM-gestion (SSH, Ansible, supervision du cluster)
#   - snet-db   : VM-DB (MongoDB, trafic interne uniquement)
#   - snet-aks  : réservé aux nœuds / plan de contrôle Kubernetes (AKS Engine)
#
# Le sous-réseau AKS est créé ici pour figer l'adressage ; le déploiement du
# cluster (manifests AKS Engine, etc.) peut être traité hors Terraform.
# =============================================================================

data "azurestack_resource_group" "main" {
  name = var.resource_group_name
}

resource "azurestack_virtual_network" "main" {
  name                = local.vnet_name
  location            = var.location
  resource_group_name = data.azurestack_resource_group.main.name
  address_space       = var.vnet_address_space
  tags                = local.tags
}

# --- NSG administration (SSH depuis une source configurable) -----------------
resource "azurestack_network_security_group" "mgmt" {
  name                = local.nsg_mgmt_name
  location            = var.location
  resource_group_name = data.azurestack_resource_group.main.name
  tags                = local.tags
}

resource "azurestack_network_security_rule" "mgmt_ssh" {
  name                        = "AllowSSH"
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "22"
  source_address_prefix       = var.ssh_source_address_prefix
  destination_address_prefix  = "*"
  resource_group_name         = data.azurestack_resource_group.main.name
  network_security_group_name = azurestack_network_security_group.mgmt.name
}

# --- NSG base de données (MongoDB : uniquement depuis mgmt et sous-réseau AKS)
resource "azurestack_network_security_group" "db" {
  name                = local.nsg_db_name
  location            = var.location
  resource_group_name = data.azurestack_resource_group.main.name
  tags                = local.tags
}

resource "azurestack_network_security_rule" "db_mongo_from_mgmt" {
  name                        = "AllowMongoFromMgmtSubnet"
  priority                    = 110
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "27017"
  source_address_prefix       = var.subnet_mgmt_cidr
  destination_address_prefix  = "*"
  resource_group_name         = data.azurestack_resource_group.main.name
  network_security_group_name = azurestack_network_security_group.db.name
}

resource "azurestack_network_security_rule" "db_mongo_from_aks" {
  name                        = "AllowMongoFromAksSubnet"
  priority                    = 120
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "27017"
  source_address_prefix       = var.subnet_aks_cidr
  destination_address_prefix  = "*"
  resource_group_name         = data.azurestack_resource_group.main.name
  network_security_group_name = azurestack_network_security_group.db.name
}

# --- NSG cluster (règles minimales : trafic interne ; à affiner avec AKS Engine)
resource "azurestack_network_security_group" "aks" {
  name                = local.nsg_aks_name
  location            = var.location
  resource_group_name = data.azurestack_resource_group.main.name
  tags                = local.tags
}

resource "azurestack_network_security_rule" "aks_allow_internal" {
  name                        = "AllowVnetInbound"
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "*"
  source_port_range           = "*"
  destination_port_range      = "*"
  source_address_prefix       = var.vnet_address_space[0]
  destination_address_prefix  = "*"
  resource_group_name         = data.azurestack_resource_group.main.name
  network_security_group_name = azurestack_network_security_group.aks.name
}

# --- Sous-réseaux ------------------------------------------------------------
# Note Azure Stack provider (v1.0.0) :
# - L'association NSG↔Subnet n'est pas exposée ici (pas de `network_security_group_id`).
# - Les NSG sont créés pour documentation et pour une association ultérieure (portail/import),
#   ou via un mécanisme supporté dans votre environnement.
resource "azurestack_subnet" "mgmt" {
  name                 = local.snet_mgmt_name
  resource_group_name  = data.azurestack_resource_group.main.name
  virtual_network_name = azurestack_virtual_network.main.name
  address_prefix       = var.subnet_mgmt_cidr
}

resource "azurestack_subnet" "db" {
  name                 = local.snet_db_name
  resource_group_name  = data.azurestack_resource_group.main.name
  virtual_network_name = azurestack_virtual_network.main.name
  address_prefix       = var.subnet_db_cidr
}

resource "azurestack_subnet" "aks" {
  name                 = local.snet_aks_name
  resource_group_name  = data.azurestack_resource_group.main.name
  virtual_network_name = azurestack_virtual_network.main.name
  address_prefix       = var.subnet_aks_cidr
}
