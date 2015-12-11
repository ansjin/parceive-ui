DROP TABLE IF EXISTS CallReference;
CREATE TABLE "CallReference"
(
    Call INT NOT NULL,
    Reference INT NOT NULL,
    Read INT NOT NULL,
    Write INT NOT NULL,
    FOREIGN KEY(Call) REFERENCES Call(Id),
    FOREIGN KEY(Reference) REFERENCES Reference(Id)
);

INSERT INTO CallReference SELECT
  s.Call AS Call,
  a.Reference AS Reference,
  SUM(CASE WHEN a.Type = 'R' THEN 1 ELSE 0 END) AS Read,
  SUM(CASE WHEN a.Type = 'W' THEN 1 ELSE 0 END) AS Write
FROM Segment s, Instruction i, Access a WHERE
  i.Segment = s.Id AND
  a.Instruction = i.Id
GROUP BY s.Call, a.Reference;

CREATE INDEX IF NOT EXISTS CALL_REFERENCE_TABLE_CALL ON CallReference(Call);
CREATE INDEX IF NOT EXISTS CALL_REFERENCE_TABLE_REFERENCE ON CallReference(Reference);
