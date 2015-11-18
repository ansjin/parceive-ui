DROP TABLE IF EXISTS CallGroup;
CREATE TABLE "CallGroup"(
  Id INT PRIMARY KEY NOT NULL,
  Function INT NOT NULL,
  Caller INT,
  Count INT NOT NULL,
  Parent INT,
  Duration INT NOT NULL
);
INSERT INTO CallGroup SELECT
  ROWID AS Id,
  Function,
  Caller,
  COUNT(*) AS Count,
  NULL AS Parent,
  SUM(End - Start) AS Duration
FROM Call GROUP BY Function, Caller;
