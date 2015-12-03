DROP TABLE IF EXISTS CallGroupReference;
CREATE TABLE "CallGroupReference"
(
    CallGroup INT NOT NULL,
    Reference INT NOT NULL,
    Read INT NOT NULL,
    Write INT NOT NULL,
    FOREIGN KEY(CallGroup) REFERENCES CallGroup(Id),
    FOREIGN KEY(Reference) REFERENCES Reference(Id)
);

INSERT INTO CallGroupReference SELECT
  c.CallGroup AS CallGroup,
  cr.Reference AS Reference,
  SUM(cr.Read) AS Read,
  SUM(cr.Write) AS Write
FROM Call c, CallReference cr WHERE
  cr.Call = c.Id
GROUP BY c.CallGroup, cr.Reference;

CREATE INDEX IF NOT EXISTS CALL_GROUP_REFERENCE_TABLE_CALL_GROUP ON CallGroupReference(CallGroup);
CREATE INDEX IF NOT EXISTS CALL_GROUP_REFERENCE_TABLE_REFERENCE ON CallGroupReference(Reference);
