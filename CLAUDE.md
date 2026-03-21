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

## Quick Reference: Building & Running

```bash
moveit_pro build                  # Build the workspace (runs inside Docker)
moveit_pro run                    # Launch MoveIt Pro
moveit_pro new config             # Scaffold a new config package from template
```

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
│   └── test_objective.xml
└── waypoints/
    └── waypoints.yaml
```

#### 2. Robot Description (description/)

**`<robot>.urdf.xacro`** — Wraps the existing URDF and adds ros2_control.

Some robot descriptions provide a plain URDF file you can include directly:
```xml
<?xml version="1.0"?>
<robot xmlns:xacro="http://www.ros.org/wiki/xacro" name="my_robot">
    <xacro:include filename="$(find my_robot_description)/urdf/my_robot.urdf" />
    <xacro:include filename="my_robot.ros2_control.xacro" />
    <xacro:my_robot_ros2_control name="MyRobotSystem" />
</robot>
```

Many robot descriptions instead expose a **xacro macro** that must be included and then invoked. Check the source package's xacro files — if the robot's links and joints are wrapped in a `<xacro:macro>` block, you need to call the macro:
```xml
<?xml version="1.0"?>
<robot xmlns:xacro="http://www.ros.org/wiki/xacro" name="my_robot">
    <!-- Include the macro definition file -->
    <xacro:include filename="$(find my_robot_description)/xacro/macro.my_robot.xacro" />
    <!-- Invoke the macro to generate the robot links and joints -->
    <xacro:my_robot namespace="" />

    <xacro:include filename="my_robot.ros2_control.xacro" />
    <xacro:my_robot_ros2_control name="MyRobotSystem" />
</robot>
```

Note: When using a macro-based description, you typically write your own `ros2_control.xacro` with `mock_components/GenericSystem` rather than using the source package's ros2_control (which often pulls in real hardware driver plugins).

**`<robot>.ros2_control.xacro`** — Defines hardware interface for each joint:
- Use `mock_components/GenericSystem` for simulation
- List every joint with `<command_interface>` (position) and `<state_interface>` (position, velocity)

#### 3. SRDF (config/moveit/<robot>.srdf)

Critical decisions:
- **Planning group name**: Use `manipulator` — MoveIt Pro hardcodes this name in several places (joint_velocity_controller, JTAC, teleop objectives)
- **Chain**: Set `base_link` and `tip_link` for your kinematic chain. **How to identify the tool flange link**: find the last joint in the kinematic chain — its child link is the tool flange (e.g., `link_6`, `tool0`). Not every robot defines a `tool0` or `tool_link`; some just use the final numbered link.
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

JTAC works without a force/torque sensor — it falls back to behaving like a standard JTC. VFC requires a force/torque sensor; if your robot doesn't have one, define it but it won't be usable for pose jogging.

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
    joints:
      - joint_1
      - joint_2
      - joint_3
      - joint_4
      - joint_5
      - joint_6
    command_interfaces:
      - position
    state_interfaces:
      - position
      - velocity
    state_publish_rate: 100.0
    action_monitor_rate: 20.0
    allow_partial_joints_goal: false
    constraints:
      stopped_velocity_tolerance: 0.01
      goal_time: 0.0
    planning_group_name: manipulator

joint_velocity_controller:
  ros__parameters:
    joints:
      - joint_1
      - joint_2
      - joint_3
      - joint_4
      - joint_5
      - joint_6
    command_interfaces:
      - position
    state_interfaces:
      - position
      - velocity
    planning_group_name: manipulator

velocity_force_controller:
  ros__parameters:
    joints:
      - joint_1
      - joint_2
      - joint_3
      - joint_4
      - joint_5
      - joint_6
    command_interfaces:
      - position
    state_interfaces:
      - position
      - velocity
    planning_group_name: manipulator
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

Key sections to get right:

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

moveit_params:
  joint_group_name: "manipulator"    # Must match SRDF group name

ros2_control:
  controllers_active_at_startup:
    - "joint_state_broadcaster"
    - "joint_trajectory_admittance_controller"
  controllers_inactive_at_startup:
    - "joint_velocity_controller"
    - "velocity_force_controller"
```

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

