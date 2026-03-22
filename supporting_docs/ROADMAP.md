# Guide Roadmap

Prioritized list of guides still needed, in order of importance.

## 1. MuJoCo Sim Config
**Priority:** High — done with every customer
**Status:** Not started
**Guide location:** `.claude/mujoco_sim_config.md` (to be created)
**Covers:**
- Creating a sim config that inherits from mock via `based_on_package`
- MuJoCo XML scene file creation
- Convex decomposition of meshes for MuJoCo collision
- MuJoCo ros2_control plugin configuration
- Keyframe setup for simulator reset poses
- MuJoCo-specific behavior loader plugins
- Sim-specific objectives (e.g., Reset Simulation)
**Reference docs:**
- https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_sim_config/create_robot_sim_config/
- https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_sim_config/migrate_to_mujoco_config/
- https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_sim_config/overload_sim_config_definitions/
- https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_sim_config/configure_keyframes/

## 2. Build URDF from CAD/STL (no existing URDF)
**Priority:** Medium — happens but less common than having a URDF
**Status:** Skeletal guide exists at `.claude/urdf_from_cad.md`
**Covers:**
- Organizing meshes (visual vs collision)
- Constructing URDF links and joints from DH parameters or CAD measurements
- Mesh scale and origin alignment
- Inertial properties
- URDF validation
- Mesh optimization (decimation, convex decomposition)
**What's needed:** Battle-test the guide against a real robot with only STL files

## 3. Mobile Base + Nav2
**Priority:** Medium — important for mobile manipulation customers
**Status:** Not started
**Guide location:** `.claude/mobile_base_nav2.md` (to be created)
**Covers:**
- Mobile base control configuration
- Nav2 integration
- State estimation (Fuse)
- Combined mobile + arm planning
**Reference docs:**
- https://docs.picknik.ai/how_to/configuration_tutorials/configure_mobile_base/
- https://docs.picknik.ai/how_to/configuration_tutorials/add_nav2/
- https://docs.picknik.ai/how_to/configuration_tutorials/add_fuse/

## 4. Physical Hardware Config
**Priority:** Lower — usually done by customer's engineering team with PickNik support
**Status:** Not started
**Guide location:** `.claude/physical_config.md` (to be created)
**Covers:**
- Inheriting from sim config
- Real hardware driver setup
- Protective stop configuration
- Custom robot controllers (non-ros2_control)
**Reference docs:**
- https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_physical_config/create_robot_physical_config/
- https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_physical_config/configure_protective_stop/
- https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_physical_config/custom_robot_controller/
