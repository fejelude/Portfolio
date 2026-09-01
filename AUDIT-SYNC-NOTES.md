# Sofra synchronization audit notes

This branch is limited to consistency and reliability fixes between Sofra Panel and the Discord bot.

- Welcome settings now expose and persist Sofra's randomized welcome-message mode.
- New Automod defaults match Sofra's moderate preset.
- Automod manager roles are editable in the dashboard while advanced custom rules remain preserved.
- Managed Discord/integration roles are excluded or rejected for features that require Sofra to assign/manage a role.
- Ticket settings require at least one enabled type and the website-generated ticket panel matches Sofra's bot panel content/layout.
- Existing authorization, CSRF, guild-access, and shared-configuration boundaries are unchanged.
