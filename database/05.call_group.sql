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
  FOREIGN KEY(Function) REFERENCES Function(Id),
  FOREIGN KEY(Caller) REFERENCES Call(Id),
  FOREIGN KEY(Parent) REFERENCES CallGroup(Id)
);

INSERT INTO CallGroup SELECT
  ROWID AS Id,
  Function,
  Caller,
  COUNT(*) AS Count,
  NULL AS Parent,
  SUM(End - Start) AS Duration,
  MIN(Start) AS Start,
  MAX(End) AS End
FROM Call GROUP BY Function, Caller;
