INSERT INTO Call SELECT
  Id,
  Thread,
  Function,
  Instruction,
  Start,
  End,
  (SELECT Call FROM Segment WHERE Id=(SELECT Segment FROM Instruction WHERE Id=Instruction)) AS Caller,
  (SELECT s.LoopIteration FROM Instruction i, Segment s WHERE Instruction = i.Id AND i.Segment = s.Id) AS CallerIteration,
  NULL AS CallerExecution,
  NULL AS CallGroup, -- filled in by UPDATE
  NULL AS CallsOther, -- filled in by UPDATE
  (SELECT COUNT(*) FROM LoopExecution e WHERE e.Call = t.Id) AS LoopCount,
  (End - Start)
FROM CallOld t WHERE End != -1 AND Start != -1;
DROP TABLE CallOld;

UPDATE Call SET CallerExecution = (SELECT i.Execution FROM LoopIteration i WHERE i.Id = CallerIteration);
