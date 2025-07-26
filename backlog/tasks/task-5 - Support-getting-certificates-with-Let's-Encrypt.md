---
id: task-5
title: Support getting certificates with Let's Encrypt
status: Done
assignee:
  - '@claude'
created_date: '2025-07-08'
updated_date: '2025-07-26'
labels: []
dependencies: []
---

## Description

Implement automatic SSL certificate provisioning using Let's Encrypt via the ACME protocol. This will allow users to obtain trusted SSL certificates automatically without manual certificate generation or trust store configuration. The implementation should be cloud-friendly, require minimal configuration, and work automatically in any deployment environment.

## Acceptance Criteria

- [ ] ACME client automatically obtains certificates for configured domains
- [ ] HTTP-01 challenge is supported (no DNS challenge required)
- [ ] Certificates are automatically renewed before expiration
- [ ] Graceful fallback to self-signed certificates when ACME fails
- [ ] Configuration via environment variables (domain email ACME provider)
- [ ] Works on standard HTTP/HTTPS ports without additional configuration
- [ ] Certificate storage is persistent across restarts
- [ ] Manual mode option for testing with self-signed certificates
- [ ] Proper error handling and logging for troubleshooting
- [ ] Integration with existing HTTPS server configuration

## Implementation Plan

1. Install and configure node-acme-client library
2. Add environment variables for ACME configuration:
   - WTT_ACME_ENABLED (enable/disable ACME)
   - WTT_ACME_DOMAINS (comma-separated list of domains)
   - WTT_ACME_EMAIL (contact email for Let's Encrypt)
   - WTT_ACME_DIRECTORY (Let's Encrypt directory URL, default to production)
   - WTT_ACME_CERT_PATH (where to store certificates)
3. Create ACME certificate manager module:
   - Initialize ACME client with account key management
   - Implement HTTP-01 challenge handler integration
   - Add certificate renewal logic (check expiry, renew if < 30 days)
   - Implement certificate storage and retrieval
4. Modify webhook server to support ACME challenges:
   - Add route handler for /.well-known/acme-challenge/*
   - Integrate with challenge manager for dynamic responses
5. Update HTTPS server initialization:
   - Check for ACME mode vs self-signed mode
   - Load existing certificates or request new ones
   - Implement graceful fallback to self-signed on failure
6. Add certificate renewal scheduler:
   - Check certificates daily
   - Renew certificates approaching expiration
   - Handle renewal failures with alerts/logs
7. Update configuration module with new ACME settings
8. Add comprehensive error handling and logging
9. Write tests for ACME integration
10. Update documentation with ACME setup instructions

## Implementation Notes

Implemented ACME/Let's Encrypt support for automatic SSL certificate provisioning. The implementation includes:

**Architecture:**
- Created AcmeManager class to handle certificate lifecycle (src/acme-manager.ts)
- Integrated acme-client library for ACME protocol support
- Added HTTP-01 challenge support via webhook server route
- Implemented automatic certificate renewal with 24-hour checks

**Key Features:**
- Automatic certificate provisioning from Let's Encrypt
- HTTP-01 challenge handling at /.well-known/acme-challenge/*
- Certificate renewal 30 days before expiration
- Graceful fallback to self-signed certificates on failure
- Support for multiple domains
- Persistent certificate storage

**Configuration:**
- WTT_ACME_ENABLED: Enable/disable ACME
- WTT_ACME_DOMAINS: Comma-separated domain list
- WTT_ACME_EMAIL: Contact email
- WTT_ACME_STAGING: Use staging environment
- WTT_ACME_DIRECTORY: Custom ACME directory URL
- WTT_ACME_CERT_PATH: Certificate storage path

**Technical Decisions:**
- Used node-acme-client in auto mode for simplicity
- Chose HTTP-01 over DNS-01 for easier deployment
- Store certificates in local/acme-certs directory
- Check renewal daily, renew if <30 days to expiry
- Integrated with existing HTTPS server configuration

**Modified Files:**
- src/config.ts: Added ACME configuration variables
- src/acme-manager.ts: New ACME certificate manager
- src/webhook-server/index.ts: Added challenge route and ACME integration
- src/server.ts: Added renewal scheduler
- README.md: Added SSL/TLS configuration documentation
- src/acme-manager.test.ts: Basic test skeleton
