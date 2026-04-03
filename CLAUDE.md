# MoveIt Pro Robot Configuration Guide

This workspace contains MoveIt Pro robot configuration packages and guides for building them.

**The goal is always a buildable, runnable MoveIt Pro configuration.** Every config package you create must build with `moveit_pro build` and launch with `moveit_pro run`. Do not consider a config complete until it has been built and launched successfully. You should run `moveit_pro build` and `moveit_pro run` yourself and iterate until the config works — do not hand off to the user after creating files. If the user has not explicitly granted permission to build/run, ask once before starting the build/run/verify loop.

**Where to create the config package:** If the user does not specify where to create the config package, **ask them**. Do not assume the current working directory is correct. The config package needs to be somewhere that MoveIt Pro can find it as the active configuration — ask the user where that is and how their workspace is set up.

**Do NOT use the MoveIt Setup Assistant (MSA).** The Setup Assistant is a GUI tool that cannot be driven by Claude. All configuration must be done by hand following the guides below.

**MANDATORY: Task tracking for all guides.** When following any guide in `.claude/`, create a task for each numbered step using `TaskCreate` before you begin. Mark each task `in_progress` when you start it and `completed` when done. Do not skip steps — if a step cannot be completed, stop and ask the user. This includes verification steps (Playwright screenshots, CLI checks, teleop testing). A config is not done until every task from every applicable guide is completed.

## Which Guide to Follow

The workflow depends on what assets you're starting with:

| Starting point | Guide | What it covers |
|---------------|-------|----------------|
| **No URDF** — only CAD files, STLs, or meshes | [Building a URDF from CAD/STL Files](.claude/urdf_from_cad.md) | Construct a URDF from raw mesh files. Then proceed to the mock config guide. |
| **Have a URDF** — need a mock config | [Creating a MoveIt Pro Config](.claude/existing_urdf_config.md) | Create the mock MoveIt Pro configuration package. Includes adding end effectors. |
| **Have a base config** — need physics sim | [Creating a Sim Config](.claude/sim_config.md) | Add physics simulation. Inherits from base config via `based_on_package`. |
| **Have a sim config** — need physical hardware | Physical Config *(coming soon)* | Add real hardware drivers. Inherits from sim config. |
| **Mobile base robot** | Mobile Base + Nav2 *(coming soon)* | Mobile base control and ROS navigation setup. |
| **Config is built** — need to verify it works | [Verification & Testing](.claude/verification.md) | Systematic testing: controllers, objectives, teleop, visual inspection. |
| **Something broke** | [Debugging](.claude/debugging.md) | Log locations, common errors, CLI commands. |
| **Quick reference** | [Complete File Checklist](.claude/file_checklist.md) | Every file needed in a config package. |

**The intended progression is:**
1. Get a URDF (either you have one, or build one from CAD/STLs)
2. Create the mock MoveIt Pro config package (arm + end effector)
3. Build, run, and verify the mock config
4. Create the MuJoCo sim config (inherits from mock, adds physics simulation)
5. Create the physical config (inherits from sim, adds real hardware drivers)

**For topics not yet covered by a guide**, fetch the official MoveIt Pro documentation using `WebFetch` on the relevant URL from the Official Documentation section below.

## Official Documentation

The official MoveIt Pro configuration tutorials live at:

- **Overview & Inheritance**: https://docs.picknik.ai/how_to/configuration_tutorials/robot_and_objective_inheritance/
- **config.yaml Reference**: https://docs.picknik.ai/how_to/configuration_tutorials/config_yaml_reference/
- **Create Mock Config** (the core tutorial sequence):
  1. Get URDF: https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_mock_config/export_cad_to_urdf/
  2. Refactor to Xacro: https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_mock_config/refactor_urdf_to_xacro/
  3. Create Mock Config: https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_mock_config/create_mock_robot_config/
  4. hardware values: https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_mock_config/hardware_configuration/
  5. ros_global_params: https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_mock_config/ros_global_params_configuration/
  6. ros2_control values: https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_mock_config/ros2_control_configuration/
  7. moveit_params values: https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_mock_config/moveit_params_configuration/
  8. objectives values: https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_mock_config/objectives_and_behaviors_configuration/
  9. Run Mock Config: https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_mock_config/run_mock_robot_config/
