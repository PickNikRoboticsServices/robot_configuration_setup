# MoveIt Pro Robot Configuration Guide

This workspace contains MoveIt Pro robot configuration packages. This guide covers building configs from two starting points: an existing URDF, or raw inputs (STLs/meshes).

**The goal is always a buildable, runnable MoveIt Pro configuration.** Every config package you create must build with `moveit_pro build` and launch with `moveit_pro run`. Do not consider a config complete until it has been built and launched successfully. Before running `moveit_pro build` or `moveit_pro run`, ask the user for permission — these commands start Docker containers and may take significant time.

**Where to create the config package:** If the user does not specify where to create the config package, **ask them**. Do not assume the current working directory is correct. The config package needs to be somewhere that MoveIt Pro can find it as the active configuration — ask the user where that is and how their workspace is set up.

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

The intended progression is: mock config → sim config (inherits from mock, adds MuJoCo) → physical config (inherits from sim, adds real drivers). Use `based_on_package` in config.yaml for inheritance.

## Workspace Structure

```
fairino_ws/
├── Dockerfile                    # Multi-stage Docker build
├── docker-compose.yaml           # Overrides for /opt/moveit_pro/docker-compose.yaml
├── colcon-defaults.yaml          # Colcon build settings
└── src/
    └── <config_package>/         # One or more config packages
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
moveit_pro run                    # Launch MoveIt Pro
moveit_pro new config             # Scaffold a new config package from template (workspace-level files NOT included)
```

**Important:** Before your first `moveit_pro build`, you must run `moveit_pro configure` to tell MoveIt Pro which workspace directory and config package to use. `moveit_pro new config` scaffolds a config package inside `src/` but does **not** create the workspace-level files (`Dockerfile`, `docker-compose.yaml`, `colcon-defaults.yaml`) — you must add those yourself.

`moveit_pro build` is the standard way to build the workspace (runs inside Docker). `colcon` may also be available on the host for power users, but default to `moveit_pro build`.

---

## Part 1: Building a Config from an Existing URDF

### Prerequisites

- A valid URDF or XACRO file for the robot
- Joint names, link names, and kinematic chain known
- MoveIt Pro installed and licensed

### Step-by-Step

#### 1. Scaffold the Package

```bash
moveit_pro new config
```

Or manually create the directory structure:

```
<package_name>/
├── CMakeLists.txt
├── package.xml
├── config/
│   ├── config.yaml
│   ├── control/<robot>_ros2_control.yaml
│   └── moveit/
│       ├── <robot>.srdf
│       ├── kinematics.yaml
│       ├── joint_limits.yaml
│       ├── joint_jog.yaml
│       ├── pose_jog.yaml
│       └── sensors_3d.yaml
├── description/
│   ├── <robot>.urdf.xacro
│   └── <robot>.ros2_control.xacro
├── launch/
│   └── agent_bridge.launch.xml
├── objectives/
│   └── move_to_home.xml
└── waypoints/
    └── waypoints.yaml
```

#### 2. Robot Description (description/)

**`<robot>.urdf.xacro`** — Wraps the existing URDF and adds ros2_control.

Some robot descriptions provide a plain URDF file you can include directly:
```xml
<?xml version="1.0"?>
<robot xmlns:xacro="http://www.ros.org/wiki/xacro" name="my_robot">
    <!-- World frame — required by MoveIt Pro for TF resolution -->
    <link name="world" />
    <joint name="world_fixed" type="fixed">
        <parent link="world" />
        <child link="base_link" />
        <origin xyz="0 0 0" rpy="0 0 0" />
    </joint>

    <xacro:include filename="$(find my_robot_description)/urdf/my_robot.urdf" />
    <xacro:include filename="my_robot.ros2_control.xacro" />
    <xacro:my_robot_ros2_control name="MyRobotSystem" />
</robot>
```

Many robot descriptions instead expose a **xacro macro** that must be included and then invoked. Check the source package's xacro files — if the robot's links and joints are wrapped in a `<xacro:macro>` block, you need to call the macro:
```xml
<?xml version="1.0"?>
<robot xmlns:xacro="http://www.ros.org/wiki/xacro" name="my_robot">
    <!-- World frame — required by MoveIt Pro for TF resolution -->
    <link name="world" />
    <joint name="world_fixed" type="fixed">
        <parent link="world" />
        <child link="base_link" />
        <origin xyz="0 0 0" rpy="0 0 0" />
    </joint>

    <!-- Include the macro definition file -->
    <xacro:include filename="$(find my_robot_description)/xacro/macro.my_robot.xacro" />
    <!-- Invoke the macro to generate the robot links and joints -->
    <xacro:my_robot namespace="" />

    <xacro:include filename="my_robot.ros2_control.xacro" />
    <xacro:my_robot_ros2_control name="MyRobotSystem" />
</robot>
```

**The `world` frame is required.** MoveIt Pro expects a `world` link as the TF root. If your source robot description doesn't define one (or defines it in its own top-level xacro that you're not using), you must add it in your wrapper. Without it, IMarker teleop will fail with "Timed out waiting for a TF between base_link and world" and IK queries may silently fail. Some robot macros define `world` internally — check before adding a duplicate, which will cause a URDF error.

Note: When using a macro-based description, you typically write your own `ros2_control.xacro` with `mock_components/GenericSystem` rather than using the source package's ros2_control (which often pulls in real hardware driver plugins).

**Watch for hidden xacro arg dependencies:** Some robot macros include sub-macros (e.g., Gazebo plugins, transmission definitions) that reference `$(arg ...)` xacro arguments. These are resolved at the **top-level file scope**, not inside the macro. If you include the macro file directly rather than the robot's own top-level xacro, those args won't be declared and xacro will fail with a `KeyError`. **Always check what `$(arg ...)` references exist in the included files** (including transitively-included files like gazebo or transmission macros) and declare matching `<xacro:arg name="..." default="..."/>` elements in your wrapper xacro.

**Watch for unwanted simulator dependencies:** Many robot description packages unconditionally include Gazebo, Ignition, or MuJoCo plugin macros that reference packages not in your workspace (e.g., a Gazebo controller config package). These will cause `PackageNotFoundError` at runtime even though you don't need the simulator. **Read the robot macro's includes** — if you see `<xacro:include>` for gazebo/ignition/mujoco config files, and those files reference packages you don't have, comment out the invocation of that macro in your local copy of the robot description.

**`<robot>.ros2_control.xacro`** — Defines hardware interface for each joint:
- Use `mock_components/GenericSystem` for simulation
- List every joint with `<command_interface>` (position) and `<state_interface>` (position, velocity)

#### 3. SRDF (config/moveit/<robot>.srdf)