#### 8. Launch File (launch/agent_bridge.launch.xml)

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
| `sensor_frame` parameter deprecated | JTAC config uses old param names | Use `sensor_frames: ["link"]` and `ee_frames: ["link"]` (plural, array) |

---

## Part 1b: Adding an End Effector (Gripper)

This section covers attaching a gripper to an existing arm config. The Robotiq 2F-85 is used as the reference, but the pattern applies to any end effector.

### Overview of Changes

Adding a gripper touches **every layer** of the config:

| File | What to add |
|------|-------------|
| `package.xml` | Dependency on gripper description package |
| `description/<robot>.urdf.xacro` | Include gripper macro, attach to tool flange, add `grasp_link` |
| `config/moveit/<robot>.srdf` | Gripper group, end effector definition, open/close states, passive joints, collision pairs |
| `config/control/<robot>_ros2_control.yaml` | Gripper controller in controller_manager + params |
| `config/config.yaml` | Gripper controller in `controllers_active_at_startup`, `urdf_params` for fake hardware |
| `objectives/` | Open/close gripper objectives |

### Step 1: Add Gripper Description Dependency

The gripper's URDF package must be available in your workspace. For `robotiq_description`:
- Add as a git submodule, or
- Symlink from another workspace (works for dev, not for Docker release builds), or
- Clone directly into `src/`

Add to `package.xml`:
```xml
<exec_depend>robotiq_description</exec_depend>
```

### Step 2: Attach Gripper in URDF XACRO

Include the gripper macro and attach it to the arm's tool flange link:

```xml
<!-- Robotiq 2F-85 Gripper -->
<xacro:include filename="$(find robotiq_description)/urdf/robotiq_2f_85_macro.urdf.xacro" />

<xacro:robotiq_gripper
    name="RobotiqGripperHardwareInterface"
    prefix=""
    parent="wrist3_link"
    use_fake_hardware="$(arg use_fake_hardware)"
    include_ros2_control="true"
    com_port="/dev/ttyUSB0">
    <origin xyz="0 0 0" rpy="0 0 ${pi}" />
</xacro:robotiq_gripper>
```

**Key parameters:**
- `parent` — Your arm's tool flange link (e.g., `wrist3_link`, `tool0`, `fts_link`)
- `origin` — **Almost always needs a 180° Z rotation** (`rpy="0 0 ${pi}"`). Most gripper URDF macros define their Z axis pointing into the mounting flange. Without this rotation the fingers will point back toward the arm. **Always start with `rpy="0 0 ${pi}"` and visually verify in the 3D view after building.** However, **some gripper macros add their own internal rotation** via fixed joints between the parent attachment and the gripper base. Read the macro source first — look for fixed joints with non-zero `rpy` values. Your externally-applied rotation compounds with any internal one, so you may need to adjust accordingly.
- `origin` Z offset — The `xyz` Z value must offset the gripper to the arm's **flange face**. Many arm URDFs place the last link's origin at the joint, not at the flange surface. If the gripper appears embedded inside the wrist, add a Z offset. Check the arm's URDF: look at the last link's inertial origin Z (center of mass) and visual mesh to estimate where the flange face is. For example, if `wrist3_link` has an inertial Z of ~0.076m, the flange face is likely around `0.09-0.10m`. **Always visually verify there is no overlap or gap between the gripper base and the arm wrist.**
- `use_fake_hardware` — Pass through from config.yaml for sim/real switching
- `prefix` — Use `""` for single-arm setups; use a prefix for dual-arm

**Add a grasp link** — a planning frame offset from the gripper base to represent the grasp point:

```xml
<link name="grasp_link" />
<joint name="grasp_link_joint" type="fixed">
    <parent link="robotiq_85_base_link" />
    <child link="grasp_link" />
    <origin xyz="0 0 0.15" rpy="0 0 0" />
</joint>
```

Set the Z offset to place `grasp_link` at the point between the fingertips where you want the planner to target. This depends on your gripper's geometry — check the gripper URDF or CAD for finger length to determine the appropriate offset.

