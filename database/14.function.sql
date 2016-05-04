INSERT INTO Function SELECT
  Id,
	Name,
  Prototype,
  File,
  Line,
  (SELECT SUM(c.Duration) FROM Call c WHERE c.Function = t.Id) AS Duration
FROM FunctionOld t;
DROP TABLE FunctionOld;

CREATE INDEX IF NOT EXISTS FUNCTION_TABLE_ID ON Function(Id);
CREATE INDEX IF NOT EXISTS FUNCTION_TABLE_FILE ON Function(File);
