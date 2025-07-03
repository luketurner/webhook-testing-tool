#!/bin/bash

# Generate a self-signed certificate for development
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

echo "Self-signed certificate generated:"
echo "- Certificate: cert.pem"
echo "- Private key: key.pem"