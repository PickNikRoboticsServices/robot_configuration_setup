---
name: create-robot-config
description: Use when the user asks to create, set up, or configure a robot configuration package for MoveIt Pro, or asks about robot config structure, config.yaml, URDF/xacro setup, mock/sim/physical configs, objectives, or mobile base/navigation setup.
---

# Create Robot Config

This skill provides reference documentation for creating and configuring robot configuration packages in MoveIt Pro. Use the links below to fetch the relevant documentation pages when helping the user.

**IMPORTANT: Do NOT use the MoveIt Setup Assistant (MSA) to generate robot configs.** The Setup Assistant is a GUI tool and cannot be driven by Claude. Instead, follow the documentation pages below to create config packages by hand — this is the correct workflow for MoveIt Pro robot configurations.

## Documentation Pages

When helping the user, use `WebFetch` to retrieve the relevant page(s) below based on their question.

### Overview

- [Overview of Robot Config & Objective Packages](https://docs.picknik.ai/how_to/configuration_tutorials/robot_and_objective_inheritance/)
- [Overview of config.yaml](https://docs.picknik.ai/how_to/configuration_tutorials/config_yaml_reference/)

### Create Mock Config

- [1. Get URDF Files (Export CAD to URDF)](https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_mock_config/export_cad_to_urdf/)
- [2. Refactor URDF to Xacro](https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_mock_config/refactor_urdf_to_xacro/)
- [3. Robot Mock Config](https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_mock_config/create_mock_robot_config/)
- [hardware Values](https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_mock_config/hardware_configuration/)
- [ros_global_params Values](https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_mock_config/ros_global_params_configuration/)
- [ros2_control Values](https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_mock_config/ros2_control_configuration/)
- [moveit_params Values](https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_mock_config/moveit_params_configuration/)
- [objectives Values](https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_mock_config/objectives_and_behaviors_configuration/)
- [4. Run Mock Robot Config](https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_mock_config/run_mock_robot_config/)

### Create Sim Config

- [1. Create Sim Config](https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_sim_config/create_robot_sim_config/)
- [2. Create MuJoCo Files](https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_sim_config/migrate_to_mujoco_config/)
- [3. Overload Sim Values](https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_sim_config/overload_sim_config_definitions/)
- [4. Run Sim Robot Config](https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_sim_config/run_sim_robot_config/)
- [Simulator Keyframes Setup](https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_sim_config/configure_keyframes/)

### Create Physical Config

- [1. Create Physical Config](https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_physical_config/create_robot_physical_config/)
- [2. Overload Physical Values](https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_physical_config/overload_physical_config_definitions/)
- [Protective Stop Setup](https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_physical_config/configure_protective_stop/)
- [Drivers without ROS 2 Control](https://docs.picknik.ai/how_to/configuration_tutorials/create_robot_physical_config/custom_robot_controller/)

### Additional Configuration

- [Optimize Model Meshes](https://docs.picknik.ai/how_to/configuration_tutorials/optimizing_robot_model_meshes/)
- [Mobile Base Control Setup](https://docs.picknik.ai/how_to/configuration_tutorials/configure_mobile_base/)
- [Mobile Navigation Setup (Nav2)](https://docs.picknik.ai/how_to/configuration_tutorials/add_nav2/)
- [State Estimation Setup (Fuse)](https://docs.picknik.ai/how_to/configuration_tutorials/add_fuse/)
- [Third-Party Simulator Setup](https://docs.picknik.ai/how_to/configuration_tutorials/third_party_simulators/)

## How to Use

1. Determine which stage of robot configuration the user needs help with (mock, sim, or physical).
2. Fetch the relevant documentation page(s) using `WebFetch`.
3. Guide the user through the steps, referencing the official documentation.
4. For a full new robot config, follow the pages in order: Overview -> Mock Config (steps 1-4) -> Sim Config (steps 1-4) -> Physical Config (steps 1-2).

## Improving the Docs

Our robot configuration documentation is a work in progress. If you encounter gaps, unclear steps, or missing information while helping the user create a robot config, recommend that the user file an issue or PR to improve the relevant docs page. All documentation should live in the public `src/docs/` directory — do not add configuration tutorials or how-to content to this skill file, CLAUDE.md files, or other Claude-specific locations.
