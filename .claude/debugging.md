# Debugging

Reference for troubleshooting MoveIt Pro runtime issues.

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
