# Task: Build a MoveIt Pro Config for Doosan M1013 + Robotiq 2F-140

You are setting up a MoveIt Pro robot configuration package from scratch for a Doosan M1013 6-DOF cobot with a Robotiq 2F-140 gripper attached.

## References

- Read `/home/jonathan_fries/robot_configuration_setup/CLAUDE.md` — this is your primary guide. Follow it step by step.
- Read `/home/jonathan_fries/robot_configuration_setup/URDF_SOURCES.md` for links to the Doosan driver/description repo.
- Read `/home/jonathan_fries/robot_configuration_setup/END_EFFECTOR_SOURCES.md` for the Robotiq gripper info.

## Source Packages

- **Doosan arm**: Clone from https://github.com/doosan-robotics/doosan-robot2 — the URDF/description files are in the `dsr_description2` package. Use the `m1013` model.
- **Robotiq 2F-140 gripper**: The `robotiq_description` package is already available at `/home/jonathan_fries/moveit_pro/moveit_pro_example_ws/src/external_dependencies/ros2_robotiq_gripper/robotiq_description`. The macro to use is `robotiq_2f_140_macro.urdf.xacro`.

## Working Directory

Place all your work in `~/doosan_ws/`. Create the MoveIt Pro config package here (e.g., `doosan_m1013_sim/`).

## What to Build

Follow the CLAUDE.md guide to create a complete MoveIt Pro configuration package that includes:

1. The arm description (URDF xacro wrapping the Doosan M1013)
2. The Robotiq 2F-140 gripper attached to the arm's tool flange
3. A `grasp_link` for pick/place planning
4. All required MoveIt Pro config files (config.yaml, SRDF, controllers, kinematics, etc.)
5. Open/close gripper objectives
6. At least one waypoint (Home position)

## Important Notes

- The planning group for the arm MUST be named `manipulator`
- The kinematics solver MUST be `pose_ik_plugin/PoseIKPlugin` (NOT KDL)
- The gripper almost certainly needs `rpy="0 0 ${pi}"` rotation when attaching to the arm
- The gripper base likely needs a Z offset to sit flush against the arm's tool flange — check the arm's URDF for the last link dimensions
- You will need to figure out the Doosan's link and joint names from their URDF
- You will need to determine which link is the tool flange (tip of the arm)
- You will need to create the collision matrix (disable_collisions entries in the SRDF) for both the arm and the gripper

## What NOT to Do

- You should try to build the config package.  One way to do that is to run 'moveit_pro configure', attach 'moveit_pro' to the new ws and config when prompted, and then run 'moveit_pro build'
- Do not modify any files outside of `~/doosan_ws/`
- Do not ask me questions you can answer by reading the CLAUDE.md or the Doosan/Robotiq source files

## Deliverables

When you are done, give me:
1. A summary of the complete file tree you created
2. Any decisions you made that weren't covered by the CLAUDE.md guide
3. Any places where the CLAUDE.md was unclear, wrong, or missing information
