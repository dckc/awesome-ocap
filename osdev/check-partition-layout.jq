# jq script to validate the partition table of the target disk using lsblk output.
#
# It checks for:
# - At least four partitions
# - Correct partlabel, size (in bytes), and parttype UUID for the first four partitions
#
# Exits with status 0 if all checks pass, non-zero otherwise.
( .blockdevices[0].children | length >= 4 ) and
( .blockdevices[0].children[0] | .partlabel == "ESP"    and .size == 1073741824 and .parttype == "c12a7328-f81f-11d2-ba4b-00a0c93ec93b" ) and
( .blockdevices[0].children[1] | .partlabel == "Guix"   and .size == 107374182400 and .parttype == "0fc63daf-8483-4772-8e79-3d69d8477de4" ) and
( .blockdevices[0].children[2] | .partlabel == "Genode" and .size == 21474836480 and .parttype == "0fc63daf-8483-4772-8e79-3d69d8477de4" ) and
( .blockdevices[0].children[3] | .partlabel == "Shared" and .size == 214748364800 and .parttype == "0fc63daf-8483-4772-8e79-3d69d8477de4" )
