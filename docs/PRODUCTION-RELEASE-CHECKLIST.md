# Production Release Checklist

- [x] CI/build/deploy pipeline green
- [x] Transactional tables verified in production
- [x] Production transaction indexes applied
- [x] Field attendance duplicate protection applied
- [x] Database boundary validation for recovery/order quantities applied
- [x] Anonymous execution denied for inspected privileged security-definer RPCs
- [x] No dummy data inserted
- [ ] Approved production master data loaded
- [ ] Employee/auth provisioning verified
- [ ] Production SMTP/OTP delivery verified
- [ ] Google Sheets server-side credentials/webhook verified
- [ ] Real end-to-end order → approval → invoice → inventory → recovery → ledger smoke test
- [ ] Mobile and desktop production smoke test
