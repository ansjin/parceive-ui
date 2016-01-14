DROP TABLE IF EXISTS CallReference;
CREATE TABLE "CallReference"
(
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Call INT NOT NULL,
    Reference INT NOT NULL,
    Read INT NOT NULL,
    Write INT NOT NULL,
    FOREIGN KEY(Call) REFERENCES Call(Id),
    FOREIGN KEY(Reference) REFERENCES Reference(Id)
);

INSERT INTO CallReference SELECT
  NULL,
  s.Call AS Call,
  a.Reference AS Reference,
  SUM(CASE WHEN a.Type = 'R' THEN 1 ELSE 0 END) AS Read,
  SUM(CASE WHEN a.Type = 'W' THEN 1 ELSE 0 END) AS Write
FROM Segment s, Instruction i, Access a WHERE
  i.Segment = s.Id AND
  a.Instruction = i.Id
GROUP BY s.Call, a.Reference;

CREATE INDEX IF NOT EXISTS CALL_REFERENCE_TABLE_ID ON CallReference(Id);
CREATE INDEX IF NOT EXISTS CALL_REFERENCE_TABLE_CALL ON CallReference(Call);
CREATE INDEX IF NOT EXISTS CALL_REFERENCE_TABLE_REFERENCE ON CallReference(Reference);
