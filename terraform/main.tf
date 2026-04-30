# Minimal baseline: reference existing network foundation only.
# Next step will add vm-gestion and vm-db resources on this subnet.

data "azurestack_resource_group" "main" {
  name = var.resource_group_name
}

data "azurestack_virtual_network" "existing" {
  name                = var.existing_vnet_name
  resource_group_name = data.azurestack_resource_group.main.name
}

data "azurestack_subnet" "existing" {
  name                 = var.existing_subnet_name
  virtual_network_name = data.azurestack_virtual_network.existing.name
  resource_group_name  = data.azurestack_resource_group.main.name
}
