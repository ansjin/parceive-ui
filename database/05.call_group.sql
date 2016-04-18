INSERT INTO CallGroup SELECT
  ROWID AS Id,
  Function,
  Caller,
  COUNT(*) AS Count,
  NULL AS Parent,
  SUM(End - Start) AS Duration,
  MIN(Start) AS Start,
  MAX(End) AS End,
  CASE WHEN MIN(CallerExecution) = MAX(CallerExecution) THEN CallerExecution ELSE NULL END AS CallerExecution
FROM Call GROUP BY Function, Caller;
