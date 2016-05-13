CREATE INDEX IF NOT EXISTS LOOP_ITERATION_TABLE_ID ON LoopIteration(Id);
CREATE INDEX IF NOT EXISTS LOOP_ITERATION_TABLE_EXECUTION ON LoopIteration(Execution);

WITH ThreadTimings AS (
  SELECT thr.TSCPerMillisecond AS TSCPerMillisecond, thr.StartTime AS StartTime FROM Thread thr, Call c, Segment s, LoopIteration i WHERE thr.Id = c.Thread AND c.Id = s.Call AND s.LoopIteration = i.Id AND i.Execution = t.Id LIMIT 1
)
INSERT INTO LoopExecution(Id, Loop, ParentIteration, Start, End, Duration,
  StartTime, EndTime, DurationMs, Call, IterationsCount) SELECT
  Id,
  Loop,
  ParentIteration,
  Start,
  End,
  (t.End - t.Start),
  strftime('%Y-%m-%dT%H:%M:%fZ', (SELECT StartTime FROM ThreadTimings), '+' || CAST ((t.Start / (SELECT TSCPerMillisecond FROM ThreadTimings) / 1000) AS TEXT) || ' seconds'),
  strftime('%Y-%m-%dT%H:%M:%fZ', (SELECT StartTime FROM ThreadTimings), '+' || CAST ((t.End / (SELECT TSCPerMillisecond FROM ThreadTimings) / 1000) AS TEXT) || ' seconds'),
  (t.End - t.Start) / (SELECT TSCPerMillisecond FROM ThreadTimings),
  (SELECT s.Call FROM Segment s, LoopIteration i WHERE s.LoopIteration = i.Id AND i.Execution = t.Id),
  (SELECT COUNT(i.Id) FROM LoopIteration i WHERE i.Execution = t.Id )
FROM LoopExecutionOld t;
DROP TABLE LoopExecutionOld;

CREATE INDEX IF NOT EXISTS LOOP_TABLE_ID ON Loop(Id);
CREATE INDEX IF NOT EXISTS LOOP_EXECUTION_TABLE_ID ON LoopExecution(Id);

CREATE INDEX IF NOT EXISTS LOOP_EXECUTION_TABLE_CALL ON LoopExecution(Call);
CREATE INDEX IF NOT EXISTS LOOP_EXECUTION_TABLE_PARENT ON LoopExecution(ParentIteration);
CREATE INDEX IF NOT EXISTS LOOP_EXECUTION_TABLE_LOOP ON LoopExecution(Loop);
