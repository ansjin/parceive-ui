DROP TABLE IF EXISTS CallGroup;

CREATE TABLE "CallGroup"(
  Id INT PRIMARY KEY NOT NULL,
  Function INT NOT NULL,
  Caller INT,
  Count INT NOT NULL,
  Parent INT,
  Duration INT NOT NULL,
  Start INT NOT NULL,
  End INT NOT NULL,
  CallerExecution INT
);

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
