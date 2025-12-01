# Makefile for managing a VirtualBox VM on a physical disk.

#
# --- Configuration ---
#

# WARNING: Set this to the target physical disk.
# All data on this disk may be lost.
# Use `lsblk` to find the correct device.
TARGET_DISK?=/dev/disk/by-id/ata-Samsung_SSD_860_QVO_1TB_S59HNG0N105827B

# Name of the VirtualBox VM to create and manage.
VM_NAME?=ocap-dev-vm

#
# --- Tool Configuration ---
#
# Override these variables to use custom paths for tools.
# e.g. make SFDISK=/path/to/sfdisk ...
VBOXMANAGE?=VBoxManage
USERMOD?=usermod
SGDISK?=sgdisk
LSBLK?=lsblk
PARTPROBE?=partprobe
BLKID?=blkid
MKFS_VFAT?=mkfs.vfat
MKFS_EXT4?=mkfs.ext4
MKFS_BTRFS?=mkfs.btrfs
REALPATH?=realpath
SUDO?=sudo
JQ?=jq
GRUB_INSTALL?=grub-install
MOUNT?=mount
UMOUNT?=umount
MKDIR?=mkdir

#
# --- Non-Destructive Targets ---
#

.PHONY: help perms run check-partitioning create-vm check-formatting destroy-vm clean physical.vmdk partition-disk format-disk provision-disk install-bootloader mount-target unmount-target

# Default target

help:
	@echo "Makefile for OCap OS Dev VM"
	@echo ""
	@if [ ! -b "$(TARGET_DISK)" ]; then \
		echo "ERROR: TARGET_DISK '$(TARGET_DISK)' does not exist or is not a block device."; \
		echo "Please set TARGET_DISK to a valid device. For example:"; \
		echo "  export TARGET_DISK=/dev/disk/by-id/ata-YOUR_DISK_NAME_HERE"; \
		exit 1; \
	fi
	@echo "Current configuration:"
	@echo "  TARGET_DISK = $(TARGET_DISK)"
	@echo "  VM_NAME     = $(VM_NAME)"
	@echo ""
	@echo "Usage:"
	@echo "  make -C osdev perms          - Add current user to 'disk' group (requires logout/login)."
	@echo "  make -C osdev physical.vmdk  - Create the VMDK file pointing to TARGET_DISK."
	@echo "  make -C osdev create-vm      - Create the VirtualBox VM definition."
	@echo "  make -C osdev run            - Start the VirtualBox VM."
	@echo "  make -C osdev clean          - Remove generated files (e.g. physical.vmdk)."
	@echo "  sudo make -C osdev check-partitioning - Check if partitioning is already done."
	@echo "  sudo make -C osdev check-formatting - Check if formatting is already done."
	@echo "  sudo make -C osdev install-bootloader - Install GRUB bootloader to the disk."
	@echo ""
	@echo "  WARNING: Destructive commands follow."
	@echo "  sudo make -C osdev provision-disk - Partition and format TARGET_DISK (WIPES ALL DATA)."
	@echo "  sudo make -C osdev partition-disk - (part of provision) Partition TARGET_DISK."
	@echo "  sudo make -C osdev format-disk    - (part of provision) Format partitions on TARGET_DISK."
	@echo "  make -C osdev destroy-vm     - DANGER: Deletes the VirtualBox VM definition."


perms:
	@echo "Adding user '$(USER)' to the 'disk' group..."
	@echo "You must log out and log back in for this to take effect."
	$(SUDO) $(USERMOD) -aG disk $(USER)

clean:
	@echo "Removing generated files..."
	rm -f physical.vmdk

physical.vmdk:
	@echo "Creating/updating VMDK mapping for $(TARGET_DISK)..."
	$(VBOXMANAGE) internalcommands createrawvmdk -filename $@ -rawdisk $(TARGET_DISK)

run:
	$(VBOXMANAGE) startvm "$(VM_NAME)"

destroy-vm:
	@if $(VBOXMANAGE) showvminfo "$(VM_NAME)" >/dev/null 2>&1; then \
		echo "Destroying VirtualBox VM '$(VM_NAME)'..."; \
		$(VBOXMANAGE) unregistervm "$(VM_NAME)" --delete; \
	else \
		echo "VirtualBox VM '$(VM_NAME)' does not exist. Nothing to do."; \
	fi

create-vm: physical.vmdk
	@if $(VBOXMANAGE) showvminfo "$(VM_NAME)" >/dev/null 2>&1; then \
		echo "VirtualBox VM '$(VM_NAME)' already exists. Nothing to do."; \
	else \
		echo "Creating VirtualBox VM '$(VM_NAME)'..."; \
		($(VBOXMANAGE) createvm --name "$(VM_NAME)" --ostype "Linux_64" --register && \
		$(VBOXMANAGE) modifyvm "$(VM_NAME)" --firmware efi && \
		$(VBOXMANAGE) storagectl "$(VM_NAME)" --name "SATA Controller" --add sata --controller IntelAhci && \
		$(VBOXMANAGE) storageattach "$(VM_NAME)" --storagectl "SATA Controller" --port 0 --device 0 --type hdd --medium $(CURDIR)/physical.vmdk && \
		echo "VM '$(VM_NAME)' created successfully.") || \
		(echo "VM creation failed. Cleaning up..." && $(VBOXMANAGE) unregistervm "$(VM_NAME)" --delete >/dev/null 2>&1); \
	fi

