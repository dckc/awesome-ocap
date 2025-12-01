# Makefile for managing a VirtualBox VM on a physical disk.

#
# --- Configuration ---
#

# DANGER: Set this to the target physical disk.
# All data on this disk may be lost.
# Use `lsblk` to find the correct device.
TARGET_DISK?=/dev/disk/by-id/ata-Samsung_SSD_860_QVO_1TB_S59HNG0N105827B

# Name of the VirtualBox VM to create and manage.
VM_NAME?=ocap-dev-vm

#
# --- Non-Destructive Targets ---
#

.PHONY: help perms run

# Default target

help:
	@echo "Makefile for OCap OS Dev VM"
	@echo ""
	@if [ ! -b "$(TARGET_DISK)" ]; then \
		echo "ERROR: TARGET_DISK '$(TARGET_DISK)' does not exist or is not a block device."; \
		echo "Please set TARGET_DISK to a valid device. For example:"; \
		echo "  export TARGET_DISK=/dev/sdX"; \
		exit 1; \
	fi
	@echo "Current configuration:"
	@echo "  TARGET_DISK = $(TARGET_DISK)"
	@echo "  VM_NAME     = $(VM_NAME)"
	@echo ""
	@echo "Usage:"
	@echo "  make -C osdev perms          - Add current user to 'disk' group (requires logout/login)."
	@echo "  make -C osdev physical.vmdk  - Create the VMDK file pointing to TARGET_DISK."
	@echo "  make -C osdev run            - Start the VirtualBox VM."
	@echo ""
	@echo "  WARNING: Destructive commands follow."
	@echo "  sudo make -C osdev partition-disk - Partition TARGET_DISK (WIPES ALL DATA)."
	@echo "  sudo make -C osdev format-disk    - Format partitions on TARGET_DISK (WIPES ALL DATA)."


perms:
	@echo "Adding user '$(USER)' to the 'disk' group..."
	@echo "You must log out and log back in for this to take effect."
	sudo usermod -aG disk $(USER)

physical.vmdk:
	@echo "Creating VMDK mapping for $(TARGET_DISK)..."
	rm -f $@
	VBoxManage internalcommands createrawvmdk -filename $@ -rawdisk $(TARGET_DISK)

run:
	VBoxManage startvm "$(VM_NAME)"


#
# --- DANGEROUS: Destructive Disk Operations ---
#
# These targets will WIPE ALL DATA on TARGET_DISK.
# Adapted from https://gist.github.com/dckc/c11561caed0d24f23d9224ce38e0133f
#

.PHONY: partition-disk format-disk

partition-disk: partition-table.sfdisk
	@echo "!!! WARNING: About to partition $(TARGET_DISK) using layout from $<. ALL DATA WILL BE LOST. !!!"
	@read -p "Press Enter to continue or Ctrl+C to abort."
	sudo sfdisk $(TARGET_DISK) < $<

format-disk:
	@echo "!!! WARNING: About to format $(TARGET_DISK). ALL DATA WILL BE LOST. !!!"
	@read -p "Press Enter to continue or Ctrl+C to abort."
	sudo mkfs.vfat -n ESP $$(realpath $(TARGET_DISK)-part1)
	sudo mkfs.ext4 -L osdev-root -F $$(realpath $(TARGET_DISK)-part2)
