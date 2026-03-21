# CLAUDE.md Verification Checklist

Assumptions in CLAUDE.md that need to be verified before we can trust them. Work through each item, update CLAUDE.md accordingly, and check it off.

## Must Verify

- [ ] **VFC requires F/T sensor** (line ~171): "VFC requires a force/torque sensor; if your robot doesn't have one, define it but it won't be usable for pose jogging." — Is this true? Can VFC work without one, even in degraded mode? Check VFC source or docs.

- [ ] **Z offset heuristic for gripper mounting** (line ~408): The guide suggests estimating flange face position from the last link's inertial origin Z. This is a rough heuristic with made-up example numbers. Options: (a) find a reliable method, (b) just say "visually verify" and drop the heuristic, (c) suggest checking the visual mesh dimensions. Need to decide.

- [ ] **`%>> hardware.simulated` version requirement** (line ~525): Claims this requires "MoveIt Pro 8.8+". The version number may be wrong. Check MoveIt Pro release notes or changelog.

- [ ] **Docker service name `dev`** (lines ~706-717): All debug commands use `docker compose exec dev bash -c ...`. Is `dev` always the service name, or does it vary by workspace? Check a few MoveIt Pro workspace docker-compose files.

- [ ] **`moveit_pro dev decimate_mesh` subcommand** (line ~680): Verify this command exists. Run `moveit_pro dev --help` or check MoveIt Pro CLI docs.

- [ ] **Gripper always runs as separate ros2_control system** (line ~566): "The gripper runs as a separate `ros2_control` `<system>` from the arm." True for Robotiq macros with `include_ros2_control="true"`, but is this always the case? Some grippers might be integrated into the arm's ros2_control system. Should we qualify this statement?

- [ ] **Controller parameter template correctness** (lines ~175-247): The exact `ros__parameters` for JVC and VFC (command_interfaces, state_interfaces, etc.) were inferred from one example config. Verify against MoveIt Pro controller source or docs that these are the correct/minimum required parameters.

## Already Resolved

- [x] **`based_on_package` in config.yaml** — Trusting official docs links (decision: keep as-is)
- [x] **`colcon` on host** — Update to say `moveit_pro build` is the default, but colcon may be available for power users
- [x] **`manipulator` hardcoded** — Confirmed valid assumption (keep as-is)
- [x] **JTAC falls back without F/T sensor** — Confirmed true (keep as-is)
- [x] **Kinova configs use 180° Z rotation** — Confirmed true (keep as-is)