- **Create Sim Config**: https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_sim_config/create_robot_sim_config/
- **Create Physical Config**: https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_physical_config/create_robot_physical_config/
- **Optimize Meshes**: https://docs.picknik.ai/how_to/configuration_tutorials/optimizing_robot_model_meshes/
- **Third-Party Simulators**: https://docs.picknik.ai/how_to/configuration_tutorials/third_party_simulators/
- **Mobile Base**: https://docs.picknik.ai/how_to/configuration_tutorials/configure_mobile_base/
- **Navigation (Nav2)**: https://docs.picknik.ai/how_to/configuration_tutorials/add_nav2/
- **State Estimation (Fuse)**: https://docs.picknik.ai/how_to/configuration_tutorials/add_fuse/

The intended config progression is: base config (mock hardware) → sim config (inherits from base, adds physics simulation) → physical config (inherits from sim, adds real drivers). Use `based_on_package` in config.yaml for inheritance.

## Naming Convention

Config packages follow this naming pattern:

| Package name | Type | Hardware |
|-------------|------|----------|
| `<robot>_base_config` | Base / mock config | `mock_components/GenericSystem` — no physics |
| `<robot>_sim` | Sim config | `picknik_mujoco_ros/MujocoSystem` — physics simulation |
| `<robot>_hw` or `<robot>_physical` | Physical config | Real hardware drivers |

Each inherits from the previous via `based_on_package` in config.yaml. The base config is always built and verified first.

## Workspace Structure

```
my_robot_ws/
├── Dockerfile                    # Multi-stage Docker build
├── docker-compose.yaml           # Overrides for /opt/moveit_pro/docker-compose.yaml
├── colcon-defaults.yaml          # Colcon build settings
└── src/
    ├── <robot>_base_config/      # Mock hardware config (always create first)
    └── <robot>_sim/              # Sim config (inherits from base, adds physics)
```

### Workspace-Level Files

These three files must exist at the workspace root. `moveit_pro new config` does **not** generate them — you must create them yourself or copy from an existing workspace (e.g., the MoveIt Pro example workspace).

**`Dockerfile`** — Multi-stage Docker build that extends the MoveIt Pro base image. This is standard boilerplate that rarely changes between configs:

```dockerfile
# Specify the MoveIt Pro release to build on top of.
ARG MOVEIT_PRO_BASE_IMAGE=picknikciuser/moveit-studio:${MOVEIT_DOCKER_TAG:-main}-${MOVEIT_ROS_DISTRO:-humble}
ARG USERNAME=moveit-pro-user
ARG USER_UID=1000
ARG USER_GID=1000

# hadolint ignore=DL3006
FROM ${MOVEIT_PRO_BASE_IMAGE} AS base

ARG USERNAME
ARG USER_UID
ARG USER_GID
ARG USER_WS=/home/${USERNAME}/user_ws
ENV USER_WS=${USER_WS}

WORKDIR $USER_WS
# hadolint ignore=DL3008
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    groupadd --gid $USER_GID ${USERNAME} && \
    useradd --uid $USER_UID --gid $USER_GID --shell /bin/bash --create-home ${USERNAME} && \
    apt-get update && \
    apt-get install -q -y --no-install-recommends sudo && \
    echo ${USERNAME} ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/${USERNAME} && \
    chmod 0440 /etc/sudoers.d/${USERNAME} && \
    cp -r /etc/skel/. /home/${USERNAME} && \
    mkdir -p \
      /home/${USERNAME}/.ccache \
      /home/${USERNAME}/.config \
      /home/${USERNAME}/.ignition \
      /home/${USERNAME}/.colcon \
      /home/${USERNAME}/.ros && \
    chown -R $USER_UID:$USER_GID /home/${USERNAME} /opt/overlay_ws/

RUN usermod -aG dialout,video ${USERNAME}
RUN groupadd realtime && usermod -a -G realtime ${USERNAME}

# hadolint ignore=SC1091
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    --mount=type=bind,target=${USER_WS}/src,source=./src \
    . /opt/overlay_ws/install/setup.sh && \
    apt-get update && \
    rosdep install -q -y \
      --from-paths src \
      --ignore-src

USER ${USERNAME}
RUN colcon mixin add default \
    https://raw.githubusercontent.com/colcon/colcon-mixin-repository/master/index.yaml && \
    colcon mixin update && \
    colcon metadata add default \
    https://raw.githubusercontent.com/colcon/colcon-metadata-repository/master/index.yaml && \
    colcon metadata update
COPY colcon-defaults.yaml /home/${USERNAME}/.colcon/defaults.yaml

# hadolint ignore=DL3002
USER root

FROM base AS user-overlay-dev
ARG USERNAME
ARG USER_WS=/home/${USERNAME}/user_ws
ENV USER_WS=${USER_WS}
# hadolint ignore=DL3008
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && \
    apt-get install -y --no-install-recommends less gdb nano tmux
CMD ["/usr/bin/bash"]

FROM base AS user-overlay
ARG USERNAME
ARG USER_WS=/home/${USERNAME}/user_ws
ENV USER_WS=${USER_WS}
WORKDIR $USER_WS
CMD ["/usr/bin/bash"]
```

