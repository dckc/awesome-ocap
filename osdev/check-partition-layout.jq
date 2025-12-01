# jq script to transform lsblk json output to a canonical representation
# for comparison. It extracts the partlabel, size, and parttype from the
# first four partitions.
# If the disk has no partitions, it produces an empty array.
(.blockdevices[0].children // [])[:4] | map({partlabel, size, parttype})
