;; osdev/config.scm -- Guix system configuration for the OCap dev environment.

(use-modules (gnu)
             (gnu services base)
             (guix gexp))

(use-service-modules base)

(operating-system
  (host-name "ocap-dev")
  (timezone "Etc/UTC")
  (locale "en_US.utf8")

  ;; Bootloader configuration for EFI systems.
  (bootloader (bootloader-configuration
               (bootloader grub-efi-bootloader)
               (target "/boot/efi")))

  ;; Define the filesystems.
  (file-systems (cons* (file-system
                         (mount-point "/")
                         (device (file-system-label "guix"))
                         (type "btrfs"))
                       (file-system
                         (mount-point "/boot/efi")
                         (device (file-system-label "ESP"))
                         (type "vfat"))
                       %base-file-systems))

  ;; Define a user account.
  (users (cons* (user-account
                 (name "dev")
                 (comment "Developer")
                 (group "users")
                 (home-directory "/home/dev")
                 (supplementary-groups '("wheel" "netdev" "audio" "video")))
                %base-user-accounts))

  ;; Basic system services.
  (services (cons* (service mingetty-service-type
                            (mingetty-configuration
                             (tty "tty1")))
                   %base-services)))