**`docker-compose.yaml`** — Merges with `/opt/moveit_pro/docker-compose.yaml`. Minimal version:

```yaml
services:
  base: {}
  agent_bridge: {}
  drivers:
    volumes:
      - /dev:/dev
  web_ui: {}
  dev:
    volumes:
      - /dev:/dev
```

**`colcon-defaults.yaml`** — Colcon build settings. Adjust `allow-overriding` if your workspace overlays packages that are also installed as binaries (e.g., `robotiq_description`):

```yaml
build:
  symlink-install: true
  allow-overriding: []
  mixin:
    - ccache
    - lld
    - compile-commands
    - rel-with-deb-info
    - build-testing-on
test:
  event-handlers:
    - console_direct+
    - desktop_notification+
```

## Quick Reference: Building & Running

```bash
moveit_pro configure -w <workspace_dir> -c <config_package_name>  # Point MoveIt Pro at a workspace and config
moveit_pro build                  # Build the workspace (runs inside Docker)
moveit_pro build user_workspace   # Rebuild only the ROS workspace (faster, no Docker image rebuild)
moveit_pro run                    # Launch MoveIt Pro
moveit_pro down                   # Stop and remove all MoveIt Pro containers
moveit_pro new config             # Scaffold a new config package from template (workspace-level files NOT included)
```

**Important:** Before your first `moveit_pro build`, you must run `moveit_pro configure` to tell MoveIt Pro which workspace directory and config package to use. `moveit_pro new config` scaffolds a config package inside `src/` but does **not** create the workspace-level files (`Dockerfile`, `docker-compose.yaml`, `colcon-defaults.yaml`) — you must add those yourself.

`moveit_pro build` is the standard way to build the workspace (runs inside Docker). `colcon` may also be available on the host for power users, but default to `moveit_pro build`.

## Visual Verification Setup

MoveIt Pro's web UI runs at `http://localhost`. To enable autonomous visual verification (screenshots that Claude can analyze), install Playwright:

```bash
# Requires Node.js (v18+)
cd <workspace>/ui_testing   # or any convenient location
npm init -y
npm install playwright @playwright/test
npx playwright install chromium
```

A screenshot capture script is provided in this repo at `~/robot_configuration_setup/ui_testing/capture.js`. Usage:

```bash
node ~/robot_configuration_setup/ui_testing/capture.js --output /tmp/moveit_pro_ui.png --wait 8000
```

This captures a 1920x1080 screenshot of the MoveIt Pro UI and reports any visible toast/alert messages as JSON. The `--wait` parameter (milliseconds) controls how long to wait after page load for the 3D view to render.

The captured screenshot can then be read by Claude to verify robot visualization, gripper orientation, and UI error states. This is used in [Verification & Testing](.claude/verification.md) Step 5.

## Prerequisites

- MoveIt Pro installed and licensed
- **Node.js and Playwright** (for automated visual verification) — see "Visual Verification Setup" above
- A URDF for your robot (or CAD/STL files to build one — see [Building a URDF from CAD/STL Files](.claude/urdf_from_cad.md))
