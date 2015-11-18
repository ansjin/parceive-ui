ALTER TABLE Call RENAME TO Temporary;
CREATE TABLE "Call"(
    Id INT PRIMARY KEY NOT NULL,
    Thread INT NOT NULL,
    Function INT NOT NULL,
    Instruction INT NOT NULL,
    Start INT,
    End INT,
    Caller INT,
    CallGroup INT,
    CallsOther INT,
    LoopCount INT,
    Duration INT
);
INSERT INTO Call SELECT
  Id,
  Thread,
  Function,
  Instruction,
  Start,
  End,
  (SELECT Call FROM Segment WHERE Id=(SELECT Segment FROM Instruction WHERE Id=Instruction)) AS Caller,
  NULL AS CallGroup, -- filled in by UPDATE
  NULL AS CallsOther, -- filled in by UPDATE
  (SELECT COUNT(*) FROM LoopExecution e WHERE e.Call = Id) AS LoopCount,
  (End - Start)
FROM Temporary WHERE End != -1 AND Start != -1;
DROP TABLE Temporary;
