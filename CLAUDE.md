# MoveIt Pro Robot Configuration Guide

This workspace contains MoveIt Pro robot configuration packages. This guide covers building configs from two starting points: an existing URDF, or raw inputs (STLs/meshes).

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

No `colcon` is available on the host — always use `moveit_pro build`.

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

**`<robot>.urdf.xacro`** — Wraps the existing URDF and adds ros2_control:
```xml
<?xml version="1.0"?>
<robot xmlns:xacro="http://www.ros.org/wiki/xacro" name="my_robot">
    <xacro:include filename="$(find my_robot_description)/urdf/my_robot.urdf" />
    <xacro:include filename="my_robot.ros2_control.xacro" />
    <xacro:my_robot_ros2_control name="MyRobotSystem" />
</robot>
```

**`<robot>.ros2_control.xacro`** — Defines hardware interface for each joint:
- Use `mock_components/GenericSystem` for simulation
- List every joint with `<command_interface>` (position) and `<state_interface>` (position, velocity)

#### 3. SRDF (config/moveit/<robot>.srdf)

Critical decisions:
- **Planning group name**: Use `manipulator` — MoveIt Pro hardcodes this name in several places (joint_velocity_controller, JTAC, teleop objectives)
- **Chain**: Set `base_link` and `tip_link` for your kinematic chain
- **Collision pairs**: Run the MoveIt Setup Assistant or manually disable collisions between adjacent/never-colliding links. Common pairs to disable:
  - All adjacent link pairs (connected by a joint)
  - Near-neighbor pairs (separated by one joint) that collide at common poses
  - **Test the zero/home pose** — if it reports self-collision, you're missing a `disable_collisions` entry

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
- [ ] `config/moveit/kinematics.yaml` — group key = `manipulator`
- [ ] `config/moveit/joint_limits.yaml` — limits for every joint
- [ ] `config/moveit/joint_jog.yaml` — controller = `joint_velocity_controller`
- [ ] `config/moveit/pose_jog.yaml` — controller = `joint_velocity_controller`
- [ ] `config/moveit/sensors_3d.yaml` — can be empty/minimal if no 3D sensors
- [ ] `description/<robot>.urdf.xacro` — includes URDF + ros2_control xacro
- [ ] `description/<robot>.ros2_control.xacro` — mock_components for sim
- [ ] `launch/agent_bridge.launch.xml` — standard two-include boilerplate
- [ ] `objectives/` — at least one test objective
- [ ] `waypoints/waypoints.yaml` — valid YAML list with at least one waypoint
