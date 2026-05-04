# =============================================================================
# 05 — VM-gestion : administration, Ansible, supervision du cluster
# =============================================================================
# IP publique pour accès SSH opérateur ; la VM reste dans snet-mgmt.
# =============================================================================

resource "azurestack_public_ip" "gestion" {
  name                = "${local.vm_gestion_name}-pip"
  location            = var.location
  resource_group_name = data.azurestack_resource_group.main.name
  allocation_method   = "Dynamic"
  tags                = local.tags
}

resource "azurestack_network_interface" "gestion" {
  name                = "${local.vm_gestion_name}-nic"
  location            = var.location
  resource_group_name = data.azurestack_resource_group.main.name

  ip_configuration {
    name                          = "primary"
    subnet_id                     = azurestack_subnet.mgmt.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurestack_public_ip.gestion.id
  }

  tags = local.tags
}

resource "azurestack_virtual_machine" "gestion" {
  name                  = local.vm_gestion_name
  location              = var.location
  resource_group_name   = data.azurestack_resource_group.main.name
  network_interface_ids = [azurestack_network_interface.gestion.id]
  vm_size               = var.vm_size_gestion

  storage_image_reference {
    publisher = var.image_publisher
    offer     = var.image_offer
    sku       = var.image_sku
    version   = var.image_version
  }

  storage_os_disk {
    name              = "${local.vm_gestion_name}-os"
    caching           = "ReadWrite"
    create_option     = "FromImage"
    managed_disk_type = "Standard_LRS"
  }

  os_profile {
    computer_name  = local.vm_gestion_name
    admin_username = var.admin_username
  }

  os_profile_linux_config {
    disable_password_authentication = true
    ssh_keys {
      path     = "/home/${var.admin_username}/.ssh/authorized_keys"
      key_data = var.ssh_public_key
    }
  }

  tags = local.tags
}