### Step 3: Update SRDF

Add these sections to the SRDF:

**Gripper planning group** — includes all gripper joints:
```xml
<group name="gripper">
    <link name="grasp_link"/>
    <joint name="robotiq_85_base_joint"/>
    <joint name="robotiq_85_left_knuckle_joint"/>
    <joint name="robotiq_85_right_knuckle_joint"/>
    <joint name="robotiq_85_left_finger_joint"/>
    <joint name="robotiq_85_right_finger_joint"/>
    <joint name="robotiq_85_left_inner_knuckle_joint"/>
    <joint name="robotiq_85_right_inner_knuckle_joint"/>
    <joint name="robotiq_85_left_finger_tip_joint"/>
    <joint name="robotiq_85_right_finger_tip_joint"/>
</group>
```

**Named gripper states** — for open/close:
```xml
<group_state name="open" group="gripper">
    <joint name="robotiq_85_left_knuckle_joint" value="0.7929"/>
    <joint name="robotiq_85_right_knuckle_joint" value="0.7929"/>
</group_state>
<group_state name="close" group="gripper">
    <joint name="robotiq_85_left_knuckle_joint" value="0"/>
    <joint name="robotiq_85_right_knuckle_joint" value="0"/>
</group_state>
```

**End effector definition** — links gripper to arm:
```xml
<end_effector name="gripper" parent_link="wrist3_link" group="gripper"/>
```

**Passive joints** — mimic-driven joints that MoveIt should not plan for:
```xml
<passive_joint name="robotiq_85_left_inner_knuckle_joint"/>
<passive_joint name="robotiq_85_right_inner_knuckle_joint"/>
<passive_joint name="robotiq_85_left_finger_tip_joint"/>
<passive_joint name="robotiq_85_right_finger_tip_joint"/>
```

**Collision pairs** — disable self-collision between gripper links and between gripper and arm wrist. Minimum checklist:
- All adjacent gripper link pairs (parent-child in the URDF) — `reason="Adjacent"`
- Tool flange link ↔ gripper base link and any intermediate gripper links — `reason="Adjacent"`
- The link before the tool flange ↔ gripper base — `reason="Never"`
- Inner knuckle ↔ inner finger (same side) — `reason="Never"`
- Inner knuckle ↔ outer finger (same side) — `reason="Never"`
- Cross-side gripper pairs that geometrically can't collide (e.g., left outer knuckle ↔ right outer knuckle) — `reason="Never"`
- Finger pad links on opposite sides — `reason="Never"`

### Step 4: Add Gripper Controller

In `config/control/<robot>_ros2_control.yaml`:

**Register in controller_manager:**
```yaml
robotiq_gripper_controller:
  type: position_controllers/GripperActionController
```

**Add controller parameters:**
```yaml
robotiq_gripper_controller:
  ros__parameters:
    default: true
    joint: robotiq_85_left_knuckle_joint
    allow_stalling: true
    stall_timeout: 0.05
    goal_tolerance: 0.02
```

The gripper controller only commands the single actuated joint — all other gripper joints mimic it. **To find the actuated joint name and open/close values for your specific gripper**: read the gripper's `ros2_control.xacro` — the joint with a `<command_interface>` (that is NOT a mimic joint) is the actuated one. The `initial_value` in its `<state_interface>` is typically the open position. The joint limits in the URDF macro define the range. These values vary between gripper models — do not assume the names or values shown here apply to your gripper.

### Step 5: Update config.yaml

Add gripper controller to active startup:
```yaml
controllers_active_at_startup:
  - "joint_state_broadcaster"
  - "fairino5_controller"
  - "robotiq_gripper_controller"    # <-- add this
```

Pass `use_fake_hardware` to XACRO so the gripper uses mock hardware in sim:
```yaml
robot_description:
  urdf:
    package: "fairino_sim"
    path: "description/fairino5.urdf.xacro"
  srdf:
    package: "fairino_sim"
    path: "config/moveit/fairino5.srdf"
  urdf_params:
    - use_fake_hardware: "%>> hardware.simulated"
```

