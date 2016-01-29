ALTER TABLE Function RENAME TO Temporary;
CREATE TABLE "Function" (
	Id	INT NOT NULL,
	Signature	TEXT NOT NULL,
	Type	INT NOT NULL,
	File	INT NOT NULL,
	Line	INT NOT NULL,
  Duration INT
);
INSERT INTO Function SELECT
  Id,
  Signature,
  Type,
  File,
  Line,
  (SELECT SUM(c.Duration) FROM Call c WHERE c.Function = t.Id) AS Duration
FROM Temporary t;
DROP TABLE Temporary;

CREATE INDEX IF NOT EXISTS FUNCTION_TABLE_ID ON Function(Id);
CREATE INDEX IF NOT EXISTS FUNCTION_TABLE_FILE ON Function(File);