check-partitioning: check-partition-layout.jq
	@if $(SUDO) $(LSBLK) --json -b -o PARTLABEL,SIZE,PARTTYPE $(TARGET_DISK) | $(JQ) -e -f $< > /dev/null; then \
		echo "Partition layout is correct."; \
	else \
		echo "Partition layout is INCORRECT or disk is not partitioned."; \
		exit 1; \
	fi

check-formatting:
	@if [ -b "$(TARGET_DISK)-part1" ] && \
		[ "$$($(SUDO) $(BLKID) -s TYPE -o value "$(TARGET_DISK)-part1" 2>/dev/null)" = "vfat" ] && \
		[ "$$($(SUDO) $(BLKID) -s LABEL -o value "$(TARGET_DISK)-part1" 2>/dev/null)" = "ESP" ] && \
		[ -b "$(TARGET_DISK)-part2" ] && \
		[ "$$($(SUDO) $(BLKID) -s TYPE -o value "$(TARGET_DISK)-part2" 2>/dev/null)" = "btrfs" ] && \
		[ "$$($(SUDO) $(BLKID) -s LABEL -o value "$(TARGET_DISK)-part2" 2>/dev/null)" = "guix" ] && \
		[ -b "$(TARGET_DISK)-part3" ] && \
		[ "$$($(SUDO) $(BLKID) -s TYPE -o value "$(TARGET_DISK)-part3" 2>/dev/null)" = "ext4" ] && \
		[ "$$($(SUDO) $(BLKID) -s LABEL -o value "$(TARGET_DISK)-part3" 2>/dev/null)" = "genode" ] && \
		[ -b "$(TARGET_DISK)-part4" ] && \
		[ "$$($(SUDO) $(BLKID) -s TYPE -o value "$(TARGET_DISK)-part4" 2>/dev/null)" = "btrfs" ] && \
		[ "$$($(SUDO) $(BLKID) -s LABEL -o value "$(TARGET_DISK)-part4" 2>/dev/null)" = "shared" ]; then \
		echo "Partitions are correctly formatted."; \
	else \
		echo "Partitions are NOT correctly formatted."; \
		exit 1; \
	fi


#
# --- DANGEROUS: Destructive Disk Operations ---
#
# These targets will WIPE ALL DATA on TARGET_DISK.
# Adapted from https://gist.github.com/dckc/c11561caed0d24f23d9224ce38e0133f
#

partition-disk: check-partition-layout.jq
	@if $(MAKE) check-partitioning > /dev/null 2>&1; then \
		echo "Partition layout on $(TARGET_DISK) is already correct. Nothing to do."; \
	else \
		echo "!!! WARNING: About to partition $(TARGET_DISK). ALL DATA WILL BE LOST. !!!"; \
		echo "Press Enter to continue or Ctrl+C to abort."; \
		read REPLY; \
		$(SUDO) $(SGDISK) --zap-all \
			--new=1:0:+1G   --change-name=1:"ESP"    --typecode=1:EF00 \
			--new=2:0:+100G --change-name=2:"Guix"   --typecode=2:8300 \
			--new=3:0:+20G  --change-name=3:"Genode" --typecode=3:8300 \
			--new=4:0:+200G --change-name=4:"Shared" --typecode=4:8300 \
			$(TARGET_DISK); \
		$(SUDO) $(PARTPROBE) $(TARGET_DISK); \
	fi

format-disk:
	@if $(MAKE) check-formatting > /dev/null 2>&1; then \
		echo "Partitions on $(TARGET_DISK) are already formatted. Nothing to do."; \
	else \
		echo "!!! WARNING: About to format $(TARGET_DISK). ALL DATA WILL BE LOST. !!!"; \
		echo "Press Enter to continue or Ctrl+C to abort."; \
		read REPLY; \
		$(SUDO) $(MKFS_VFAT) -n ESP "$$($(REALPATH) $(TARGET_DISK)-part1)"; \
		$(SUDO) $(MKFS_BTRFS) -L guix -f "$$($(REALPATH) $(TARGET_DISK)-part2)"; \
		$(SUDO) $(MKFS_EXT4) -L genode -F "$$($(REALPATH) $(TARGET_DISK)-part3)"; \
		$(SUDO) $(MKFS_BTRFS) -L shared -f "$$($(REALPATH) $(TARGET_DISK)-part4)"; \
	fi

provision-disk: partition-disk format-disk

mount-target:
	@echo "Mounting target partitions..."
	$(SUDO) $(MOUNT) "$$($(REALPATH) $(TARGET_DISK)-part2)" /mnt
	$(SUDO) $(MKDIR) -p /mnt/boot/efi
	$(SUDO) $(MOUNT) "$$($(REALPATH) $(TARGET_DISK)-part1)" /mnt/boot/efi

unmount-target:
	@echo "Unmounting target partitions..."
	$(SUDO) $(UMOUNT) /mnt/boot/efi
	$(SUDO) $(UMOUNT) /mnt

install-bootloader:
	$(SUDO) $(GRUB_INSTALL) --target=x86_64-efi --efi-directory=/mnt/boot/efi --boot-directory=/mnt/boot --removable