Critical decisions:
- **Planning group name**: Use `manipulator` — MoveIt Pro hardcodes this name in several places (joint_velocity_controller, JTAC, teleop objectives)
- **Chain**: Set `base_link` and `tip_link` for your kinematic chain. **If you have a gripper with a `grasp_link`, set `tip_link` to `grasp_link`** — this is required for pose jog (VFC) to work, as it expects `ee_frame` to be the tip of the planning group's chain. If there is no end effector, use the tool flange link (e.g., `link_6`, `tool0`). **How to identify the tool flange link**: find the last joint in the arm's kinematic chain — its child link is the tool flange. Not every robot defines a `tool0` or `tool_link`; some just use the final numbered link.
- **Collision pairs**: Run the MoveIt Setup Assistant or manually disable collisions between adjacent/never-colliding links. If Setup Assistant is not available, use this minimum checklist:
  1. All adjacent link pairs (connected by a joint) — `reason="Adjacent"`
  2. Near-neighbor pairs (separated by one joint) — `reason="Never"`
  3. `base_link` ↔ second link (often can't collide due to geometry) — `reason="Never"`
  4. If a gripper is attached: tool flange ↔ gripper base, and the link before the flange ↔ gripper base — see Part 1b for gripper-specific pairs
  5. **Test the zero/home pose** — if it reports self-collision, you're missing a `disable_collisions` entry

```xml
<group name="manipulator">
    <chain base_link="base_link" tip_link="tool_link"/>
</group>
<group_state name="home" group="manipulator">
    <!-- Set joint values to a known safe pose, NOT all zeros if that causes collision -->
</group_state>
```

#### 3b. Kinematics (config/moveit/kinematics.yaml)

MoveIt Pro uses `PoseIKPlugin` (not KDL). The full configuration:

```yaml
manipulator:
  kinematics_solver: pose_ik_plugin/PoseIKPlugin
  target_tolerance: 0.001
  solve_mode: "optimize_distance"
  optimization_timeout: 0.005
```

The `solve_mode: "optimize_distance"` setting and `optimization_timeout` are important for IMarker teleop — without them, IK solutions may fail or be slow. The group key (`manipulator`) must match your SRDF planning group name.

#### 4. Controllers (config/control/<robot>_ros2_control.yaml)

MoveIt Pro expects these controllers to exist. They must be defined in your ros2_control yaml AND listed in either `controllers_active_at_startup` or `controllers_inactive_at_startup` in config.yaml:

| Controller | Type | Startup | Purpose |
|-----------|------|---------|---------|
| `joint_state_broadcaster` | `joint_state_broadcaster/JointStateBroadcaster` | **active** | Publishes /joint_states (required) |
| `joint_trajectory_admittance_controller` | `joint_trajectory_admittance_controller/JointTrajectoryAdmittanceController` | **active** | Trajectory execution with optional admittance |
| `velocity_force_controller` | `velocity_force_controller/VelocityForceController` | inactive | Pose-based teleoperation |
| `joint_velocity_controller` | `joint_velocity_controller/JointVelocityController` | inactive | Joint-based teleoperation |

The velocity/joint controllers claim the same hardware resources as the trajectory controller, so they cannot be active simultaneously. MoveIt Pro activates them on demand during teleop.

All three custom controllers (`JTAC`, `VFC`, `JVC`) must reference `planning_group_name: manipulator`.

JTAC works without a force/torque sensor — it falls back to behaving like a standard JTC. VFC should also work without an F/T sensor (set `ft_sensor_name: ""`), though pose jogging may require additional configuration to function correctly without one. If pose jog / IMarker doesn't work, check the VFC controller logs for errors.

Note: You can use a basic `joint_trajectory_controller/JointTrajectoryController` instead of JTAC at startup, but MoveIt Pro's teleop will still try to switch to JTAC, so it must at minimum be defined and inactive.

**Full controller parameter template** — replace joint names with your robot's joints:

```yaml
controller_manager:
  ros__parameters:
    update_rate: 100

    joint_state_broadcaster:
      type: joint_state_broadcaster/JointStateBroadcaster

    joint_trajectory_admittance_controller:
      type: joint_trajectory_admittance_controller/JointTrajectoryAdmittanceController

    joint_velocity_controller:
      type: joint_velocity_controller/JointVelocityController

    velocity_force_controller:
      type: velocity_force_controller/VelocityForceController

joint_trajectory_admittance_controller:
  ros__parameters:
    planning_group_name: manipulator
    sensor_frame: <tool_flange_link>
    ee_frame: grasp_link
    ft_sensor_name: ""
    stop_accelerations: [30.0, 30.0, 30.0, 30.0, 30.0, 30.0]
    ft_cutoff_frequency_ratio: 1.0
    ft_force_deadband: 0.0
    ft_torque_deadband: 0.0

joint_velocity_controller:
  ros__parameters:
    planning_group_name: manipulator
    command_interfaces: ["position"]
    max_joint_velocity:
      - 1.0
      - 1.0
      - 1.0
      - 1.0
      - 1.0
      - 1.0
    max_joint_acceleration:
      - 3.0
      - 3.0
      - 3.0
      - 3.0
      - 3.0
      - 3.0

velocity_force_controller:
  ros__parameters:
    planning_group_name: manipulator
    sensor_frame: grasp_link
    ee_frame: grasp_link
    ft_sensor_name: ""
    ft_force_deadband: 0.0
    ft_torque_deadband: 0.0
    stop_accelerations: [30.0, 30.0, 30.0, 30.0, 30.0, 30.0]
    max_joint_velocity:
      - 1.0
      - 1.0
      - 1.0
      - 1.0
      - 1.0
      - 1.0
    max_joint_acceleration:
      - 2.0
      - 2.0
      - 2.0
      - 2.0
      - 2.0
      - 2.0
    max_cartesian_velocity:
      - 0.25
      - 0.25
      - 0.25
      - 1.0
      - 1.0
      - 1.0
    max_cartesian_acceleration:
      - 2.0
      - 2.0
      - 2.0
      - 4.0
      - 4.0
      - 4.0
```

#### 5. Jog Configuration (config/moveit/)

The `planning_groups` and `controllers` arrays must have the same length — they are paired by index.

**`joint_jog.yaml`** — Joint-space teleop, uses Joint Velocity Controller:
```yaml
planning_groups: ['manipulator']
controllers: ['joint_velocity_controller']
```

**`pose_jog.yaml`** — Cartesian-space teleop, uses Velocity Force Controller:
```yaml
planning_groups: ['manipulator']
controllers: ['velocity_force_controller']
```

If your robot has no F/T sensor, pose jog via VFC won't work. You can point it to `joint_velocity_controller` as a fallback, but Cartesian jogging will be limited.

#### 6. Master Config (config/config.yaml)

This is the most complex file in the config package. **All sections shown below are required** — MoveIt Pro validates the config at startup and will refuse to launch if fields are missing. The template below is a complete, working starting point:

```yaml
hardware:
  simulated: true
  launch_control_node: true
  launch_robot_state_publisher: true
  robot_description:
    urdf:
      package: "<package>"
      path: "description/<robot>.urdf.xacro"
    srdf:
      package: "<package>"
      path: "config/moveit/<robot>.srdf"
    urdf_params:
      - use_fake_hardware: "true"

moveit_params:
  joint_group_name: "manipulator"    # Must match SRDF group name
  kinematics:
    package: "<package>"
    path: "config/moveit/kinematics.yaml"
  sensors_3d:
    package: "<package>"
    path: "config/moveit/sensors_3d.yaml"
  joint_limits:
    package: "<package>"
    path: "config/moveit/joint_limits.yaml"
  pose_jog:
    package: "<package>"
    path: "config/moveit/pose_jog.yaml"
  joint_jog:
    package: "<package>"
    path: "config/moveit/joint_jog.yaml"
  publish:
    planning_scene: true
    geometry_updates: true
    state_updates: true
    transforms_updates: true
  trajectory_execution:
    manage_controllers: true
    allowed_execution_duration_scaling: 2.0
    allowed_goal_duration_margin: 5.0
    allowed_start_tolerance: 0.01

ros2_control:
  config:
    package: "<package>"
    path: "config/control/<robot>_ros2_control.yaml"
  controllers_active_at_startup:
    - "joint_state_broadcaster"
    - "joint_trajectory_admittance_controller"
  controllers_inactive_at_startup:
    - "joint_velocity_controller"
    - "velocity_force_controller"

objectives:
  behavior_loader_plugins:
    core:
      - "moveit_pro::behaviors::CoreBehaviorsLoader"
      - "moveit_pro::behaviors::MTCCoreBehaviorsLoader"
      - "moveit_pro::behaviors::VisionBehaviorsLoader"
      - "moveit_pro::behaviors::ConverterBehaviorsLoader"
  objective_library_paths:
    core_objectives:
      package_name: "moveit_pro_objectives"
      relative_path: "objectives/core"
    motion_objectives:
      package_name: "moveit_pro_objectives"
      relative_path: "objectives/motion"
    perception_objectives:
      package_name: "moveit_pro_objectives"
      relative_path: "objectives/perception"
    <robot>_objectives:
      package_name: "<package>"
      relative_path: "objectives"
  waypoints_file:
    package_name: "<package>"
    relative_path: "waypoints/waypoints.yaml"
```

**Notes:**
- Every `moveit_params` sub-field (`kinematics`, `sensors_3d`, `joint_limits`, `pose_jog`, `joint_jog`) is **required** and must point to a file that exists in your package. MoveIt Pro will refuse to launch if any are missing.
- The `ros2_control.config` field (package + path to your controller yaml) is **required**.
- The `objectives` section must include `behavior_loader_plugins`, `objective_library_paths`, and `waypoints_file`. The core objective library paths (`core_objectives`, `motion_objectives`, `perception_objectives`) point to built-in MoveIt Pro objectives and should always be included. Add your own package's objectives as an additional entry.
- `waypoints_file` lives under `objectives`, not as a separate top-level section.

#### 7. Waypoints (waypoints/waypoints.yaml)

Must be a valid YAML list (not empty or comment-only). Initialize with at least one waypoint:

```yaml
- name: Home
  joint_group_names:
    - manipulator
  joint_state:
    header:
      frame_id: world
      stamp:
        sec: 0
        nanosec: 0
    name: [j1, j2, j3, j4, j5, j6]
    position: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
    velocity: []
    effort: []
  multi_dof_joint_state:
    header:
      frame_id: ''
      stamp:
        sec: 0
        nanosec: 0
    joint_names: []
    transforms: []
    twist: []
    wrench: []
  description: ''
  favorite: false
```

MoveIt Pro will update this file when you save waypoints from the UI.

**Waypoint joint values are robot-specific.** The joint positions must be within your robot's joint limits and free of self-collision. Do not copy waypoint values from another robot's config. When creating waypoints for a new robot:

1. **Home**: Choose an "elbow up" or tucked configuration — not all-zeros, which is often a singularity or fully extended pose. Bend the elbow and wrist joints to a clearly non-singular pose.
2. **Ready** (or a second test waypoint): Choose a pose that is visibly different from Home — rotate the base joint and change the elbow angle. This ensures motion planning tests actually exercise the planner rather than no-op at the current position.
3. **Verify both poses visually** in the MoveIt Pro UI or RViz before using them in objectives. If either pose shows collision warnings, adjust the joint values.
4. **Joint count must match your robot** — a 7-DOF arm needs 7 values in the `position` array, a 6-DOF needs 6.

#### 8. Objectives (objectives/)

Every config should include at least one test objective to verify the motion planning pipeline works end-to-end. The "Move to Home" objective below retrieves a saved waypoint and plans/executes a motion to it:

**`objectives/move_to_home.xml`:**
```xml
<?xml version="1.0" encoding="UTF-8" ?>
<root BTCPP_format="4" main_tree_to_execute="Move to Home">
  <BehaviorTree ID="Move to Home">
    <Control ID="Sequence" name="root">
      <Action
        ID="RetrieveWaypoint"
        waypoint_joint_state="{target_joint_state}"
        waypoint_name="Home"
        joint_group_name="manipulator"
      />
      <SubTree
        ID="Move to Joint State"
        target_joint_state="{target_joint_state}"
        joint_group_name="manipulator"
        controller_names="joint_trajectory_admittance_controller"
        controller_action_server="/joint_trajectory_admittance_controller/follow_joint_trajectory"
        execution_pipeline="jtac"
        velocity_scale_factor="0.5"
        acceleration_scale_factor="0.5"
      />
    </Control>
  </BehaviorTree>
  <TreeNodesModel>
    <SubTree ID="Move to Home">
      <MetadataFields>
        <Metadata runnable="true" />
        <Metadata subcategory="Motion" />
      </MetadataFields>
    </SubTree>
  </TreeNodesModel>
</root>
```

**Key points:**
- `RetrieveWaypoint` loads a named waypoint from `waypoints/waypoints.yaml`. The output port is `waypoint_joint_state` (not `waypoint`).
- `Move to Joint State` is a built-in SubTree (from `moveit_pro_objectives`) that handles planning and execution.
- `controller_names` and `controller_action_server` must match your active trajectory controller.
- `velocity_scale_factor` and `acceleration_scale_factor` (0.0–1.0) control execution speed — start conservative at 0.5.
- `runnable="true"` in the metadata makes the objective visible in the UI and callable from CLI.
- The `waypoint_name` must match a waypoint defined in `waypoints/waypoints.yaml`.
- **These objective files are reusable across robots** — they reference waypoint names, not joint values. The robot-specific part is in `waypoints.yaml`. You can copy `move_to_home.xml` and `move_to_ready.xml` to a new config without modification, as long as the waypoints file defines "Home" and "Ready" entries with valid poses for that robot.

**Testing from CLI:**
```bash
ros2 action send_goal --feedback /do_objective \
  moveit_studio_sdk_msgs/action/DoObjectiveSequence \
  "{objective_name: 'Move to Home'}"
```

#### 9. Launch File (launch/agent_bridge.launch.xml)

Standard boilerplate — rarely needs changes:

```xml
<launch>
  <include file="$(find-pkg-share moveit_studio_agent)/launch/studio_agent_bridge.launch.xml" />
  <include file="$(find-pkg-share moveit_studio_rest_api)/launch/rest_api.launch.xml" />
</launch>
```

### Common Issues & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `agent_bridge.launch.xml not found` | Package not rebuilt after adding file | `moveit_pro build` |
| `Group 'manipulator' not found` | SRDF uses a different group name | Rename group to `manipulator` in SRDF and all config files |
| `Joint Velocity Controller parameters not found` | `joint_velocity_controller` not defined in ros2_control yaml | Add JVC to controller_manager and its params |
| `SwitchController: controller X not existing` | Controller not in ros2_control yaml | Add controller definition and register in config.yaml |
| `self-collision` at start | Missing `disable_collisions` in SRDF | Add the reported link pair to SRDF disable_collisions |
| `edit_waypoints service not available` | waypoints.yaml is empty or invalid | Initialize with a valid YAML list (at least one waypoint) |
| Teleop jog doesn't work | joint_jog.yaml points to wrong controller | Set `controllers: ['joint_velocity_controller']` |
| `KDLKinematicsPlugin failed to load` | MoveIt Pro uses `PoseIKPlugin`, not KDL | Change kinematics.yaml solver to `pose_ik_plugin/PoseIKPlugin` |
| `sensor_frame` parameter errors | JTAC/VFC `sensor_frame` or `ee_frame` misconfigured | Use singular form: `sensor_frame: <link>` and `ee_frame: grasp_link`. Both must exist in the kinematic chain. |
| `No inverse kinematics solution found` (IMarker) | IK solver misconfigured or `ee_frame` not the chain tip | Ensure kinematics.yaml has `solve_mode: "optimize_distance"` and `optimization_timeout: 0.005`. Ensure SRDF chain tip = `grasp_link` and VFC/JTAC `ee_frame: grasp_link`. |
| `Expected 'value' ... got '()' of type 'tuple'` | A YAML config file contains an empty list `[]` (e.g., `sensors: []`) | ROS2 parameters cannot represent empty lists — they become empty tuples in the launch system and crash. Remove the key entirely or give it a non-empty value |
| `parameter '' has invalid type: expected [double_array] got [not set]` | Controller (JTAC, VFC, or JVC) is missing required array parameters | JTAC needs `sensor_frame`, `ee_frame`, `ft_sensor_name`, `stop_accelerations`. VFC/JVC need `max_joint_velocity`, `max_joint_acceleration`. See controller template |
| `parameter 'state_publish_rate' has invalid type: expected [integer] got [double]` | Rate parameter is `100.0` instead of `100` | Use integer values (no decimal point) for `state_publish_rate` and `action_monitor_rate` |

**Critical: No empty lists in YAML config files.** ROS2 node parameters cannot represent empty lists. If a YAML file loaded as parameters contains `key: []`, the launch system converts it to an empty tuple `()` and crashes with the `Expected 'value'` error. Either remove the key or provide a valid non-empty value. This most commonly affects `sensors_3d.yaml` — if you have no 3D sensors, use:

```yaml
# Minimal sensors_3d.yaml for configs with no 3D sensors
octomap_resolution: 0.01
octomap_frame: "world"
```

Do **not** include `sensors: []`.

---

## Part 1b: Adding an End Effector

This section covers attaching an end effector to an existing arm config. The term "end effector" covers a wide range of tooling: parallel-jaw grippers, vacuum grippers, spray heads, welding torches, custom fixtures, and more. The steps below are written generically — you will need to read your specific end effector's URDF/xacro source files to determine the actual link names, joint names, joint types, and control interfaces.

### Before You Start: Read the End Effector Source

Before writing any config, open the end effector's xacro files and answer these questions:

1. **What is the macro name and what parameters does it accept?** Look for `<xacro:macro name="..." params="...">`.
2. **What links does it create?** Find all `<link name="...">` elements. Identify the base link (the one attached to the arm).
3. **What joints does it create?** Find all `<joint>` elements. Note which are `fixed`, `revolute`, `prismatic`, or `continuous`.
4. **Which joints are actuated vs. mimic?** Read the `ros2_control.xacro` — actuated joints have a `<command_interface>`. Mimic joints follow an actuated joint and should not be commanded directly.
5. **Does the macro add internal rotations?** Look for fixed joints with non-zero `rpy` values between the parent attachment point and the functional base. These compound with any rotation you apply externally.
6. **What are the joint limits and default positions?** Check `<limit>` tags and `initial_value` parameters in the ros2_control xacro.

For end effectors **without joints** (e.g., a fixed vacuum cup or spray head), several steps below simplify: there is no controller, no group states, no passive joints, and the SRDF group may contain only the links and `grasp_link`.

### Overview of Changes

Adding an end effector touches **every layer** of the config:

| File | What to add |
|------|-------------|
| `package.xml` | Dependency on end effector description package |
| `description/<robot>.urdf.xacro` | Include end effector macro, attach to tool flange, add `grasp_link` |
| `config/moveit/<robot>.srdf` | End effector group, end effector definition, named states (if applicable), passive joints (if applicable), collision pairs |
| `config/control/<robot>_ros2_control.yaml` | End effector controller in controller_manager + params (if actuated) |
| `config/config.yaml` | End effector controller in `controllers_active_at_startup` (if actuated), `urdf_params` for fake hardware |
| `objectives/` | Activate/deactivate objectives (e.g., open/close for grippers, on/off for vacuum) |

### Step 1: Add End Effector Description Dependency

The end effector's URDF package must be available in your workspace:
- Add as a git submodule, or
- Copy from another workspace into `src/`, or
- Clone directly into `src/`

**Do not use symlinks.** Symlinks do not survive Docker build context — the Docker build copies file contents, not symlink targets. Your build will succeed (colcon resolves the symlink on the host), but at runtime inside the container the package will be missing. Always copy the package.

**Binary package conflicts:** If `rosdep install` installs a binary version of the same package (e.g., `ros-humble-robotiq-description`), your source copy must override it. Add the package name to `allow-overriding` in `colcon-defaults.yaml`:
```yaml
build:
  allow-overriding:
    - robotiq_description
```

Add to `package.xml`:
```xml
<exec_depend>my_end_effector_description</exec_depend>
```

### Step 2: Attach End Effector in URDF XACRO

Include the end effector macro and attach it to the arm's tool flange link. The exact macro call depends entirely on your end effector — read the source xacro to determine the macro name and parameters.

```xml
<!-- Include the end effector macro definition -->
<xacro:include filename="$(find my_end_effector_description)/urdf/my_end_effector_macro.urdf.xacro" />

<!-- Invoke the macro, attaching to the arm's tool flange -->
<xacro:my_end_effector_macro
    name="MyEndEffectorHardwareInterface"
    prefix=""
    parent="<tool_flange_link>"
    use_fake_hardware="$(arg use_fake_hardware)">
    <origin xyz="0 0 0" rpy="0 0 ${pi}" />
</xacro:my_end_effector_macro>
```

**Key parameters:**
- `parent` — Your arm's tool flange link (e.g., `link_6`, `wrist3_link`, `tool0`). See Part 1 Step 3 for how to identify this.
- `origin` rotation — **Start with `rpy="0 0 ${pi}"` (180° Z rotation) as the default.** Most end effector URDF macros define their Z axis pointing into the mounting flange. Without this rotation, the tool will point back toward the arm. **However**, some macros add their own internal rotation via fixed joints between the parent attachment and the base. Read the macro source first — look for fixed joints with non-zero `rpy` values. Your externally-applied rotation compounds with any internal one, so you may need to adjust. **Always visually verify after building.**
- `origin` Z offset — The `xyz` Z value must place the end effector flush against the arm's **flange face**. Many arm URDFs place the last link's origin at the joint center, not at the flange surface. If the end effector appears embedded inside the wrist, add a positive Z offset. Check the arm's URDF for the last link's visual mesh or inertial origin to estimate the flange face position. **Always visually verify there is no overlap or gap.**
- `use_fake_hardware` — Pass through from config.yaml for sim/real switching. Not all end effector macros accept this parameter — check the macro definition.
- `prefix` — Use `""` for single-arm setups; use a prefix for dual-arm or multi-tool setups.

**Add a grasp/tool link** — a planning frame that represents where the tool acts on the world:

```xml
<link name="grasp_link" />
<joint name="grasp_link_joint" type="fixed">
    <parent link="<end_effector_base_link>" />
    <child link="grasp_link" />
    <origin xyz="0 0 <offset>" rpy="0 0 0" />
</joint>
```

The purpose of `grasp_link` is to give the motion planner a target frame. Where you place it depends on the type of end effector:
- **Parallel-jaw gripper**: Between the fingertips at the center of the grasp. Offset Z from the gripper base by approximately the finger length.
- **Vacuum gripper**: At the suction cup face.
- **Spray head / torch**: At the nozzle tip or focal point.
- **Custom fixture**: At whatever point should align with the target object.

Check the end effector's URDF or CAD to determine the appropriate offset distance from the base link.

### Step 3: Update SRDF

Add these sections to the SRDF. The content depends on what joints and links your end effector has.

**End effector planning group** — include the `grasp_link` and all non-fixed joints from the end effector. To determine this list, walk the URDF tree of the end effector and include every `revolute`, `prismatic`, or `continuous` joint:

```xml
<group name="gripper">
    <link name="grasp_link"/>
    <joint name="<ee_joint_1>"/>
    <joint name="<ee_joint_2>"/>
    <!-- ... include all non-fixed joints from the end effector -->
</group>
```

For end effectors with no movable joints (e.g., a fixed vacuum cup), the group may contain only the `grasp_link`.

**Named states** — define positions for discrete end effector states. For a parallel-jaw gripper this is typically open/close. For other end effectors, define whatever named states are meaningful (or omit if there are none). Only include joints that are actuated or that MoveIt should plan for — not mimic joints:

```xml
<group_state name="open" group="gripper">
    <joint name="<actuated_joint>" value="<open_value>"/>
</group_state>
<group_state name="close" group="gripper">
    <joint name="<actuated_joint>" value="<close_value>"/>
</group_state>
```

To find the correct open/close values: read the end effector's `ros2_control.xacro`. The `initial_value` in the actuated joint's `<state_interface>` is typically one end of the range. The `<limit>` tags in the URDF macro define the full range. These values vary between models — always check.

**End effector definition** — links the end effector group to the arm:
```xml
<end_effector name="gripper" parent_link="<tool_flange_link>" group="gripper"/>
```

**Passive joints** — if the end effector has mimic joints (joints that mechanically follow an actuated joint), declare them as passive so MoveIt does not try to plan for them independently:

```xml
<passive_joint name="<mimic_joint_1>"/>
<passive_joint name="<mimic_joint_2>"/>
<!-- ... one entry per mimic joint -->
```

To identify mimic joints: look for `<mimic joint="..." multiplier="..." offset="..."/>` tags inside joint definitions in the end effector's URDF xacro. If there are no mimic joints, skip this section.

**Collision pairs** — disable self-collision between end effector links and between end effector and arm wrist. The general principle is to disable pairs that either cannot physically collide due to the kinematic structure, or that are directly connected:

- All adjacent link pairs within the end effector (parent-child in the URDF) — `reason="Adjacent"`
- Tool flange link ↔ end effector base link (and any intermediate links) — `reason="Adjacent"`
- The link before the tool flange ↔ end effector base — `reason="Never"`
- Any link pairs within the end effector that geometrically cannot collide in any configuration — `reason="Never"`

For complex end effectors (e.g., multi-finger grippers with many links), **disable ALL internal link pairs exhaustively.** MoveIt's collision padding (typically 0.01m) causes false self-collision positives between nearby gripper links, especially in the closed position. Trying to selectively disable pairs leads to whack-a-mole — a new collision pair appears each time you fix one. The reliable approach is to generate all N*(N-1)/2 pairs for the gripper's links and disable them all. A simple script can generate these:

```python
gripper_links = ["base_link", "left_knuckle", "left_finger", ...]  # your gripper's links
for i, a in enumerate(gripper_links):
    for b in gripper_links[i+1:]:
        print(f'  <disable_collisions link1="{min(a,b)}" link2="{max(a,b)}" reason="Never"/>')
```

### Step 4: Add End Effector Controller

**Skip this step if your end effector has no actuated joints** (e.g., a fixed vacuum cup controlled by a separate I/O system outside ros2_control).

In `config/control/<robot>_ros2_control.yaml`, register the controller and add its parameters. The controller type depends on the end effector:

**For grippers using `GripperActionController`** (standard for single-DOF grippers):

```yaml
# In controller_manager ros__parameters:
<ee_controller_name>:
  type: position_controllers/GripperActionController
```

```yaml
# Controller parameters:
<ee_controller_name>:
  ros__parameters:
    default: true
    joint: <actuated_joint_name>
    allow_stalling: true
    stall_timeout: 0.05
    goal_tolerance: 0.02
```

**To find the actuated joint**: read the end effector's `ros2_control.xacro`. The joint with a `<command_interface>` that is NOT a mimic joint is the actuated one. There is typically only one for single-DOF grippers.

For end effectors with other control schemes (multi-DOF hands, pneumatic actuators, custom hardware), you will need to use the appropriate controller type for your hardware. The pattern above is specific to `GripperActionController`.

### Step 5: Update config.yaml

If the end effector has an actuated controller, add it to active startup:
```yaml
controllers_active_at_startup:
  - "joint_state_broadcaster"
  - "<arm_controller>"
  - "<ee_controller_name>"    # add this
```

If the end effector macro accepts a `use_fake_hardware` parameter, pass it through via `urdf_params` so the end effector uses mock hardware in sim:
```yaml
robot_description:
  urdf:
    package: "<package>"
    path: "description/<robot>.urdf.xacro"
  srdf:
    package: "<package>"
    path: "config/moveit/<robot>.srdf"
  urdf_params:
    - use_fake_hardware: "true"
```

**`urdf_params` for sim/hardware switching:** For sim configs, hardcode `use_fake_hardware: "true"`. Use the config inheritance system (`based_on_package`) to override to `"false"` in the hardware config. The `%>> hardware.simulated` substitution syntax exists but requires MoveIt Pro 8.8+ and may not work in all deployment contexts — hardcoding is more reliable.

### Step 6: Add End Effector Objectives

Create objectives to activate and deactivate the end effector. For grippers using `GripperActionController`, use `MoveGripperAction`:

**`objectives/open_gripper.xml`:**
```xml
<?xml version="1.0" encoding="UTF-8" ?>
<root BTCPP_format="4" main_tree_to_execute="Open Gripper">
  <BehaviorTree ID="Open Gripper">
    <Action ID="MoveGripperAction"
      gripper_command_action_name="/<ee_controller_name>/gripper_cmd"
      position="<open_position_value>"
    />
  </BehaviorTree>
  <TreeNodesModel>
    <SubTree ID="Open Gripper">
      <MetadataFields>
        <Metadata runnable="true" />
        <Metadata subcategory="Gripper" />
      </MetadataFields>
    </SubTree>
  </TreeNodesModel>
</root>
```

**`objectives/close_gripper.xml`:** Same structure with `position="<close_position_value>"`.

The `gripper_command_action_name` must match `/<controller_name>/gripper_cmd`. The position values come from the joint limits you identified in "Before You Start."

For end effectors that are not grippers (vacuum, spray, etc.), you will need different behavior tree actions appropriate to your hardware — `MoveGripperAction` is specific to `GripperActionController`.

### Verification Steps

After building, always check these before moving on:
1. **Visual check**: Launch MoveIt Pro and verify the end effector is oriented correctly in the 3D view. For grippers, fingers should point **away** from the arm. If the tool points toward the wrist, adjust the rotation in the origin.
2. **Actuation** (if applicable): Run the activate/deactivate objectives (e.g., Open/Close Gripper) to verify the controller is working.
3. **Teleop**: Verify joint jog still works with the end effector attached.
4. **Collision**: Move the arm through various poses and check for unexpected collision warnings between end effector and arm links.

### End Effector Gotchas

- **Wrong orientation (most common issue)**: The default orientation (`rpy="0 0 0"`) is almost always wrong. Most end effector macros need `rpy="0 0 ${pi}"` to face the correct direction. **Always apply the 180° Z rotation as the starting point, then adjust based on visual verification.** Some macros add their own internal rotation — your external rotation compounds with it.
- **Mimic joints** (multi-finger grippers): Some grippers use mimic joints where only one joint is actuated and the others follow mechanically. If you see "multiple command interfaces" errors, check that only the actuated joint has a `<command_interface>` in the ros2_control xacro. Declare all mimic joints as `<passive_joint>` in the SRDF.
- **Separate hardware interfaces**: The end effector typically runs as a separate `ros2_control` `<system>` from the arm. They coexist in the same controller manager but are independently managed.
- **End effector description package not found**: The description package must be in your workspace or installed as a binary. A symlink works for dev; for Docker builds, add it as a submodule or copy.
- **Collision spam**: If MoveIt reports many self-collisions involving end effector links, you need more `disable_collisions` entries in the SRDF. Walk all link pairs systematically.
- **End effectors with no ros2_control joints**: Some end effectors (vacuum grippers, pneumatic tools) are controlled via digital I/O rather than ros2_control joints. These may not need a controller in the ros2_control yaml at all — the actuation objective would use a different behavior (e.g., `SetIO`) instead of `MoveGripperAction`. The URDF still needs the links/meshes for collision and visualization, but there may be no movable joints.

---

## Part 2: Building a Config from Raw Inputs (STLs/Meshes)

### Prerequisites

- STL or DAE mesh files for each link (visual and/or collision)
- Knowledge of the robot's kinematic structure (DH parameters or joint axes/origins)
- Joint types (revolute, prismatic, fixed) and limits

### Step-by-Step

#### 1. Organize Meshes

```
<package_name>/
├── meshes/
│   ├── visual/           # Detailed meshes for rendering (.dae preferred, .stl ok)
│   │   ├── base_link.dae
│   │   ├── link1.dae
│   │   └── ...
│   └── collision/        # Simplified meshes for collision checking (.stl preferred)
│       ├── base_link.stl
│       ├── link1.stl
│       └── ...
```

Tips:
- Collision meshes should be simplified (convex hulls or low-poly) for performance
- If you only have one set of meshes, use them for both visual and collision
- Ensure mesh origins align with the joint frames (or adjust with `<origin>` in URDF)
- Scale: ROS uses meters. If your STLs are in mm, add `scale="0.001 0.001 0.001"` in the URDF mesh tag

#### 2. Build the URDF

Create the URDF from scratch. For each link in the kinematic chain:

```xml
<link name="link_1">
  <visual>
    <geometry>
      <mesh filename="package://<package>/meshes/visual/link1.dae"/>
    </geometry>
    <origin xyz="0 0 0" rpy="0 0 0"/>
  </visual>
  <collision>
    <geometry>
      <mesh filename="package://<package>/meshes/collision/link1.stl"/>
    </geometry>
    <origin xyz="0 0 0" rpy="0 0 0"/>
  </collision>
  <inertial>
    <mass value="1.0"/>
    <inertia ixx="0.01" iyy="0.01" izz="0.01" ixy="0" ixz="0" iyz="0"/>
  </inertial>
</link>
```

For each joint:

```xml
<joint name="joint_1" type="revolute">
  <parent link="base_link"/>
  <child link="link_1"/>
  <origin xyz="0 0 0.1" rpy="0 0 0"/>
  <axis xyz="0 0 1"/>
  <limit lower="-3.14" upper="3.14" velocity="3.15" effort="100"/>
</joint>
```

Key points:
- Every link needs `<inertial>` even for visualization-only (MoveIt will warn otherwise)
- Joint `<origin>` is the transform from parent to child frame at joint position zero
- Double-check axis directions — wrong axis = robot moves in unexpected directions
- Use XACRO macros for repetitive patterns (common on serial manipulators)

#### 3. Validate the URDF

```bash
# Inside the container or with ROS installed:
check_urdf my_robot.urdf
urdf_to_graphiz my_robot.urdf     # Generates a visual kinematic tree
```

Visually verify in RViz or the MoveIt Pro UI that:
- Links are positioned correctly relative to each other
- Joints rotate around the correct axes
- Meshes are oriented properly (no flipped/rotated parts)

#### 4. Generate Collision Matrix

If you have access to the MoveIt Setup Assistant:
```bash
ros2 launch moveit_setup_assistant setup_assistant.launch.py
```

Otherwise, manually create the SRDF by:
1. Listing all link pairs that are adjacent (connected by a joint) → `reason="Adjacent"`
2. Testing various joint configurations for unexpected collisions between non-adjacent links → `reason="Never"`
3. Pay special attention to the zero/home pose

#### 5. Proceed with Part 1

Once you have a valid URDF with meshes, follow Part 1 from Step 2 onward.

#### 6. Optimize Meshes

See https://docs.picknik.ai/how_to/configuration_tutorials/optimizing_robot_model_meshes/

**Decimation** — Reduce polygon count (target: under 100K faces / 10MB):
```bash
moveit_pro dev decimate_mesh body.stl body_decimated.stl
```

**Convex Decomposition** — For MuJoCo physics simulation:
1. Export mesh as .obj from Blender (Forward=Y, Up=Z)
2. `pip install coacd && coacd -i body.obj -o body_decomp.obj -c 7`
3. Use Blender `separate_hulls.py` to extract individual .stl convex hulls
4. Reference original .obj as visual, individual .stl hulls as collision in MuJoCo XML

### Mesh-Specific Gotchas

- **Wrong scale**: Robot appears tiny or enormous → check STL units vs meters
- **Wrong origin**: Mesh appears offset from joint → adjust `<origin>` in `<visual>` and `<collision>` tags
- **Missing inertials**: MoveIt/Gazebo will warn or crash → add reasonable `<inertial>` to every non-fixed link
- **Complex collision meshes**: Planning is slow → use simplified convex hulls for collision geometry
- **Mesh file not found at runtime**: The package must be built and installed so `package://` URIs resolve → `moveit_pro build`

---

## Debugging

### Log Location

MoveIt Pro backend writes all output to `/tmp/agent_robot.log` inside the Docker container.

```bash
# View recent logs
docker compose exec dev bash -c 'tail -50 /tmp/agent_robot.log'

# Search for errors
docker compose exec dev bash -c 'grep -i "error\|fatal\|failed" /tmp/agent_robot.log | tail -20'

# Objective execution errors specifically
docker compose exec dev bash -c 'grep "objective_server_node" /tmp/agent_robot.log | tail -20'

# Follow logs in real time
docker compose exec dev bash -c 'tail -f /tmp/agent_robot.log'
```

The backend is fully ready when you see: `You can start planning now!`

### Log Prefixes

| Prefix | Source |
|--------|--------|
| `[objective_server_node]` | Objective/behavior tree execution |
| `[ros2_control_node]` | Controller manager, hardware interfaces |
| `[MujocoSystem]` | MuJoCo simulation |
| `[controller_manager]` | Controller loading/switching |

### Common Runtime Errors

**Missing Behavior**:
```
[objective_server_node] [error] Failed to create behavior tree for Objective `My Objective`.
Reason: Missing manifest for element_ID: SomeBehaviorName
```
The behavior name in the objective XML doesn't match any registered behavior. Check that the correct behavior loader plugins are listed in config.yaml.

**Missing Package at Launch**:
```
[launch] Caught exception: "package 'some_package' not found, searching: [...]"
```
The workspace hasn't been rebuilt. Run `moveit_pro build`.

**Port/Parameter Errors in Objectives**:
```
[objective_server_node] [error] ... Failed to get required values from input data ports: ...
```
A required port in the behavior tree XML is missing or has the wrong name.

**Stale Plugin Crashes**: `pluginlib` discovers plugins on `AMENT_PREFIX_PATH`, including previously-built-but-currently-skipped packages. If a plugin's `.so` doesn't exist at runtime, loading will crash. A clean rebuild fixes this.

### Triggering Objectives from CLI

```bash
# Run an objective
docker compose exec dev bash -c "source /opt/overlay_ws/install/setup.bash && \
  source \${HOME}/user_ws/install/setup.bash && \
  ros2 action send_goal --feedback /do_objective \
  moveit_studio_sdk_msgs/action/DoObjectiveSequence \
  \"{objective_name: 'My Objective Name'}\""

# Cancel a running objective
docker compose exec dev bash -c "source /opt/overlay_ws/install/setup.bash && \
  ros2 service call /cancel_objective moveit_studio_sdk_msgs/srv/CancelObjective {}"
```

---

## Verification & Testing

After `moveit_pro run` reaches `You can start planning now!`, verify the config systematically before considering it complete. Do not skip these steps — a config that launches is not necessarily a config that works.

All verification commands run inside the Docker container via `docker compose exec`. The container name depends on which service you need:
- **drivers**: `docker compose exec drivers bash -c "source /opt/overlay_ws/install/setup.bash && source \${HOME}/user_ws/install/setup.bash && <command>"`
- **agent_bridge**: same pattern, substituting `agent_bridge` for `drivers`

**Important: Restart the ROS2 daemon before running CLI commands.** CycloneDDS discovery over localhost does not work for new CLI processes unless the daemon is restarted. Run this once per container session before any other `ros2` commands:

```bash
docker exec -u <username> moveit_pro-drivers-1 bash -c "\
  export CYCLONEDDS_URI=/home/<username>/.ros/cyclonedds.xml && \
  export RMW_IMPLEMENTATION=rmw_cyclonedds_cpp && \
  source /opt/overlay_ws/install/setup.bash && \
  source /home/<username>/user_ws/install/setup.bash && \
  ros2 daemon stop && ros2 daemon start"
```

Replace `<username>` with the user configured in your Dockerfile (default `moveit-pro-user`, or your host username if customized). After the daemon restart, subsequent commands in the same container will discover topics correctly.

For all verification commands below, prefix with the environment setup:
```bash
docker exec -u <username> moveit_pro-drivers-1 bash -c "\
  export CYCLONEDDS_URI=/home/<username>/.ros/cyclonedds.xml && \
  export RMW_IMPLEMENTATION=rmw_cyclonedds_cpp && \
  source /opt/overlay_ws/install/setup.bash && \
  source /home/<username>/user_ws/install/setup.bash && \
  <command>"
```

### Step 1: Verify Controllers Loaded

Check that all expected controllers are loaded and in the correct state:

```bash
docker compose exec drivers bash -c "source /opt/overlay_ws/install/setup.bash && \
  source \${HOME}/user_ws/install/setup.bash && \
  ros2 control list_controllers"
```

Expected output should show:
- `joint_state_broadcaster` — **active**
- `joint_trajectory_admittance_controller` — **active**
- `robotiq_gripper_controller` (or your end effector controller) — **active**
- `joint_velocity_controller` — **inactive** (activated on demand for joint teleop)
- `velocity_force_controller` — **inactive** (activated on demand for pose teleop)

If any controller is missing, check the ros2_control yaml and config.yaml `controllers_active/inactive_at_startup` lists.

### Step 2: Verify Joint States

Confirm the robot is publishing joint states and the joint names match your config:

```bash
docker compose exec drivers bash -c "source /opt/overlay_ws/install/setup.bash && \
  source \${HOME}/user_ws/install/setup.bash && \
  ros2 topic echo /joint_states --once"
```

Verify:
- All expected arm joints appear in the `name` list
- End effector joints (if any) appear
- Position values match your expected home/initial pose
- The topic is publishing (not hanging)

### Step 3: Run a Test Objective

Run the simplest objective to verify the behavior tree execution pipeline works:

```bash
docker compose exec drivers bash -c "source /opt/overlay_ws/install/setup.bash && \
  source \${HOME}/user_ws/install/setup.bash && \
  ros2 action send_goal --feedback /do_objective \
  moveit_studio_sdk_msgs/action/DoObjectiveSequence \
  \"{objective_name: 'Open Gripper'}\""
```

Then try Close Gripper. If these succeed, the objective server, controller manager, and end effector controller are all working together.

### Step 4: Test Teleop (Joint Jog)

Joint jog is the simplest teleop mode and should work for any config with a `joint_velocity_controller`:

1. Open the MoveIt Pro web UI (http://localhost)
2. Select the **Teleop** tab
3. Choose **Joint Jog** mode
4. Try moving each joint individually

If joint jog fails:
- Check that `joint_velocity_controller` loaded (Step 1)
- Verify `joint_jog.yaml` has `controllers: ['joint_velocity_controller']`
- Check logs for controller switching errors

### Step 5: Visual Inspection

With the robot visible in the web UI, verify:

1. **End effector orientation**: If using a gripper, the fingers should point **away** from the arm. If they point toward the wrist, the mounting rotation is wrong.
2. **No gaps or overlaps**: The end effector base should sit flush against the arm's tool flange. A gap means the Z offset is too large; overlap means too small or missing.
3. **Home pose looks reasonable**: The robot should not be in a fully extended or obviously impossible pose.
4. **No collision warnings**: Check the UI and logs for unexpected self-collision reports. If the home pose reports collision, you're missing `disable_collisions` entries in the SRDF.

### Step 6: Test Motion Planning

Try planning and executing a motion to verify the full pipeline:

```bash
docker compose exec drivers bash -c "source /opt/overlay_ws/install/setup.bash && \
  source \${HOME}/user_ws/install/setup.bash && \
  ros2 action send_goal --feedback /do_objective \
  moveit_studio_sdk_msgs/action/DoObjectiveSequence \
  \"{objective_name: 'Move to Waypoint'}\""
```

Or use the web UI to drag the interactive marker and plan a motion. If planning fails:
- Check kinematics.yaml uses `pose_ik_plugin/PoseIKPlugin`
- Verify the manipulator chain in the SRDF is correct (base_link to tip_link)
- Check joint limits in joint_limits.yaml match the URDF

### Verification Checklist

Use this checklist after every build-and-run cycle:

- [ ] `You can start planning now!` appears in logs
- [ ] All controllers loaded in correct state (Step 1)
- [ ] Joint states publishing with correct joint names (Step 2)
- [ ] Open/Close Gripper objectives succeed (Step 3)
- [ ] Joint jog teleop works (Step 4)
- [ ] End effector orientation is correct in 3D view (Step 5)
- [ ] No unexpected self-collision warnings (Step 5)
- [ ] Motion planning to a waypoint succeeds (Step 6)

---

## Reference: Complete File Checklist

Use this checklist when creating a new config package:

- [ ] `CMakeLists.txt` — installs all directories
- [ ] `package.xml` — declares dependencies
- [ ] `config/config.yaml` — master config, group name = `manipulator`
- [ ] `config/control/<robot>_ros2_control.yaml` — all 4 controllers defined (JSB, JTAC, JVC, VFC)
- [ ] `config/moveit/<robot>.srdf` — group named `manipulator`, collision pairs disabled
- [ ] `config/moveit/kinematics.yaml` — solver = `pose_ik_plugin/PoseIKPlugin` (NOT KDL), with `solve_mode: "optimize_distance"` and `optimization_timeout: 0.005`
- [ ] `config/moveit/joint_limits.yaml` — limits for every joint (position and velocity limits from the URDF; `max_acceleration` from the manufacturer's datasheet — if unavailable, start conservative and tune based on testing)
- [ ] `config/moveit/joint_jog.yaml` — controller = `joint_velocity_controller`
- [ ] `config/moveit/pose_jog.yaml` — controller = `joint_velocity_controller`
- [ ] `config/moveit/sensors_3d.yaml` — minimal if no 3D sensors (see note below about empty lists)
- [ ] `description/<robot>.urdf.xacro` — includes URDF + ros2_control xacro
- [ ] `description/<robot>.ros2_control.xacro` — mock_components for sim
- [ ] `launch/agent_bridge.launch.xml` — standard two-include boilerplate
- [ ] `objectives/move_to_home.xml` — arm movement test objective (uses `RetrieveWaypoint` + `Move to Joint State`)
- [ ] `waypoints/waypoints.yaml` — valid YAML list with at least one waypoint
- [ ] **Build**: `moveit_pro build` succeeds (ask user permission before running)
- [ ] **Run**: `moveit_pro run` launches and reaches `You can start planning now!` (ask user permission before running)

### If adding an end effector:
- [ ] Gripper description package in workspace (submodule, symlink, or copy)
- [ ] `package.xml` — `exec_depend` on gripper description package
- [ ] `description/<robot>.urdf.xacro` — gripper macro included, attached to tool flange, `grasp_link` added
- [ ] `config/moveit/<robot>.srdf` — `gripper` group, `end_effector`, open/close states, passive joints, collision pairs
- [ ] `config/control/` — `robotiq_gripper_controller` (or equivalent) in controller_manager + params
- [ ] `config/config.yaml` — gripper controller in `controllers_active_at_startup`, `urdf_params` for fake hardware
- [ ] `objectives/open_gripper.xml` and `close_gripper.xml`
- [ ] **Build and run**: Rebuild with `moveit_pro build`, relaunch with `moveit_pro run`, verify gripper appears correctly in 3D view (ask user permission before running)
