-- Allow sessions to reference either global scenarios or user_scenarios.
-- The application resolves the scenario source at runtime from the route's
-- type parameter and then re-checks ownership during evaluation.
SET @fk_name := (
  SELECT CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sessions'
    AND COLUMN_NAME = 'scenario_id'
    AND REFERENCED_TABLE_NAME = 'scenarios'
  LIMIT 1
);

SET @drop_fk_sql := IF(
  @fk_name IS NULL,
  'SELECT 1',
  CONCAT('ALTER TABLE sessions DROP FOREIGN KEY ', @fk_name)
);

PREPARE drop_fk_stmt FROM @drop_fk_sql;
EXECUTE drop_fk_stmt;
DEALLOCATE PREPARE drop_fk_stmt;
