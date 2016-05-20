WITH ThreadTimings AS (
  SELECT thr.TSCPerMillisecond AS TSCPerMillisecond, thr.StartTime AS StartTime FROM Thread thr WHERE thr.Id = c.Thread LIMIT 1
)
INSERT INTO CallGroup (Function, Caller, Count, Parent, Start, End, StartTime,
  EndTime, Duration, DurationMs, CallerExecution) SELECT
  Function,
  Caller,
  COUNT(*),
  NULL,
  MIN(Start),
  MAX(End),
  strftime('%Y-%m-%dT%H:%M:%fZ', (SELECT StartTime FROM ThreadTimings), '+' || CAST ((MIN(Start) / (SELECT TSCPerMillisecond FROM ThreadTimings) / 1000) AS TEXT) || ' seconds'),
  strftime('%Y-%m-%dT%H:%M:%fZ', (SELECT StartTime FROM ThreadTimings), '+' || CAST ((MAX(Start) / (SELECT TSCPerMillisecond FROM ThreadTimings) / 1000) AS TEXT) || ' seconds'),
  SUM(End - Start),
  SUM(End - Start) / (SELECT TSCPerMillisecond FROM ThreadTimings),
  CASE WHEN MIN(CallerExecution) = MAX(CallerExecution) THEN CallerExecution ELSE NULL END AS CallerExecution
FROM Call c GROUP BY Function, Caller;
