"""External integrations. Each module supports a mock mode (no keys) and a real
mode gated by env config, exposing one interface so the app never branches on
which provider is active beyond `settings.*_MODE`."""
