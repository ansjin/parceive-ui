CREATE INDEX IF NOT EXISTS LOOP_ITERATION_TABLE_ID ON LoopIteration(Id);
CREATE INDEX IF NOT EXISTS LOOP_ITERATION_TABLE_EXECUTION ON LoopIteration(Execution);

ALTER TABLE LoopExecution RENAME TO Temporary;
CREATE TABLE "LoopExecution"(
  Id INT PRIMARY KEY NOT NULL,
  Loop INT NOT NULL,
  ParentIteration INT,
  Duration INT,
  Start INT,
  End INT,
  Call INT,
  IterationsCount INT NOT NULL
);
INSERT INTO LoopExecution SELECT
  Id,
  Loop,
  ParentIteration,
  Start,
  End,
  (t.End - t.Start) AS Duration,
  (SELECT s.Call FROM Segment s, LoopIteration i WHERE s.LoopIteration = i.Id AND i.Execution = t.Id) AS Call,
  (SELECT COUNT(i.Id) FROM LoopIteration i WHERE i.Execution = t.Id ) AS IterationsCount
FROM Temporary t;
DROP TABLE Temporary;

CREATE INDEX IF NOT EXISTS LOOP_TABLE_ID ON Loop(Id);
CREATE INDEX IF NOT EXISTS LOOP_EXECUTION_TABLE_ID ON LoopExecution(Id);

CREATE INDEX IF NOT EXISTS LOOP_EXECUTION_TABLE_CALL ON LoopExecution(Call);
CREATE INDEX IF NOT EXISTS LOOP_EXECUTION_TABLE_PARENT ON LoopExecution(ParentIteration);
CREATE INDEX IF NOT EXISTS LOOP_EXECUTION_TABLE_LOOP ON LoopExecution(Loop);
