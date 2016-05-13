WITH ThreadTimings AS (
  SELECT thr.TSCPerMillisecond AS TSCPerMillisecond, thr.StartTime AS StartTime FROM Thread thr WHERE thr.Id = t.Thread LIMIT 1
)
INSERT INTO Call (Id, Thread, Function, Instruction, Start, End,
  StartTime, EndTime, Duration, DurationMs, Caller,
  CallerIteration, CallerExecution, CallGroup, CallsOther, LoopCount) SELECT
  Id,
  Thread,
  Function,
  Instruction,
  Start,
  End,
  strftime('%Y-%m-%dT%H:%M:%fZ', (SELECT StartTime FROM ThreadTimings), '+' || CAST ((t.Start / (SELECT TSCPerMillisecond FROM ThreadTimings) / 1000) AS TEXT) || ' seconds'),
  strftime('%Y-%m-%dT%H:%M:%fZ', (SELECT StartTime FROM ThreadTimings), '+' || CAST ((t.End / (SELECT TSCPerMillisecond FROM ThreadTimings) / 1000) AS TEXT) || ' seconds'),
  (End - Start),
  (t.End - t.Start) / (SELECT TSCPerMillisecond FROM ThreadTimings),
  (SELECT Call FROM Segment WHERE Id=(SELECT Segment FROM Instruction WHERE Id=Instruction)) AS Caller,
  (SELECT s.LoopIteration FROM Instruction i, Segment s WHERE Instruction = i.Id AND i.Segment = s.Id) AS CallerIteration,
  NULL AS CallerExecution, -- filled in by UPDATE
  NULL AS CallGroup, -- filled in by UPDATE
  NULL AS CallsOther, -- filled in by UPDATE
  (SELECT COUNT(*) FROM LoopExecution e WHERE e.Call = t.Id) AS LoopCount
FROM CallOld t WHERE End != -1 AND Start != -1;
DROP TABLE CallOld;

UPDATE Call SET CallerExecution = (SELECT i.Execution FROM LoopIteration i WHERE i.Id = CallerIteration);
