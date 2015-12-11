DROP TABLE IF EXISTS LoopExecutionReference;
CREATE TABLE "LoopExecutionReference"
(
    LoopExecution INT NOT NULL,
    Reference INT NOT NULL,
    Read INT NOT NULL,
    Write INT NOT NULL,
    FOREIGN KEY(LoopExecution) REFERENCES LoopExecution(Id),
    FOREIGN KEY(Reference) REFERENCES Reference(Id)
);

INSERT INTO LoopExecutionReference SELECT
  i.Execution AS LoopExecution,
  lir.Reference AS Reference,
  SUM(lir.Read) AS Read,
  SUM(lir.Write) AS Write
FROM LoopIteration i, LoopIterationReference lir WHERE
  lir.LoopIteration = i.Id
  GROUP BY i.Execution, lir.Reference;

CREATE INDEX IF NOT EXISTS LOOP_EXECUTION_REFERENCE_TABLE_LOOP_EXECUTION ON LoopExecutionReference(LoopExecution);
CREATE INDEX IF NOT EXISTS LOOP_EXECUTION_REFERENCE_TABLE_REFERENCE ON LoopExecutionReference(Reference);
