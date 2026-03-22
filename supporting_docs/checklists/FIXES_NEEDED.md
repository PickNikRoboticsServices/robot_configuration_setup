# CLAUDE.md Fixes Needed

Issues discovered while building a Doosan M1013 + Robotiq 2F-140 config from scratch using CLAUDE.md as the sole guide.

## 1. No workspace-level file guidance
**Category:** Missing
**Status:** DONE
The workspace structure section mentions `Dockerfile`, `docker-compose.yaml`, and `colcon-defaults.yaml` but never explains their contents or how to create them. A new config builder has no way to produce these files from the guide alone.

## 2. Gripper section is 2F-85 only
**Category:** Incomplete
**Status:** DONE
Part 1b uses Robotiq 2F-85 link/joint names throughout. Generalized to be end-effector-agnostic with placeholder names and principles.

## 3. 2F-140 internal rotation not mentioned
**Category:** Missing
**Status:** DONE (folded into generalized Part 1b)

## 4. Actuated joint discovery is under-documented
**Category:** Unclear
**Status:** DONE (folded into generalized Part 1b "Before You Start" section)

## 5. `moveit_pro configure` not mentioned
**Category:** Missing
**Status:** DONE
Added to Quick Reference section.

## 6. Doosan-specific macro invocation gap
**Category:** Gap
**Status:** DONE
Added warning about hidden `$(arg ...)` dependencies in transitively-included xacro files. The Doosan's internal `world` link turned out to be a non-issue at runtime.

## 7. Gripper group joint list principle unclear
**Category:** Unclear
**Status:** DONE (folded into generalized Part 1b SRDF section — "include all non-fixed joints")

## 8. `config.yaml` example is incomplete
**Category:** Missing fields
**Status:** DONE
Replaced with complete template including all required sections: `moveit_params` sub-fields, `ros2_control.config`, full `objectives` structure.

## 9. Symlink + colcon allow-overriding not warned
**Category:** Missing warning
**Status:** DONE
The guide mentions symlinks work for dev but doesn't warn about:
- Symlinks don't survive Docker build context — must copy the package into the workspace
- `allow-overriding` needed in `colcon-defaults.yaml` when a binary version already exists (rosdep may install one)

## 10. No test objective template for arm movement
**Category:** Minor
**Status:** DONE
Added "Move to Home" objective template with explanation of `RetrieveWaypoint` port names, `Move to Joint State` SubTree usage, and CLI testing command.

---

## Issues discovered during build/run cycle (not in original 10)

## 11. Controller templates missing required parameters
**Category:** Missing
**Status:** DONE
JTAC template was missing `sensor_frames`, `ee_frames`, `ft_sensor_name`, `stop_accelerations`. JVC template was missing `max_joint_velocity`, `max_joint_acceleration`. VFC template was missing `max_joint_velocity`, `max_joint_acceleration`, `max_cartesian_velocity`, `max_cartesian_acceleration`, `sensor_frame`, `ee_frame`, `ft_sensor_name`. All templates updated.

## 12. `state_publish_rate` must be integer, not float
**Category:** Bug in template
**Status:** DONE
`state_publish_rate: 100.0` crashes with "expected [integer] got [double]". Changed to `100` in template.

## 13. Empty lists in YAML config files crash the launch system
**Category:** Critical gotcha
**Status:** DONE
`sensors: []` in sensors_3d.yaml becomes an empty tuple `()` in the ROS2 launch parameter system, crashing with "Expected 'value' ... got '()' of type 'tuple'". Added warning and correct minimal sensors_3d.yaml template.

## 14. Source robot descriptions may pull in unwanted dependencies
**Category:** Gap
**Status:** DONE
The Doosan macro unconditionally includes a Gazebo plugin macro that references `dsr_controller2` package (not available). Had to comment out the gazebo invocation. CLAUDE.md should warn that source robot descriptions may include Gazebo/Ignition/MuJoCo plugins that reference packages not in your workspace, and that you may need to strip or disable these.

## 15. No verification/testing section in CLAUDE.md
**Category:** Missing section
**Status:** DONE
Added Verification & Testing section with 6 steps and a checklist.

## 16. VFC/pose jog claimed to require F/T sensor — wrong
**Category:** Incorrect information
**Status:** DONE
VFC works without F/T sensor when `ft_sensor_name: ""`. The actual issue was that the SRDF `manipulator` chain tip must extend to `grasp_link` (not stop at the tool flange). VFC's `ee_frame` must be the tip of the planning group chain. Updated CLAUDE.md SRDF guidance and VFC template.

## 17. Exhaustive gripper collision pairs needed
**Category:** Lesson learned
**Status:** DONE
Selectively disabling gripper collision pairs leads to whack-a-mole. Updated CLAUDE.md to recommend disabling ALL internal gripper link pairs exhaustively, with a script to generate them.
