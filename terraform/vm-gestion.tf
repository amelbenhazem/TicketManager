resource "azurestack_public_ip" "vm_gestion" {
  name                = "${local.vm_gestion_name}-pip"
  location            = var.location
  resource_group_name = data.azurestack_resource_group.main.name
  allocation_method   = "Dynamic"
  tags                = local.base_tags
}

resource "azurestack_network_interface" "vm_gestion" {
  name                = "${local.vm_gestion_name}-nic"
  location            = var.location
  resource_group_name = data.azurestack_resource_group.main.name

  ip_configuration {
    name                          = "ipconfig1"
    subnet_id                     = data.azurestack_subnet.existing.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurestack_public_ip.vm_gestion.id
  }

  tags = local.base_tags
}

resource "azurestack_virtual_machine" "vm_gestion" {
  name                  = local.vm_gestion_name
  location              = var.location
  resource_group_name   = data.azurestack_resource_group.main.name
  network_interface_ids = [azurestack_network_interface.vm_gestion.id]
  vm_size               = var.vm_size_gestion

  storage_image_reference {
    publisher = var.image_publisher
    offer     = var.image_offer
    sku       = var.image_sku
    version   = var.image_version
  }

  storage_os_disk {
    name              = "${local.vm_gestion_name}-osdisk"
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

  tags = local.base_tags
}
