DROP TABLE IF EXISTS LoopIterationReference;
CREATE TABLE "LoopIterationReference"
(
    LoopIteration INT NOT NULL,
    Reference INT NOT NULL,
    Read INT NOT NULL,
    Write INT NOT NULL,
    FOREIGN KEY(LoopIteration) REFERENCES LoopIteration(Id),
    FOREIGN KEY(Reference) REFERENCES Reference(Id)
);

INSERT INTO LoopIterationReference SELECT
  s.LoopIteration AS LoopIteration,
  a.Reference AS Reference,
  SUM(CASE WHEN a.Type = 'R' THEN 1 ELSE 0 END) AS Read,
  SUM(CASE WHEN a.Type = 'W' THEN 1 ELSE 0 END) AS Write
FROM Segment s, Instruction i, Access a WHERE
  s.LoopIteration IS NOT NULL AND
  i.Segment = s.Id AND
  a.Instruction = i.Id
GROUP BY s.LoopIteration, a.Reference;

CREATE INDEX IF NOT EXISTS LOOP_ITERATION_REFERENCE_TABLE_LOOP_ITERATION ON LoopIterationReference(LoopIteration);
CREATE INDEX IF NOT EXISTS LOOP_ITERATION_REFERENCE_TABLE_REFERENCE ON LoopIterationReference(Reference);