**`urdf_params` for sim/hardware switching:** For sim configs, hardcode `use_fake_hardware: "true"`. Use the config inheritance system (`based_on_package`) to override to `"false"` in the hardware config. The `%>> hardware.simulated` substitution syntax exists but requires MoveIt Pro 8.8+ and may not work in all deployment contexts — hardcoding is more reliable.

### Step 6: Add Gripper Objectives

**`objectives/open_gripper.xml`:**
```xml
<?xml version="1.0" encoding="UTF-8" ?>
<root BTCPP_format="4" main_tree_to_execute="Open Gripper">
  <BehaviorTree ID="Open Gripper">
    <Action ID="MoveGripperAction"
      gripper_command_action_name="/robotiq_gripper_controller/gripper_cmd"
      position="0.05"
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

**`objectives/close_gripper.xml`:** Same structure, `position="0.77"`.

The `gripper_command_action_name` must match `/<controller_name>/gripper_cmd`.

### Verification Steps

After building, always check these before moving on:
1. **Visual check**: Launch MoveIt Pro and verify the gripper fingers point **away** from the arm in the 3D view. If they point toward the wrist, you need to add/adjust the Z rotation in the origin.
2. **Open/close**: Run the Open Gripper and Close Gripper objectives to verify the controller is working.
3. **Teleop**: Verify joint jog still works with the gripper attached.
4. **Collision**: Move the arm through various poses and check for unexpected collision warnings between gripper and arm links.

### Gripper-Specific Gotchas

- **Wrong orientation (most common issue)**: The default orientation (`rpy="0 0 0"`) is almost always wrong. Most gripper macros need `rpy="0 0 ${pi}"` to face the correct direction. The Kinova reference configs all use this rotation. **Always apply the 180° Z rotation as the starting point, not as a fix.**
- **Mimic joints**: The Robotiq uses mimic joints — only `left_knuckle_joint` is actuated. If you see "multiple command interfaces" errors, check that only the left knuckle has a `<command_interface>` in the ros2_control xacro.
- **Separate hardware interfaces**: The gripper runs as a separate `ros2_control` `<system>` from the arm. They coexist in the same controller manager but are independently managed.
- **Gripper description package not found**: The `robotiq_description` package must be in your workspace or installed. A symlink works for dev; for Docker builds, add it as a submodule or copy.
- **Collision spam**: If MoveIt reports many gripper self-collisions, you likely need more `disable_collisions` entries in the SRDF. Check all adjacent pairs and finger-tip/inner-knuckle pairs.

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

## Reference: Complete File Checklist

Use this checklist when creating a new config package:

- [ ] `CMakeLists.txt` — installs all directories
- [ ] `package.xml` — declares dependencies
- [ ] `config/config.yaml` — master config, group name = `manipulator`
- [ ] `config/control/<robot>_ros2_control.yaml` — all 4 controllers defined (JSB, JTAC, JVC, VFC)
- [ ] `config/moveit/<robot>.srdf` — group named `manipulator`, collision pairs disabled
- [ ] `config/moveit/kinematics.yaml` — group key = `manipulator`, solver = `pose_ik_plugin/PoseIKPlugin` (NOT KDL)
- [ ] `config/moveit/joint_limits.yaml` — limits for every joint (position and velocity limits from the URDF; `max_acceleration` from the manufacturer's datasheet — if unavailable, start conservative and tune based on testing)
- [ ] `config/moveit/joint_jog.yaml` — controller = `joint_velocity_controller`
- [ ] `config/moveit/pose_jog.yaml` — controller = `joint_velocity_controller`
- [ ] `config/moveit/sensors_3d.yaml` — can be empty/minimal if no 3D sensors
- [ ] `description/<robot>.urdf.xacro` — includes URDF + ros2_control xacro
- [ ] `description/<robot>.ros2_control.xacro` — mock_components for sim
- [ ] `launch/agent_bridge.launch.xml` — standard two-include boilerplate
- [ ] `objectives/` — at least one test objective
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
