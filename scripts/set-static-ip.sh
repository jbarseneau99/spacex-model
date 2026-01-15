#!/bin/bash

# Script to set static IP address to 10.88.111.1
# This matches your router's port forwarding configuration

echo "=== Setting Static IP Address ==="
echo ""
echo "Current IP: $(ifconfig en1 | grep 'inet ' | awk '{print $2}')"
echo ""
echo "Setting static IP to 10.88.111.1..."
echo "This requires administrator privileges."
echo ""

# Set static IP
sudo networksetup -setmanual "Ethernet" 10.88.111.1 255.255.255.0 10.88.111.254

# Set DNS servers (from your router config)
sudo networksetup -setdnsservers "Ethernet" 66.207.192.6 206.223.173.7

echo ""
echo "Waiting for network to reconfigure..."
sleep 3

# Verify new IP
NEW_IP=$(ifconfig en1 | grep 'inet ' | awk '{print $2}')
echo "New IP address: $NEW_IP"

if [ "$NEW_IP" = "10.88.111.1" ]; then
    echo "✅ Successfully set IP to 10.88.111.1"
    echo ""
    echo "Testing connectivity..."
    ping -c 2 10.88.111.254 > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ Gateway is reachable"
    else
        echo "⚠️  Warning: Cannot reach gateway"
    fi
else
    echo "⚠️  IP address is $NEW_IP (expected 10.88.111.1)"
    echo "There may be an IP conflict with another device."
fi

echo ""
echo "Note: If 10.88.111.1 is already in use, you may need to:"
echo "1. Check what device is using 10.88.111.1"
echo "2. Change that device's IP or disconnect it"
echo "3. Or update your router's port forwarding to use 10.88.111.4 instead"













