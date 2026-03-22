# Verification & Testing

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

Use the Playwright screenshot tool to capture the MoveIt Pro web UI and visually verify the robot configuration. This allows automated verification without requiring a human to open a browser.

**Capture a screenshot:**
```bash
cd <path_to>/ui_testing && node capture.js --output /tmp/moveit_pro_ui.png --wait 8000
```

Then read the screenshot image and verify:

1. **End effector orientation**: If using a gripper, the fingers should point **away** from the arm. If they point toward the wrist, the mounting rotation is wrong.
2. **No gaps or overlaps**: The end effector base should sit flush against the arm's tool flange. A gap means the Z offset is too large; overlap means too small or missing.
3. **Home pose looks reasonable**: The robot should not be in a fully extended or obviously impossible pose.
4. **No collision warnings**: Check the UI for toast error messages. The capture script also collects visible toast/alert elements.
5. **Robot is visible**: If the 3D view is empty or shows only a grid, the URDF failed to load — check the logs.

**Capture after running an objective** to verify motion:
```bash
# Run an objective first
docker exec -u <username> moveit_pro-drivers-1 bash -c "... ros2 action send_goal /do_objective ..."
# Then capture the result
node capture.js --output /tmp/after_move.png --wait 3000
```

If a human is available, ask them to also verify visually and test IMarker teleop (drag-and-drop in the 3D view), which cannot be automated with Playwright.

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
